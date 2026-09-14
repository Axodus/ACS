import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import * as api from "../dist/native-core/index.js";
import { PostgresSharedAuthoritativeState } from "../dist/control-plane/shared-state/postgres-shared-state.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");

async function isolated(run) {
  const schema = "e17i05s2_" + Date.now() + "_" + process.pid;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL);
  url.searchParams.set("options", "-c search_path=" + schema);
  const state = new PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString() });
  try {
    await admin.query('CREATE SCHEMA "' + schema + '"');
    assert.equal(await state.migrate(), 12);
    await pool.query("INSERT INTO acs_tenants (tenant_id,revision,payload) VALUES ('tenant-a',1,'{}'::jsonb),('tenant-b',1,'{}'::jsonb)");
    await run(state, pool);
  } finally {
    await state.close().catch(() => undefined);
    await pool.end().catch(() => undefined);
    await admin.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await admin.end();
  }
}

const revisionRef = (entity_kind, entity_id) => ({ entity_kind, entity_id, revision: 1, fingerprint: hash(entity_kind + ":" + entity_id) });

function revision(number, predecessor, targetMode = "PINNED") {
  return api.createAutomationRevisionV1({
    automation_id: "automation-a",
    tenant_id: "tenant-a",
    revision: number,
    ...(predecessor ? { predecessor_ref: predecessor } : {}),
    purpose: "governed test Automation",
    target_mode: targetMode,
    ...(targetMode === "PINNED"
      ? { pinned_target: { target_ref: revisionRef("workflow", "workflow-a") } }
      : { resolution_policy: { policy_ref: revisionRef("target_resolution_policy", "policy-a"), selector: "workflow-by-policy", parameters: { environment: "test" } } }),
    definitions: [{ kind: "trigger", definition_key: "manual", configuration: { kind: "manual" }, governed_refs: [] }],
    external_refs: {
      agent_refs: [revisionRef("agent", "agent-a")],
      workforce_refs: [revisionRef("workforce", "workforce-a")],
      workflow_refs: [revisionRef("workflow", "workflow-a")],
      resource_refs: [revisionRef("resource", "resource-a")],
      executor_refs: [{ kind: "executor", id: "adapter-a" }],
    },
    delegation_requirement_refs: [],
    governing_refs: [{ kind: "policy", id: "policy-a" }],
    authored_configuration: { marker: "revision-" + number, target_mode: targetMode },
    authored_by: "governance",
    authored_at: number,
    change_reason: "test",
    provenance_refs: [{ kind: "document", id: "REQ-08" }],
  });
}

function head(revision, overrides = {}) {
  return api.validateAutomationHeadV1({
    schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
    automation_id: revision.ref.automation_id,
    tenant_id: revision.ref.tenant_id,
    current_revision: revision.ref.revision,
    current_fingerprint: revision.ref.fingerprint,
    lifecycle: "draft",
    lifecycle_sequence: 1,
    created_at: 1,
    updated_at: revision.authored_at,
    ...overrides,
  });
}

function rootFact(revision) {
  return api.validateAutomationLifecycleEventV1({
    schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
    lifecycle_event_id: "automation-a-draft",
    automation_ref: revision.ref,
    sequence: 1,
    to_lifecycle: "draft",
    transitioned_by: "governance",
    transitioned_at: 1,
    reason: "created",
    governing_authority_refs: [],
    approval_refs: [],
    provenance_refs: [],
  });
}

function event(id, sequence, type, revision) {
  return api.createEventEnvelopeV2({
    event_id: id,
    event_type: type,
    timestamp: sequence,
    sequence,
    organization_id: "org",
    product_domain: "acs",
    tenant_id: "tenant-a",
    subject_type: "automation",
    subject_id: "automation-a",
    actor: { kind: "service", ref: "test" },
    source: "acs",
    correlation_id: id,
    idempotency_key: id,
    payload: { automation_id: "automation-a", revision: revision.ref.revision, fingerprint: revision.ref.fingerprint },
  });
}

function evidence(id, eventId) {
  return api.createEvidenceRecordV2({
    evidence_id: "evidence-" + id,
    kind: "governance",
    subject_ref: { kind: "automation", id: "automation-a" },
    event_ref: { kind: "event", id: eventId },
    source: "acs",
    classification: "internal",
    payload_digest: hash(id),
    created_at: 1,
    provenance: { safe: true },
  });
}

function revisionCommand(revisionValue, commandId, expectedHead, expectedFingerprint, initialLifecycleEvent) {
  return {
    head: head(revisionValue),
    revision: revisionValue,
    ...(initialLifecycleEvent ? { initialLifecycleEvent } : {}),
    expectedHead,
    ...(expectedFingerprint ? { expectedFingerprint } : {}),
    idempotency: { scope: "automation:tenant-a:automation-a", key: commandId, request_hash: hash(commandId) },
    event: event(commandId, revisionValue.ref.revision, revisionValue.ref.revision === 1 ? "automation.created" : "automation.revised", revisionValue),
    evidence: evidence(commandId, commandId),
    outboxId: "outbox-" + commandId,
  };
}

test("Slice 2 PostgreSQL persists Automation identity, immutable history, CAS, lifecycle, idempotency, and atomic evidence/outbox", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolated(async (state, pool) => {
    const first = revision(1);
    const created = await state.nativeCore.advanceAutomationRevision(revisionCommand(first, "automation-created", 0, undefined, rootFact(first)));
    assert.equal(created.lineage.revisions.length, 1);
    assert.equal(created.lineage.lifecycleEvents.length, 1);
    assert.equal(created.lineage.head.lifecycle, "draft");
    assert.equal(created.lineage.revisions[0].target_mode, "PINNED");
    assert.equal(created.evidence.evidence_id, "evidence-automation-created");
    assert.equal(created.outbox.eventId, "automation-created");
    const identity = api.createActivationCausalIdentityV1({
      tenant_id: "tenant-a",
      automation_ref: first.ref,
      source: { kind: "manual", actor_ref: { kind: "actor", id: "cto" }, idempotency_key: "activation-create", requested_at: 10, purpose: "durable acceptance" },
    });
    const observed = api.validateActivationStateEventV1({
      schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
      activation_state_event_id: "activation-observed",
      activation_id: identity.activation_id,
      tenant_id: "tenant-a",
      sequence: 1,
      to_state: "observed",
      cause_digest: hash("activation-cause"),
      observed_automation_lifecycle: "draft",
      occurred_at: 10,
      provenance_refs: [],
    });
    const activationEvent = api.createEventEnvelopeV2({
      event_id: "activation-created", event_type: "activation.created", timestamp: 10, sequence: 1,
      organization_id: "org", product_domain: "acs", tenant_id: "tenant-a", subject_type: "activation", subject_id: identity.activation_id,
      actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "activation-created", idempotency_key: "activation-create", payload: { activation_id: identity.activation_id },
    });
    const activation = await state.nativeCore.createActivation({
      identity, initialStateEvent: observed,
      idempotency: { scope: `activation.create:tenant-a:automation-a:1:actor:cto`, key: "activation-create", request_hash: hash("activation-create") },
      event: activationEvent, outboxId: "outbox-activation-created",
    });
    assert.equal(activation.head.identity.automation_ref.fingerprint, first.ref.fingerprint);
    assert.equal((await state.nativeCore.createActivation({
      identity, initialStateEvent: observed,
      idempotency: { scope: `activation.create:tenant-a:automation-a:1:actor:cto`, key: "activation-replay", request_hash: hash("activation-replay") },
      event: { ...activationEvent, event_id: "activation-replay", correlation_id: "activation-replay", idempotency_key: "activation-replay" }, outboxId: "outbox-activation-replay",
    })).head.identity.activation_id, identity.activation_id);
    await assert.rejects(() => pool.query("UPDATE acs_activation_state_events SET payload='{}'::jsonb WHERE activation_state_event_id='activation-observed'"));
    const watermark = { schedule_watermark_id: "watermark-a", tenant_id: "tenant-a", automation_ref: first.ref, schedule_key: "daily", schedule_digest: hash("daily"), time_basis: { timezone: "UTC" }, covered_through: 10, recovery_generation: 1, state_fingerprint: hash("watermark-1"), updated_at: 10 };
    assert.equal((await state.nativeCore.saveScheduleRecoveryWatermark({ watermark, expectedGeneration: 0, idempotency: { scope: "activation.schedule.recover:tenant-a:automation-a:1:daily", key: "watermark-1", request_hash: hash("watermark-1") } })).recovery_generation, 1);
  });
});
