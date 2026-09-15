import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import * as api from "../dist/index.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
async function isolated(run) {
  const schema = `e17i06s5_${Date.now()}_${process.pid}`; const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL }); const url = new URL(process.env.ACS_SH_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`); const state = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString() }); const pool = new Pool({ connectionString: url.toString() });
  try { await admin.query(`CREATE SCHEMA "${schema}"`); assert.equal(await state.migrate(), 12); await pool.query("INSERT INTO acs_tenants (tenant_id,revision,payload) VALUES ('tenant-a',1,'{}'::jsonb)"); await run(state, pool); }
  finally { await state.close().catch(() => undefined); await pool.end().catch(() => undefined); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end(); }
}
async function persistAutomation(state) {
  const revision = api.createAutomationRevisionV1({ automation_id: "automation-s5", tenant_id: "tenant-a", revision: 1, purpose: "external observation", target_mode: "PINNED", pinned_target: { target_ref: { entity_kind: "workflow", entity_id: "workflow-a", revision: 1, fingerprint: hash("workflow-a") } }, definitions: [], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "test", authored_at: 1, change_reason: "test", provenance_refs: [] });
  const head = api.createAutomationHeadV1(revision, 0); const fact = api.validateAutomationLifecycleEventV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, lifecycle_event_id: "automation-s5-draft", automation_ref: revision.ref, sequence: 1, to_lifecycle: "draft", transitioned_by: "test", transitioned_at: 1, reason: "test", governing_authority_refs: [], approval_refs: [], provenance_refs: [] });
  await state.nativeCore.advanceAutomationRevision({ head, revision, initialLifecycleEvent: fact, expectedHead: 0, idempotency: { scope: "automation:tenant-a:automation-s5", key: "automation-s5", request_hash: hash("automation-s5") }, event: api.createEventEnvelopeV2({ event_id: "automation-s5", event_type: "automation.created", timestamp: 1, sequence: 1, organization_id: "org", product_domain: "acs", tenant_id: "tenant-a", subject_type: "automation", subject_id: "automation-s5", actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "automation-s5", idempotency_key: "automation-s5", payload: {} }), outboxId: "outbox-automation-s5" });
  return revision;
}
function observation(automationRef, adapter, provider, delivery) {
  return api.createNormalizedExternalObservationV1({ tenant_id: "tenant-a", automation_ref: automationRef, source_class: "trigger", source: { kind: "event", issuer: "external-trigger", namespace: "customer-order", event_id: "order-99", payload_digest: hash("order-99") }, adapter_ref: { kind: "adapter", id: adapter }, provider_ref: { kind: "provider", id: provider }, external_reference_digest: hash(delivery), occurred_at: 100, evidence_refs: [] });
}

test("S5 PostgreSQL stores one canonical Activation and metadata-safe evidence/outbox for provider-neutral replay", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolated(async (state, pool) => {
    const automation = await persistAutomation(state); const ingress = new api.ExternalObservationActivationIngressV1(state.nativeCore);
    const first = await ingress.ingest({ organizationId: "org", observation: observation(automation.ref, "adapter-a", "provider-a", "delivery-a") });
    const second = await ingress.ingest({ organizationId: "org", observation: observation(automation.ref, "adapter-b", "provider-b", "delivery-b") });
    assert.equal(first.lineage.head.identity.activation_id, second.lineage.head.identity.activation_id);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_activations")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_activation_state_events WHERE to_state='observed'")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_events WHERE subject_type='activation'")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_evidence WHERE subject_id=$1", [first.lineage.head.identity.activation_id])).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_outbox WHERE event_id LIKE 'activation-created:%'")).rows[0].count, 1);
    const payload = (await pool.query("SELECT payload::text AS payload FROM acs_native_events WHERE subject_id=$1", [first.lineage.head.identity.activation_id])).rows[0].payload;
    assert.doesNotMatch(payload, /delivery-a|delivery-b|credential|secret/i);
  });
});
