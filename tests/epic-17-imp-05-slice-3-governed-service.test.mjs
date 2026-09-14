import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => api.sha256Hex(api.stableStringify(value));
const ref = (kind, id) => ({ entity_kind: kind, entity_id: id, revision: 1, fingerprint: "a".repeat(64) });

function revision(number = 1, predecessor) {
  return api.createAutomationRevisionV1({
    automation_id: "automation-a", tenant_id: "tenant-a", revision: number,
    ...(predecessor ? { predecessor_ref: predecessor } : {}),
    purpose: "test", target_mode: "PINNED", pinned_target: { target_ref: ref("workflow", "workflow-a") },
    definitions: [], external_refs: { agent_refs: [ref("agent", "agent-a")], workforce_refs: [], workflow_refs: [ref("workflow", "workflow-a")], resource_refs: [], executor_refs: [] },
    delegation_requirement_refs: [], governing_refs: [], authored_configuration: { revision: number },
    authored_by: "governance", authored_at: number, change_reason: "test", provenance_refs: [],
  });
}

function event(id, type, revisionValue, lifecycle) {
  return api.createEventEnvelopeV2({
    event_id: id, event_type: type, timestamp: 1, sequence: 1, organization_id: "org", product_domain: "acs",
    tenant_id: "tenant-a", subject_type: "automation", subject_id: "automation-a", actor: { kind: "service", ref: "test" },
    source: "acs", correlation_id: id, idempotency_key: id,
    payload: { automation_id: "automation-a", revision: revisionValue.ref.revision, fingerprint: revisionValue.ref.fingerprint, ...(lifecycle ? { lifecycle } : {}) },
  });
}

test("Slice 3 governs create, revision CAS and non-executing lifecycle commands", async () => {
  const first = revision();
  const head = api.createAutomationHeadV1(first, 1);
  const calls = [];
  let lineage;
  const store = {
    async advanceAutomationRevision(command) {
      calls.push(command);
      lineage = { head: command.head, revisions: lineage ? [...lineage.revisions, command.revision] : [command.revision], lifecycleEvents: lineage ? lineage.lifecycleEvents : [command.initialLifecycleEvent] };
      return { lineage, event: { event: command.event }, evidence: command.evidence, outbox: { event_id: command.event.event_id } };
    },
    async transitionAutomationLifecycle(command) {
      calls.push(command);
      lineage = { ...lineage, head: command.head, lifecycleEvents: [...lineage.lifecycleEvents, command.eventFact] };
      return { lineage, event: { event: command.event }, evidence: command.evidence, outbox: { event_id: command.event.event_id } };
    },
    async getAutomationLineage() { if (!lineage) throw new Error("not found"); return lineage; },
  };
  const service = new api.GovernedAutomationService(store);
  const created = await service.create({
    revision: first, lifecycleEventId: "draft", createdAt: 1, createdBy: "governance", reason: "create", governingAuthorityRefs: [], approvalRefs: [], provenanceRefs: [],
    idempotency: { scope: "automation:tenant-a:automation-a", key: "create", request_hash: hash({ action: "create", revision: first.ref }) },
    event: event("create", "automation.created", first), evidenceId: "e-create",
  });
  assert.equal(created.lineage.head.lifecycle, "draft");
  assert.equal(calls[0].event.run_id, undefined);

  const second = revision(2, first.ref);
  await service.revise({
    revision: second, expectedRef: first.ref, evidenceId: "e-revise",
    idempotency: { scope: "automation:tenant-a:automation-a", key: "revise", request_hash: hash({ action: "revise", expected: first.ref, revision: second.ref }) },
    event: event("revise", "automation.revised", second),
  });
  const enabled = await service.transition({
    automationId: "automation-a", tenantId: "tenant-a", toLifecycle: "enabled", lifecycleEventId: "enabled", transitionedBy: "governance", transitionedAt: 3, reason: "enable", governingAuthorityRefs: [], approvalRefs: [], provenanceRefs: [], evidenceId: "e-enabled",
    idempotency: { scope: "automation.lifecycle:tenant-a:automation-a", key: "enabled", request_hash: hash({ action: "lifecycle", revision: second.ref, from: "draft", to: "enabled" }) },
    event: event("enabled", "automation.enabled", second, "enabled"),
  });
  assert.equal(enabled.lineage.head.lifecycle, "enabled");
  assert.equal(calls.length, 3);
  await assert.rejects(() => service.transition({
    automationId: "automation-a", tenantId: "tenant-a", toLifecycle: "archived", lifecycleEventId: "bad", transitionedBy: "governance", transitionedAt: 4, reason: "bad", governingAuthorityRefs: [], approvalRefs: [], provenanceRefs: [], evidenceId: "e-bad",
    idempotency: { scope: "automation.lifecycle:tenant-a:automation-a", key: "bad", request_hash: "0".repeat(64) },
    event: event("bad", "automation.archived", second, "archived"),
  }), api.GovernedAutomationServiceError);
});
