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
    assert.equal(await state.migrate(), 11);
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
    assert.equal(created.outbox.event_id, "automation-created");
    assert.deepEqual((await state.nativeCore.advanceAutomationRevision(revisionCommand(first, "automation-created", 0, undefined, rootFact(first)))).lineage, created.lineage);

    await assert.rejects(
      () => state.nativeCore.advanceAutomationRevision({
        ...revisionCommand(first, "automation-created", 0, undefined, rootFact(first)),
        idempotency: { scope: "automation:tenant-a:automation-a", key: "automation-created", request_hash: hash("different-payload") },
      }),
      api.NativeIdempotencyConflictError,
    );

    const second = revision(2, first.ref, "RESOLVED_AT_ACTIVATION");
    const secondHead = api.assertAutomationHeadAdvanceV1(created.lineage.head, second, { current_revision: 1, current_fingerprint: first.ref.fingerprint });
    const revised = await state.nativeCore.advanceAutomationRevision({
      ...revisionCommand(second, "automation-revised", 1, first.ref.fingerprint),
      head: secondHead,
    });
    assert.equal(revised.lineage.revisions.length, 2);
    assert.equal(revised.lineage.revisions[0].pinned_target.target_ref.entity_id, "workflow-a");
    assert.equal(revised.lineage.revisions[1].target_mode, "RESOLVED_AT_ACTIVATION");
    assert.equal(revised.lineage.revisions[1].resolution_policy.selector, "workflow-by-policy");

    const third = revision(3, second.ref);
    await assert.rejects(
      () => state.nativeCore.advanceAutomationRevision({
        ...revisionCommand(third, "automation-stale", 1, first.ref.fingerprint),
        head: api.assertAutomationHeadAdvanceV1(revised.lineage.head, third, { current_revision: 2, current_fingerprint: second.ref.fingerprint }),
      }),
      api.RevisionConflictError,
    );

    await assert.rejects(
      () => state.nativeCore.advanceAutomationRevision({
        ...revisionCommand(first, "cross-tenant", 0, undefined, rootFact(first)),
        head: { ...head(first), tenant_id: "tenant-b" },
        revision: { ...first, ref: { ...first.ref, tenant_id: "tenant-b" } },
        idempotency: { scope: "automation:tenant-b:automation-a", key: "cross-tenant", request_hash: hash("cross-tenant") },
        event: { ...event("cross-tenant", 1, "automation.created", first), tenant_id: "tenant-b" },
      }),
      api.NativeAutomationIntegrityError,
    );

    const enabledFact = api.createAutomationLifecycleEventV1({
      lifecycle_event_id: "automation-a-enabled",
      head: revised.lineage.head,
      revision: second,
      to_lifecycle: "enabled",
      transitioned_by: "governance",
      transitioned_at: 3,
      reason: "enable",
      governing_authority_refs: [],
      approval_refs: [],
      provenance_refs: [],
    });
    const enabledHead = api.applyAutomationLifecycleEventV1(revised.lineage.head, enabledFact);
    const enabled = await state.nativeCore.transitionAutomationLifecycle({
      head: enabledHead,
      eventFact: enabledFact,
      expectedSequence: 1,
      idempotency: { scope: "automation.lifecycle:tenant-a:automation-a", key: "automation-enabled", request_hash: hash("automation-enabled") },
      event: event("automation-enabled", 3, "automation.enabled", second),
      outboxId: "outbox-automation-enabled",
    });
    assert.equal(enabled.lineage.head.lifecycle, "enabled");
    assert.equal(enabled.lineage.lifecycleEvents.length, 2);

    const disabledFact = api.createAutomationLifecycleEventV1({
      lifecycle_event_id: "automation-a-disabled-rollback",
      head: enabled.lineage.head,
      revision: second,
      to_lifecycle: "disabled",
      transitioned_by: "governance",
      transitioned_at: 4,
      reason: "atomic rollback proof",
      governing_authority_refs: [],
      approval_refs: [],
      provenance_refs: [],
    });
    const disabledHead = api.applyAutomationLifecycleEventV1(enabled.lineage.head, disabledFact);
    const before = await pool.query("SELECT (SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_evidence)::int AS evidence,(SELECT count(*) FROM acs_native_outbox)::int AS outbox,(SELECT count(*) FROM acs_automation_lifecycle_events)::int AS lifecycle");
    await assert.rejects(() => state.nativeCore.transitionAutomationLifecycle({
      head: disabledHead,
      eventFact: disabledFact,
      expectedSequence: 2,
      idempotency: { scope: "automation.lifecycle:tenant-a:automation-a", key: "automation-atomic", request_hash: hash("automation-atomic") },
      event: event("automation-atomic", 4, "automation.disabled", second),
      outboxId: "outbox-automation-created",
    }));
    const after = await pool.query("SELECT (SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_evidence)::int AS evidence,(SELECT count(*) FROM acs_native_outbox)::int AS outbox,(SELECT count(*) FROM acs_automation_lifecycle_events)::int AS lifecycle");
    assert.deepEqual(after.rows[0], before.rows[0]);

    const archivedFact = api.createAutomationLifecycleEventV1({
      lifecycle_event_id: "automation-a-archived",
      head: enabled.lineage.head,
      revision: second,
      to_lifecycle: "archived",
      transitioned_by: "governance",
      transitioned_at: 5,
      reason: "archive",
      governing_authority_refs: [],
      approval_refs: [],
      provenance_refs: [],
    });
    const archivedHead = api.applyAutomationLifecycleEventV1(enabled.lineage.head, archivedFact);
    const archived = await state.nativeCore.transitionAutomationLifecycle({
      head: archivedHead,
      eventFact: archivedFact,
      expectedSequence: 2,
      idempotency: { scope: "automation.lifecycle:tenant-a:automation-a", key: "automation-archived", request_hash: hash("automation-archived") },
      event: event("automation-archived", 5, "automation.archived", second),
      outboxId: "outbox-automation-archived",
    });
    assert.equal(archived.lineage.head.lifecycle, "archived");
    assert.equal(archived.lineage.revisions.length, 2);

    const archivedSuccessor = revision(3, second.ref);
    const archivedSuccessorHead = api.validateAutomationHeadV1({
      ...archived.lineage.head,
      current_revision: archivedSuccessor.ref.revision,
      current_fingerprint: archivedSuccessor.ref.fingerprint,
      updated_at: 6,
    });
    await assert.rejects(
      () => state.nativeCore.advanceAutomationRevision({
        ...revisionCommand(archivedSuccessor, "automation-after-archive", 2, second.ref.fingerprint),
        head: archivedSuccessorHead,
      }),
      api.NativeAutomationIntegrityError,
    );

    await assert.rejects(() => pool.query("UPDATE acs_automation_revisions SET payload = '{}'::jsonb WHERE automation_id='automation-a' AND revision=1"));
    await assert.rejects(() => pool.query("UPDATE acs_automation_lifecycle_events SET payload = '{}'::jsonb WHERE lifecycle_event_id='automation-a-archived'"));

  });
});
