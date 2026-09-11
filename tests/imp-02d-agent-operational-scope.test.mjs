import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return { identity: this.identity, status: "ready", supportedProtocols: ["acs-protocol"], operations: ["health"] };
    },
    async listExecutionTargets() {
      return [];
    },
    async close() {},
  };
}

async function get(context, path, correlationId) {
  return routeProductApiRequest({ method: "GET", url: path, headers: {} }, path, context, { correlationId });
}

test("IMP-02D verified Agent-scoped routes exclude foreign Agent records", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  const agentA = "agent-imp-02d-a";
  const agentB = "agent-imp-02d-b";
  try {
    const runA = context.runtimeService.createExecutionRun({ runtimeInstanceId: "runtime-imp-02d-a", agentId: agentA, executionPlanId: "plan-imp-02d-a" });
    const runB = context.runtimeService.createExecutionRun({ runtimeInstanceId: "runtime-imp-02d-b", agentId: agentB, executionPlanId: "plan-imp-02d-b" });
    context.auditService.recordEvent({ eventType: "execution.completed", agentId: agentA, executionRunId: runA.runId, result: "success", decision: "passed", metadata: { message: "Agent A completed" } });
    context.auditService.recordEvent({ eventType: "execution.completed", agentId: agentB, executionRunId: runB.runId, result: "success", decision: "passed", metadata: { message: "Agent B completed" } });
    context.economicService.recordUsage({ recordId: "usage-imp-02d-a", runId: runA.runId, accountId: "account-imp-02d", tenantId: "tenant-dev", workloadId: "workload-dev", dimension: "compute", quantity: 3n, unit: "ms", source: "worker", observedAt: 100 });
    context.economicService.recordUsage({ recordId: "usage-imp-02d-b", runId: runB.runId, accountId: "account-imp-02d", tenantId: "tenant-dev", workloadId: "workload-dev", dimension: "compute", quantity: 5n, unit: "ms", source: "worker", observedAt: 200 });

    const [runs, evidence, usage] = await Promise.all([
      get(context, `/api/v1/agents/${agentA}/execution-runs`, "imp-02d-runs"),
      get(context, `/api/v1/agents/${agentA}/evidence`, "imp-02d-evidence"),
      get(context, `/api/v1/economics/usage?agentId=${agentA}&limit=50`, "imp-02d-usage"),
    ]);

    assert.equal(runs.status, 200);
    assert.deepEqual(runs.body.data.map((run) => run.agentId), [agentA]);

    assert.equal(evidence.status, 200);
    assert.ok(evidence.body.data.length > 0);
    assert.ok(evidence.body.data.every((record) => record.entityRefs.some((reference) => reference.type === "agent" && reference.id === agentA)));
    assert.ok(evidence.body.data.every((record) => !record.summary.includes("Agent B")));

    assert.equal(usage.status, 200);
    assert.deepEqual(usage.body.data.map((record) => record.agentId), [agentA]);
    assert.deepEqual(usage.body.data.map((record) => record.executionRunId), [runA.runId]);
  } finally {
    await context.close();
  }
});
