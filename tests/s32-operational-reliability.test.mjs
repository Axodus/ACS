import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const EXPECTED_OPERATION_TYPES = [
  "agent_lifecycle",
  "composition_validation",
  "readiness_check",
  "deployment_plan",
  "deploy",
  "runtime_start",
  "runtime_stop",
  "execution_run",
  "worker_assignment",
  "worker_recovery",
  "evidence_collection",
  "economic_reservation",
];

const EXPECTED_DISTRIBUTED_SCENARIOS = [
  "single-agent-single-worker",
  "multiple-agents-single-worker",
  "single-agent-multiple-workers",
  "multiple-agents-multiple-workers",
  "runtime-unavailable",
  "worker-unavailable",
  "worker-stale",
  "operation-failed",
  "operation-recovering",
  "external-target-unavailable",
];

async function getOperationalReliabilityReport() {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/operational-reliability", headers: {} },
      "/api/v1/system/operational-reliability",
      context,
      { correlationId: "test_operational_reliability" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    return result.body.data;
  } finally {
    await context.close();
  }
}

test("GET /api/v1/system/operational-reliability returns an honest reliability projection", async () => {
  const report = await getOperationalReliabilityReport();

  assert.equal(typeof report.checkedAt, "string");
  assert.equal(report.operationalReliabilityReady, false);
  assert.equal(report.productionReady, false);
  assert.equal(report.claim, "not_claimed");
  assert.ok(Array.isArray(report.operationStateModel));
  assert.ok(Array.isArray(report.longRunningOperations));
  assert.ok(Array.isArray(report.operationResults));
  assert.ok(Array.isArray(report.runtimeConfidence));
  assert.ok(Array.isArray(report.workerConfidence));
  assert.ok(Array.isArray(report.recoverySemantics));
  assert.ok(Array.isArray(report.blockers));
  assert.ok(Array.isArray(report.warnings));
  assert.ok(Array.isArray(report.caveats));
  assert.ok(Array.isArray(report.deferredItems));
  assert.ok(report.readinessGateDependencies.includes("G06"));
  assert.ok(report.readinessGateDependencies.includes("G07"));
  assert.ok(report.readinessGateDependencies.includes("G08"));
  assert.ok(report.readinessGateDependencies.includes("G09"));
  assert.ok(report.readinessGateDependencies.includes("G13"));
  assert.equal(report.claimDiscipline.productionReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.operationalReliabilityReadyClaimAllowed, false);
  assert.ok(report.claimDiscipline.reason.length > 0);
  assert.ok(report.sourceEvidence.length > 0);
});

test("operational reliability covers the required operation state model", async () => {
  const report = await getOperationalReliabilityReport();
  const types = report.operationStateModel.map((entry) => entry.type);

  assert.deepEqual(types, EXPECTED_OPERATION_TYPES);
  for (const entry of report.operationStateModel) {
    assert.ok(entry.reason.length > 0);
  }
});

test("runtime and worker confidence report unavailable states without inventing evidence", async () => {
  const report = await getOperationalReliabilityReport();

  for (const item of report.runtimeConfidence) {
    assert.ok(item.state.length > 0);
    assert.ok(item.sourceOfObservation.length > 0);
    assert.ok(item.caveats.length > 0);
  }
  for (const item of report.workerConfidence) {
    assert.ok(item.state.length > 0);
    assert.ok(item.unsupportedOperations.length > 0);
  }
  for (const scenario of report.distributedOperations.scenarios) {
    assert.ok(scenario.reason.length > 0);
    assert.ok(scenario.evidence.length > 0);
  }
  assert.deepEqual(
    report.distributedOperations.scenarios.map((scenario) => scenario.id),
    EXPECTED_DISTRIBUTED_SCENARIOS,
  );
});

test("recovery semantics and deferred scope are explicit", async () => {
  const report = await getOperationalReliabilityReport();
  const semantics = report.recoverySemantics.map((entry) => entry.id);

  assert.ok(semantics.includes("retry"));
  assert.ok(semantics.includes("cancellation"));
  assert.ok(semantics.includes("recovery"));
  assert.ok(semantics.includes("stale-detection"));
  assert.ok(semantics.includes("evidence-linkage"));
  for (const entry of report.recoverySemantics) {
    assert.ok(entry.reason.length > 0);
    assert.ok(entry.evidence.length > 0);
  }
  assert.ok(report.deferredItems.some((entry) => /autoscal/i.test(entry.message)));
  assert.ok(report.deferredItems.some((entry) => /fleet management/i.test(entry.message)));
  assert.ok(report.deferredItems.some((entry) => /orchestration/i.test(entry.message)));
});

test("operational reliability JSON does not leak raw secret markers", async () => {
  const report = await getOperationalReliabilityReport();
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("Bearer "), false);
  assert.equal(serialized.includes("password"), false);
});

test("operational reliability endpoint rejects unsupported methods", async () => {
  const context = createControlPlaneContext();
  try {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/operational-reliability", headers: {} },
        "/api/v1/system/operational-reliability",
        context,
        { correlationId: `test_operational_reliability_${method}` },
      );
      assert.equal(result.status, 405);
      assert.equal(result.body.error.code, "method_not_allowed");
    }
  } finally {
    await context.close();
  }
});
