import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const PAGE_SIZE = 50;

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

function createAgent(context, agentId) {
  context.agentService.create({
    definition: {
      agentId,
      name: `IMP-02D1 ${agentId}`,
      status: "draft",
      capabilityIds: [],
      skillIds: [],
      toolIds: [],
      credentialConnectionIds: [],
      runnerPreferences: [],
    },
    createdAt: Date.now(),
  });
}

async function get(context, path, correlationId) {
  return routeProductApiRequest({ method: "GET", url: path, headers: {} }, path, context, { correlationId });
}

function assertDescending(records, compare) {
  for (let index = 1; index < records.length; index += 1) {
    assert.ok(compare(records[index - 1], records[index]) <= 0, `records at ${index - 1} and ${index} are not in canonical descending order`);
  }
}

function compareRuns(left, right) {
  if (left.startedAt !== right.startedAt) return right.startedAt - left.startedAt;
  return right.runId.localeCompare(left.runId);
}

function compareEvidence(left, right) {
  if (left.createdAt !== right.createdAt) return right.createdAt - left.createdAt;
  return right.evidenceId.localeCompare(left.evidenceId);
}

async function createRuns(context, agentId, count) {
  const runs = [];
  for (let index = 0; index < count; index += 1) {
    runs.push(context.runtimeService.createExecutionRun({
      runtimeInstanceId: `runtime-${agentId}-${index}`,
      agentId,
      executionPlanId: `plan-${agentId}-${index}`,
    }));
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  return runs;
}

test("IMP-02D1 bounds and scopes Agent Runs, Evidence, generic Evidence filtering, and economics summaries", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  const agentA = "agent-imp-02d1-a";
  const agentB = "agent-imp-02d1-b";
  const agentC = "agent-imp-02d1-c";

  try {
    createAgent(context, agentA);
    createAgent(context, agentB);
    createAgent(context, agentC);

    const runsA = await createRuns(context, agentA, PAGE_SIZE + 5);
    const runsB = await createRuns(context, agentB, 3);

    context.economicService.recordUsage({
      recordId: "usage-imp-02d1-a",
      runId: runsA[0].runId,
      accountId: "account-imp-02d1",
      tenantId: "tenant-dev",
      workloadId: "workload-dev",
      dimension: "compute",
      quantity: 10n,
      unit: "ms",
      source: "worker",
      observedAt: 100,
    });
    context.economicService.recordUsage({
      recordId: "usage-imp-02d1-b",
      runId: runsB[0].runId,
      accountId: "account-imp-02d1",
      tenantId: "tenant-dev",
      workloadId: "workload-dev",
      dimension: "compute",
      quantity: 90n,
      unit: "ms",
      source: "worker",
      observedAt: 200,
    });

    const [runsFirstPage, runsSecondPage, emptyRuns, missingRuns] = await Promise.all([
      get(context, `/api/v1/agents/${agentA}/execution-runs`, "imp-02d1-runs-first"),
      get(context, `/api/v1/agents/${agentA}/execution-runs?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}`, "imp-02d1-runs-second"),
      get(context, `/api/v1/agents/${agentC}/execution-runs`, "imp-02d1-runs-empty"),
      get(context, "/api/v1/agents/agent-imp-02d1-missing/execution-runs", "imp-02d1-runs-missing"),
    ]);

    assert.equal(runsFirstPage.status, 200);
    assert.equal(runsFirstPage.body.data.length, PAGE_SIZE);
    assert.ok(runsFirstPage.body.data.every((run) => run.agentId === agentA));
    assertDescending(runsFirstPage.body.data, compareRuns);

    assert.equal(runsSecondPage.status, 200);
    assert.equal(runsSecondPage.body.data.length, 5);
    assert.ok(runsSecondPage.body.data.every((run) => run.agentId === agentA));
    assertDescending(runsSecondPage.body.data, compareRuns);

    const allRuns = [...runsFirstPage.body.data, ...runsSecondPage.body.data];
    assert.equal(new Set(allRuns.map((run) => run.runId)).size, PAGE_SIZE + 5);
    assert.deepEqual(new Set(allRuns.map((run) => run.runId)), new Set(runsA.map((run) => run.runId)));
    assert.equal(emptyRuns.status, 200);
    assert.deepEqual(emptyRuns.body.data, []);
    assert.equal(missingRuns.status, 404);

    for (const path of [
      `/api/v1/agents/${agentA}/execution-runs?limit=0`,
      `/api/v1/agents/${agentA}/execution-runs?limit=101`,
      `/api/v1/agents/${agentA}/execution-runs?offset=-1`,
      `/api/v1/agents/${agentA}/execution-runs?agentId=${agentB}`,
    ]) {
      const invalid = await get(context, path, `imp-02d1-invalid-runs-${path}`);
      assert.equal(invalid.status, 400);
    }

    const [evidenceFirstPage, evidenceSecondPage, genericEvidence, emptyEvidence, missingEvidence] = await Promise.all([
      get(context, `/api/v1/agents/${agentA}/evidence`, "imp-02d1-evidence-first"),
      get(context, `/api/v1/agents/${agentA}/evidence?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}`, "imp-02d1-evidence-second"),
      get(context, `/api/v1/evidence?agentId=${agentA}&limit=100`, "imp-02d1-evidence-generic-agent"),
      get(context, `/api/v1/agents/${agentC}/evidence`, "imp-02d1-evidence-empty"),
      get(context, "/api/v1/agents/agent-imp-02d1-missing/evidence", "imp-02d1-evidence-missing"),
    ]);

    assert.equal(evidenceFirstPage.status, 200);
    assert.equal(evidenceFirstPage.body.data.length, PAGE_SIZE);
    assert.ok(evidenceFirstPage.body.data.every((record) => record.entityRefs.some((ref) => ref.type === "agent" && ref.id === agentA)));
    assert.ok(evidenceFirstPage.body.data.every((record) => record.source === "execution-run"));
    assertDescending(evidenceFirstPage.body.data, compareEvidence);

    assert.equal(evidenceSecondPage.status, 200);
    assert.equal(evidenceSecondPage.body.data.length, 5);
    assert.ok(evidenceSecondPage.body.data.every((record) => record.entityRefs.some((ref) => ref.type === "agent" && ref.id === agentA)));
    assertDescending(evidenceSecondPage.body.data, compareEvidence);

    const allEvidence = [...evidenceFirstPage.body.data, ...evidenceSecondPage.body.data];
    assert.equal(new Set(allEvidence.map((record) => record.evidenceId)).size, PAGE_SIZE + 5);
    assert.ok(genericEvidence.body.data.every((record) => record.entityRefs.some((ref) => ref.type === "agent" && ref.id === agentA)));
    assert.equal(genericEvidence.body.data.length, PAGE_SIZE + 5);
    assert.equal(emptyEvidence.status, 200);
    assert.deepEqual(emptyEvidence.body.data, []);
    assert.equal(missingEvidence.status, 404);

    for (const path of [
      `/api/v1/agents/${agentA}/evidence?limit=0`,
      `/api/v1/agents/${agentA}/evidence?limit=101`,
      `/api/v1/agents/${agentA}/evidence?offset=-1`,
      `/api/v1/agents/${agentA}/evidence?agentId=${agentB}`,
    ]) {
      const invalid = await get(context, path, `imp-02d1-invalid-evidence-${path}`);
      assert.equal(invalid.status, 400);
    }

    const [economicsA, economicsSummaryA, economicsC, usageA] = await Promise.all([
      get(context, `/api/v1/agents/${agentA}/economics`, "imp-02d1-economics-a"),
      get(context, `/api/v1/economics/summary?agentId=${agentA}`, "imp-02d1-economics-summary-a"),
      get(context, `/api/v1/agents/${agentC}/economics`, "imp-02d1-economics-c"),
      get(context, `/api/v1/economics/usage?agentId=${agentA}&limit=50`, "imp-02d1-usage-a"),
    ]);

    assert.equal(economicsA.status, 200);
    assert.deepEqual(economicsA.body.data.agentConsumption.map((entry) => entry.agentId), [agentA]);
    assert.ok(economicsA.body.data.executionRunConsumption.every((entry) => entry.agentId === agentA));
    assert.equal(economicsA.body.data.executionRunConsumption.length, PAGE_SIZE + 5);
    assert.equal(economicsA.body.data.totalEstimated, "0");
    assert.equal(economicsA.body.data.totalMetered, "0");
    assert.equal(economicsA.body.data.totalSettled, "0");

    assert.equal(economicsSummaryA.status, 200);
    assert.deepEqual(economicsSummaryA.body.data.agentConsumption.map((entry) => entry.agentId), [agentA]);
    assert.ok(economicsSummaryA.body.data.executionRunConsumption.every((entry) => entry.agentId === agentA));

    assert.equal(economicsC.status, 200);
    assert.deepEqual(economicsC.body.data.agentConsumption.map((entry) => entry.agentId), [agentC]);
    assert.deepEqual(economicsC.body.data.executionRunConsumption, []);
    assert.equal(economicsC.body.data.totalEstimated, "0");
    assert.equal(economicsC.body.data.totalMetered, "0");
    assert.equal(economicsC.body.data.totalSettled, "0");

    assert.equal(usageA.status, 200);
    assert.deepEqual(usageA.body.data.map((record) => record.agentId), [agentA]);
    assert.deepEqual(usageA.body.data.map((record) => record.executionRunId), [runsA[0].runId]);
  } finally {
    await context.close();
  }
});
