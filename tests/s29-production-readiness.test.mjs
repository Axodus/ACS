import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const EXPECTED_GATES = [
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
];

async function getReadinessReport() {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/production-readiness", headers: {} },
      "/api/v1/system/production-readiness",
      context,
      { correlationId: "test_production_readiness" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    return result.body.data;
  } finally {
    await context.close();
  }
}

test("GET /api/v1/system/production-readiness returns an honest readiness projection", async () => {
  const report = await getReadinessReport();

  assert.equal(report.productionReady, false);
  assert.equal(report.claim, "not_claimed");
  assert.equal(report.status, "blocked");
  assert.equal(typeof report.checkedAt, "string");
  assert.ok(Array.isArray(report.environment.recognized));
  assert.ok(report.environment.recognized.some((entry) => entry.id === report.environment.current));
  assert.ok(Array.isArray(report.gates));
  assert.equal(report.gates.length, 13);
  assert.deepEqual(report.gates.map((gate) => gate.id), EXPECTED_GATES);
  assert.equal(report.summary.totalGates, 13);
  assert.ok(report.blockers.length > 0);
  assert.ok(Array.isArray(report.warnings));
  assert.ok(Array.isArray(report.caveats));
  assert.ok(Array.isArray(report.deferredItems));
  assert.ok(Array.isArray(report.persistenceInventory));
  assert.ok(report.persistenceInventory.some((item) => item.domain === "ExecutionRun"));
  assert.equal(report.secretsBoundary.rawSecretsExposed, false);
  assert.equal(report.claimDiscipline.productionReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.billingReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.administrationReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.tenantGovernanceReadyClaimAllowed, false);
  assert.ok(report.nextMilestoneDependencies.length > 0);
  assert.ok(report.sourceEvidence.length > 0);
});

test("production readiness JSON does not leak raw secret markers", async () => {
  const report = await getReadinessReport();
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("Bearer "), false);
  assert.equal(serialized.includes("password"), false);
});

test("production readiness endpoint rejects unsupported methods", async () => {
  const context = createControlPlaneContext();
  try {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/production-readiness", headers: {} },
        "/api/v1/system/production-readiness",
        context,
        { correlationId: `test_production_readiness_${method}` },
      );
      assert.equal(result.status, 405);
      assert.equal(result.body.error.code, "method_not_allowed");
    }
  } finally {
    await context.close();
  }
});
