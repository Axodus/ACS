import assert from "node:assert/strict";
import test from "node:test";
import { ProductApiClient } from "../dist/control-plane/product-api-client.js";
import { validateNativeAgentLineageCommand } from "../dist/control-plane/shared-state/native-core-durable.js";
import { createEventEnvelopeV2 } from "../dist/native-core/runtime.js";
import { AgentLifecycleGuardError } from "../dist/control-plane/agent-service.js";

function definition(agentId = "agent-17") {
  return {
    agentId,
    name: "Canonical Agent",
    status: "draft",
    roleId: "role:operator",
    capabilityIds: ["capability:reason"],
    skillIds: ["skill:core"],
    toolIds: ["tool:read"],
    credentialConnectionIds: [],
    runnerPreferences: ["executor:default"],
    executionPolicyId: "policy:execute",
  };
}

function fakeNativeCore() {
  const lineages = new Map();
  const idempotency = new Map();
  const events = [];
  return {
    lineages,
    events,
    async listAgentDefinitions({ tenantId } = {}) {
      return [...lineages.values()].filter((lineage) => !tenantId || lineage.definition.scope.tenant_id === tenantId).map((lineage) => lineage.definition);
    },
    async getAgentLineage(agentId) {
      const lineage = lineages.get(agentId);
      if (!lineage) throw new Error("not found");
      return lineage;
    },
    async advanceAgentLineage(command) {
      validateNativeAgentLineageCommand(command);
      const prior = idempotency.get(`${command.idempotency.scope}:${command.idempotency.key}`);
      if (prior) return prior;
      const revisions = [...(lineages.get(command.definition.agent_id)?.revisions ?? []), command.revision];
      const result = {
        lineage: { definition: command.definition, revisions },
        event: { streamScope: `agent:${command.definition.agent_id}`, event: command.event },
        outbox: { outboxId: command.outboxId ?? "outbox", eventId: command.event.event_id, deliveryKind: command.deliveryKind ?? "agent", status: "pending", availableAt: command.event.timestamp, attemptCount: 0, createdAt: command.event.timestamp },
      };
      lineages.set(command.definition.agent_id, result.lineage);
      events.push(command.event);
      idempotency.set(`${command.idempotency.scope}:${command.idempotency.key}`, result);
      return result;
    },
  };
}

test("IMP-01 Product API mutations use one Native command seam and preserve CAS/idempotency", async () => {
  const nativeCore = fakeNativeCore();
  const legacy = { create() { throw new Error("legacy write invoked"); }, update() { throw new Error("legacy write invoked"); } };
  const api = new ProductApiClient({ nativeCore, nativeAgentTenantId: "tenant-17", agentService: legacy });

  const created = await api.createAgent({ definition: definition(), createdBy: "cto", idempotencyKey: "imp-01-create" });
  assert.equal(created.ok, true);
  assert.equal(nativeCore.events.length, 1);
  assert.equal(nativeCore.events[0].event_type, "agent.created");

  const repeated = await api.createAgent({ definition: definition(), createdBy: "cto", idempotencyKey: "imp-01-create" });
  assert.equal(repeated.ok, true);
  assert.equal(nativeCore.events.length, 1);

  const updated = await api.updateAgent("agent-17", { definition: { ...definition(), status: "active", name: "Canonical Agent v2" }, expectedRevision: 1, updatedBy: "cto", idempotencyKey: "imp-01-update" });
  assert.equal(updated.status, "active");
  assert.equal(nativeCore.lineages.get("agent-17").revisions.length, 2);
  assert.equal(nativeCore.events[1].payload.agent_revision, 2);

  await assert.rejects(() => api.updateAgent("agent-17", { definition: definition(), expectedRevision: 1 }), AgentLifecycleGuardError);
  await assert.rejects(() => api.deleteAgent("agent-17"), AgentLifecycleGuardError);
});

test("IMP-01 Native read projection exposes lifecycle history without Profile capability authority", async () => {
  const nativeCore = fakeNativeCore();
  const api = new ProductApiClient({ nativeCore, nativeAgentTenantId: "tenant-17" });
  await api.createAgent({ definition: { ...definition(), profileId: "profile:legacy", profileRevision: 3 } });
  const detail = await api.getAgent("agent-17");
  assert.equal(detail.currentRevision.revision, 1);
  assert.deepEqual(detail.agentDefinition.capabilityIds, ["capability:reason"]);
  assert.equal(detail.agentDefinition.profileId, undefined);
  assert.equal(detail.availableActions.find((action) => action.action === "update").available, true);
  assert.equal(detail.availableActions.find((action) => action.action === "delete").available, false);
});
