import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const workflow = (id) => ({ entity_kind: "workflow", entity_id: id, revision: 1, fingerprint: hash(id) });
const definition = (policy = "CATCH_UP", bound = 3, timezone = "UTC", version = "1") => api.createScheduleDefinitionV1({
  definition_key: "daily",
  specification: { kind: "test-slots", version, normalized: { source: "fixture" }, digest: hash(`test-slots:${version}`) },
  time_basis: { timezone, timezone_rules_version: "tzdb-fixture-1", ambiguous_local_time: "REJECT", nonexistent_local_time: "REJECT" },
  missed_work: { policy, max_occurrences_per_recovery: bound, max_lookback_ms: 10_000 },
});

function fixture(policy = "CATCH_UP", bound = 3, timezone = "UTC", version = "1") {
  const schedule = definition(policy, bound, timezone, version);
  const revision = api.createAutomationRevisionV1({ automation_id: "automation-s4", tenant_id: "tenant-a", revision: 1, purpose: "schedule", target_mode: "PINNED", pinned_target: { target_ref: workflow("workflow-s4") }, definitions: [{ kind: "schedule", definition_key: "daily", configuration: { ...schedule }, governed_refs: [] }], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "test", authored_at: 1, change_reason: "test", provenance_refs: [] });
  const watermarks = new Map(); const activations = new Map(); let failSave = false; let admissionCalls = 0; let runCalls = 0;
  const core = {
    async getAutomationLineage() { return { head: { ...api.createAutomationHeadV1(revision, 0), lifecycle: "enabled" }, revisions: [revision], lifecycleEvents: [] }; },
    async getScheduleRecoveryWatermark(input) { return watermarks.get(`${input.tenantId}:${input.scheduleKey}`); },
    async createActivation(input) { const existing = activations.get(input.identity.activation_id); if (existing) return existing; const lineage = { head: api.createActivationHeadV1(input.identity, input.initialStateEvent), stateEvents: [input.initialStateEvent], attempts: [] }; activations.set(input.identity.activation_id, lineage); return lineage; },
    async saveScheduleRecoveryWatermark(input) { if (failSave) throw new Error("INJECTED_WATERMARK_FAILURE"); const key = `${input.watermark.tenant_id}:${input.watermark.schedule_key}`; const existing = watermarks.get(key); assert.equal(input.expectedGeneration, existing?.recovery_generation ?? 0); watermarks.set(key, input.watermark); return input.watermark; },
    async admitWorkforceRun() { admissionCalls += 1; }, async createRun() { runCalls += 1; },
  };
  const registry = new api.ScheduleSpecificationRegistryV1([{ kind: "test-slots", version: "1", evaluate: ({ fromExclusive, through }) => [100, 200, 300].filter((slot) => slot > fromExclusive && slot <= through) }]);
  return { schedule, revision, watermarks, activations, core, registry, setFailSave: (value) => { failSave = value; }, counts: () => ({ admissionCalls, runCalls }) };
}

test("S4 schedule recovery derives deterministic occurrences, applies policy, and delegates only canonical Activation creation", async (t) => {
  await t.test("same slot and restart preserve occurrence and Activation identity", async () => {
    const state = fixture(); const service = new api.ScheduleRecoveryServiceV1(state.core, state.registry);
    const first = await service.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: state.revision.ref, scheduleKey: "daily", through: 300, at: 301 });
    assert.equal(first.occurrences.length, 3); assert.equal(first.activations.length, 3);
    assert.equal(first.occurrences[0].occurrence_id, api.createScheduleOccurrenceV1({ tenant_id: "tenant-a", automation_ref: state.revision.ref, schedule_key: "daily", schedule_digest: state.schedule.semantic_digest, timezone: "UTC", kind: "SLOT", slot_at: 100 }).occurrence_id);
    const restart = await service.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: state.revision.ref, scheduleKey: "daily", through: 400, at: 401 });
    assert.equal(restart.occurrences.length, 0); assert.equal(state.activations.size, 3); assert.deepEqual(state.counts(), { admissionCalls: 0, runCalls: 0 });
  });
  await t.test("unknown format/version and invalid timezone fail closed", async () => {
    const unsupported = fixture("CATCH_UP", 3, "UTC", "2");
    await assert.rejects(() => new api.ScheduleRecoveryServiceV1(unsupported.core, unsupported.registry).reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: unsupported.revision.ref, scheduleKey: "daily", through: 300, at: 301 }), (error) => error.code === "SCHEDULE_FORMAT_UNAVAILABLE");
    assert.throws(() => definition("CATCH_UP", 3, "Not/A-Timezone"), (error) => error.code === "SCHEDULE_EVALUATION_INVALID");
    assert.equal(definition("CATCH_UP", 3, "Etc/UTC").time_basis.timezone, "UTC");
  });
  await t.test("SKIP, COALESCE and bounded CATCH_UP are deterministic", async () => {
    const skip = fixture("SKIP"); const skipResult = await new api.ScheduleRecoveryServiceV1(skip.core, skip.registry).reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: skip.revision.ref, scheduleKey: "daily", through: 300, at: 301 });
    assert.equal(skipResult.occurrences.length, 0); assert.equal(skipResult.watermark.time_basis.policy, "SKIP");
    const coalesce = fixture("COALESCE"); const coalesced = await new api.ScheduleRecoveryServiceV1(coalesce.core, coalesce.registry).reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: coalesce.revision.ref, scheduleKey: "daily", through: 300, at: 301 });
    assert.equal(coalesced.occurrences.length, 1); assert.equal(coalesced.occurrences[0].kind, "COALESCED_INTERVAL");
    const bounded = fixture("CATCH_UP", 2);
    await assert.rejects(() => new api.ScheduleRecoveryServiceV1(bounded.core, bounded.registry).reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: bounded.revision.ref, scheduleKey: "daily", through: 300, at: 301 }), (error) => error.code === "SCHEDULE_RECOVERY_BOUND_INVALID");
  });
  await t.test("crash before watermark leaves no lost logical occurrence and retry does not duplicate it", async () => {
    const state = fixture(); const service = new api.ScheduleRecoveryServiceV1(state.core, state.registry); state.setFailSave(true);
    await assert.rejects(() => service.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: state.revision.ref, scheduleKey: "daily", through: 300, at: 301 }), /INJECTED_WATERMARK_FAILURE/);
    assert.equal(state.watermarks.size, 0); assert.equal(state.activations.size, 3);
    state.setFailSave(false); const retried = await service.reconcile({ tenantId: "tenant-a", organizationId: "org", automationRef: state.revision.ref, scheduleKey: "daily", through: 300, at: 302 });
    assert.equal(retried.activations.length, 3); assert.equal(state.activations.size, 3); assert.equal(state.watermarks.size, 1);
  });
  await t.test("Tenant mismatch fails before persistence", async () => {
    const state = fixture(); const service = new api.ScheduleRecoveryServiceV1(state.core, state.registry);
    await assert.rejects(() => service.reconcile({ tenantId: "tenant-b", organizationId: "org", automationRef: state.revision.ref, scheduleKey: "daily", through: 300, at: 301 }), /Tenant must match/);
    assert.equal(state.activations.size, 0);
  });
});
