import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const EXPECTED_PERMISSIONS = [
  "read_control_plane",
  "read_agents",
  "mutate_agents",
  "read_composition",
  "read_execution",
  "mutate_execution",
  "read_evidence",
  "read_economics",
  "read_system",
  "mutate_system",
  "admin_boundary",
  "tenant_boundary",
  "secret_boundary",
];

async function getGovernanceReport() {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/governance-boundary", headers: {} },
      "/api/v1/system/governance-boundary",
      context,
      { correlationId: "test_governance_boundary" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    return result.body.data;
  } finally {
    await context.close();
  }
}

test("GET /api/v1/system/governance-boundary returns an honest governance projection", async () => {
  const report = await getGovernanceReport();

  assert.equal(report.claim, "not_claimed");
  assert.equal(typeof report.checkedAt, "string");
  assert.equal(report.actorBoundary.productionAuthClaimed, false);
  assert.ok(["authenticated", "unauthenticated", "system", "local_operator", "simulated", "unknown"].includes(report.actorBoundary.state));
  assert.ok(Array.isArray(report.permissionBaseline));
  assert.deepEqual(report.permissionBaseline.map((item) => item.category), EXPECTED_PERMISSIONS);
  assert.ok(Array.isArray(report.readMutateAuthority));
  assert.ok(report.readMutateAuthority.length >= 13);
  assert.equal(report.tenantBoundary.tenantAdminReady, false);
  assert.ok(["single_tenant", "tenant_aware", "multi_tenant_observed", "tenant_admin_unavailable", "unknown"].includes(report.tenantBoundary.state));
  assert.equal(report.administrationBoundary.administrationReady, false);
  assert.ok(report.administrationBoundary.allowedActions.length > 0);
  assert.ok(report.administrationBoundary.deniedActions.length > 0);
  assert.ok(report.administrationBoundary.unsupportedActions.length > 0);
  assert.ok(Array.isArray(report.accessDecisions));
  assert.ok(report.accessDecisions.length > 0);
  assert.ok(report.deniedStates.every((entry) => entry.reason.length > 0));
  assert.ok(report.unsupportedActions.every((entry) => entry.reason.length > 0));
  assert.ok(["available", "partial", "planned", "unavailable"].includes(report.auditCorrelation.state));
  assert.ok(report.readinessGateDependencies.includes("G04"));
  assert.ok(report.readinessGateDependencies.includes("G05"));
  assert.ok(report.readinessGateDependencies.includes("G11"));
  assert.equal(report.claimDiscipline.productionReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.billingReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.administrationReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.tenantGovernanceReadyClaimAllowed, false);
  assert.ok(report.caveats.length > 0);
  assert.ok(report.deferredItems.length > 0);
  assert.ok(report.sourceEvidence.length > 0);
});

test("governance boundary keeps tenant administration unsupported with a reason", async () => {
  const report = await getGovernanceReport();
  const tenantAdmin = report.unsupportedActions.find((entry) => entry.id === "access.tenants.admin");

  assert.ok(tenantAdmin);
  assert.equal(tenantAdmin.decision, "unsupported");
  assert.match(tenantAdmin.reason, /tenant administration is not in EPIC-12 scope/);
  assert.equal(report.administrationBoundary.administrationReady, false);
  assert.equal(report.tenantBoundary.tenantAdminReady, false);
});

test("governance boundary JSON does not leak raw secret markers", async () => {
  const report = await getGovernanceReport();
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("Bearer "), false);
  assert.equal(serialized.includes("password"), false);
});

test("governance boundary endpoint rejects unsupported methods", async () => {
  const context = createControlPlaneContext();
  try {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/governance-boundary", headers: {} },
        "/api/v1/system/governance-boundary",
        context,
        { correlationId: `test_governance_boundary_${method}` },
      );
      assert.equal(result.status, 405);
      assert.equal(result.body.error.code, "method_not_allowed");
    }
  } finally {
    await context.close();
  }
});
