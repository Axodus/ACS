import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import * as api from "../dist/index.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
async function isolated(run) {
  const schema = `e17i06s4_${Date.now()}_${process.pid}`; const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL }); const url = new URL(process.env.ACS_SH_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`); const state = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString() }); const pool = new Pool({ connectionString: url.toString() });
  try { await admin.query(`CREATE SCHEMA "${schema}"`); assert.equal(await state.migrate(), 12); await pool.query("INSERT INTO acs_tenants (tenant_id,revision,payload) VALUES ('tenant-a',1,'{}'::jsonb)"); await run(state, pool); }
  finally { await state.close().catch(() => undefined); await pool.end().catch(() => undefined); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end(); }
}
function revision() {
  const schedule = api.createScheduleDefinitionV1({ definition_key: "daily", specification: { kind: "pg-slots", version: "1", normalized: { fixture: true }, digest: hash("pg-slots") }, time_basis: { timezone: "UTC", timezone_rules_version: "tzdb-test", ambiguous_local_time: "REJECT", nonexistent_local_time: "REJECT" }, missed_work: { policy: "CATCH_UP", max_occurrences_per_recovery: 3, max_lookback_ms: 10_000 } });
  return api.createAutomationRevisionV1({ automation_id: "automation-s4", tenant_id: "tenant-a", revision: 1, purpose: "schedule", target_mode: "PINNED", pinned_target: { target_ref: { entity_kind: "workflow", entity_id: "workflow-a", revision: 1, fingerprint: hash("workflow-a") } }, definitions: [{ kind: "schedule", definition_key: "daily", configuration: { ...schedule }, governed_refs: [] }], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "test", authored_at: 1, change_reason: "test", provenance_refs: [] });
}
async function persistAutomation(state, value) {
  const head = api.createAutomationHeadV1(value, 0); const fact = api.validateAutomationLifecycleEventV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, lifecycle_event_id: "automation-s4-draft", automation_ref: value.ref, sequence: 1, to_lifecycle: "draft", transitioned_by: "test", transitioned_at: 1, reason: "test", governing_authority_refs: [], approval_refs: [], provenance_refs: [] });
  await state.nativeCore.advanceAutomationRevision({ head, revision: value, initialLifecycleEvent: fact, expectedHead: 0, idempotency: { scope: "automation:tenant-a:automation-s4", key: "automation-s4", request_hash: hash("automation-s4") }, event: api.createEventEnvelopeV2({ event_id: "automation-s4", event_type: "automation.created", timestamp: 1, sequence: 1, organization_id: "org", product_domain: "acs", tenant_id: "tenant-a", subject_type: "automation", subject_id: "automation-s4", actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "automation-s4", idempotency_key: "automation-s4", payload: {} }), outboxId: "outbox-automation-s4" });
}

test("S4 PostgreSQL recovers logical schedule occurrences without duplicate Activations after a crash before watermark commit", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolated(async (state, pool) => {
    const automation = revision(); await persistAutomation(state, automation);
    const registry = new api.ScheduleSpecificationRegistryV1([{ kind: "pg-slots", version: "1", evaluate: ({ fromExclusive, through }) => [100, 200, 300].filter((slot) => slot > fromExclusive && slot <= through) }]);
    let failSave = true;
    const core = Object.create(state.nativeCore);
    core.saveScheduleRecoveryWatermark = async (input) => { if (failSave) throw new Error("INJECTED_CRASH_BEFORE_WATERMARK"); return state.nativeCore.saveScheduleRecoveryWatermark(input); };
    const recovery = new api.ScheduleRecoveryServiceV1(core, registry);
    await assert.rejects(() => recovery.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: automation.ref, scheduleKey: "daily", through: 300, at: 301 }), /INJECTED_CRASH_BEFORE_WATERMARK/);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_activations")).rows[0].count, 3);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_schedule_recovery_watermarks")).rows[0].count, 0);
    failSave = false;
    const result = await recovery.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: automation.ref, scheduleKey: "daily", through: 300, at: 302 });
    assert.equal(result.occurrences.length, 3); assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_activations")).rows[0].count, 3);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_activation_state_events WHERE to_state='observed'")).rows[0].count, 3);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_schedule_recovery_watermarks WHERE covered_through=to_timestamp(300/1000.0)")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_events WHERE subject_type='activation'")).rows[0].count, 3);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_outbox WHERE event_id LIKE 'activation-created:%'")).rows[0].count, 3);
  });
});
