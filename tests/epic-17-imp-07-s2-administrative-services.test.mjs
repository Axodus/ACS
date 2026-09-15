import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => api.sha256Hex(api.stableStringify(value));
const ref = (entity_kind, entity_id, revision = 1) => ({ entity_kind, entity_id, revision, fingerprint: hash({ entity_kind, entity_id, revision }) });

function automation(revision = 1, predecessor_ref) {
  return api.createAutomationRevisionV1({ automation_id: "automation-a", tenant_id: "tenant-a", revision, ...(predecessor_ref ? { predecessor_ref } : {}), purpose: "administrative", target_mode: "PINNED", pinned_target: { target_ref: ref("workflow", "workflow-a") }, definitions: [], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: { internal_secret: "do-not-expose" }, authored_by: "test", authored_at: revision, change_reason: "test", provenance_refs: [] });
}

function automationLineage() {
  const first = automation(); const second = automation(2, first.ref);
  return { head: api.createAutomationHeadV1(second, 2), revisions: [first, second], lifecycleEvents: [] };
}

function activationLineage() {
  const automationRef = automation().ref;
  const identity = api.createActivationCausalIdentityV1({ tenant_id: "tenant-a", automation_ref: automationRef, source: { kind: "system", system_id: "system-a", occurrence_key: "occurrence-a", purpose: "administrative" } });
  const observed = api.validateActivationStateEventV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, activation_state_event_id: "activation-observed", activation_id: identity.activation_id, tenant_id: "tenant-a", sequence: 1, to_state: "observed", cause_digest: hash("cause-a"), observed_automation_lifecycle: "enabled", occurred_at: 3, provenance_refs: [] });
  return { head: api.createActivationHeadV1(identity, observed), stateEvents: [observed], attempts: [] };
}

function queryStore() {
  const automationValue = automationLineage(); const activationValue = activationLineage(); const calls = { automation: 0, activation: 0 };
  return { calls, automationValue, activationValue, store: {
    async listAutomationHeads({ tenantId }) { return tenantId === "tenant-a" ? [automationValue.head] : []; },
    async getAutomationLineage() { calls.automation++; return automationValue; },
    async listDelegationGrantHeads() { return []; },
    async getDelegationGrantLineage() { throw new Error("not found"); },
    async getActivationLineage() { calls.activation++; return activationValue; },
  } };
}

test("S2 queries distinguish CURRENT, EXACT, and OBSERVED without exposing internal data", async () => {
  const fixture = queryStore(); const service = new api.AdministrativeQueryService(fixture.store);
  const current = await service.getAutomation("tenant-a", api.createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a" }));
  const exact = await service.getAutomation("tenant-a", api.createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 1, fingerprint: fixture.automationValue.revisions[0].ref.fingerprint }));
  const observed = await service.getActivation("tenant-a", api.createAdministrativeObservationRefV1({ resource_kind: "activation", stable_id: fixture.activationValue.head.identity.activation_id, tenant_id: "tenant-a", observation_digest: fixture.activationValue.stateEvents[0].cause_digest }));
  assert.equal(current.metadata.source.addressing, "CURRENT"); assert.equal(exact.metadata.source.addressing, "EXACT"); assert.equal(exact.metadata.source.revision, 1); assert.equal(observed.metadata.source.addressing, "OBSERVED");
  assert.equal(JSON.stringify(current).includes("internal_secret"), false);
  await assert.rejects(() => service.getAutomation("tenant-a", api.createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 1, fingerprint: hash("wrong") })), (error) => error instanceof api.AdministrativeQueryError && error.code === "FINGERPRINT_MISMATCH");
  await assert.rejects(() => service.getActivation("tenant-a", api.createAdministrativeObservationRefV1({ resource_kind: "activation", stable_id: fixture.activationValue.head.identity.activation_id, tenant_id: "tenant-a", observation_digest: hash("wrong") })), (error) => error instanceof api.AdministrativeQueryError && error.code === "OBSERVATION_MISMATCH");
});

test("S2 fails closed before querying a foreign Tenant", async () => {
  const fixture = queryStore(); const service = new api.AdministrativeQueryService(fixture.store);
  await assert.rejects(() => service.getAutomation("tenant-a", api.createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-b" })), (error) => error instanceof api.AdministrativeQueryError && error.code === "TENANT_MISMATCH");
  assert.equal(fixture.calls.automation, 0);
});

test("S2 automation commands delegate once to the canonical owner and preserve owner failures", async () => {
  const lineage = automationLineage(); const calls = []; const owner = {
    async create(command) { calls.push(["create", command]); return { lineage }; },
    async revise(command) { calls.push(["revise", command]); if (command.expectedRef.revision !== 1) throw new api.RevisionConflictError("automation:automation-a", 1, 2); return { lineage }; },
    async transition(command) { calls.push(["transition", command]); if (command.toLifecycle === "disabled") throw new api.GovernedAutomationServiceError("invalid lifecycle"); return { lineage: { ...lineage, head: { ...lineage.head, lifecycle: "enabled" } } }; },
  };
  const service = new api.AdministrativeAutomationCommandService(owner);
  const revision = lineage.revisions[1];
  const command = { revision, expectedRef: lineage.revisions[0].ref, idempotency: { key: "same", scope: "automation:tenant-a:automation-a", request_hash: hash("same") }, event: {}, evidenceId: "e" };
  const first = await service.revise("tenant-a", command); const retry = await service.revise("tenant-a", command);
  assert.equal(first.metadata.source.addressing, "EXACT"); assert.deepEqual(retry, first); assert.equal(calls.filter(([kind]) => kind === "revise").length, 2);
  await assert.rejects(() => service.revise("tenant-a", { ...command, expectedRef: { ...command.expectedRef, revision: 0 } }), api.RevisionConflictError);
  await assert.rejects(() => service.transition("tenant-a", { automationId: "automation-a", tenantId: "tenant-a", toLifecycle: "disabled" }), api.GovernedAutomationServiceError);
  await assert.rejects(() => service.transition("tenant-a", { automationId: "automation-a", tenantId: "tenant-b", toLifecycle: "enabled" }), (error) => error instanceof api.AdministrativeQueryError && error.code === "TENANT_MISMATCH");
});
