import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

test("GET /api/v1/system/billing-boundary returns a read-only boundary projection", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/billing-boundary", headers: {} },
      "/api/v1/system/billing-boundary",
      context,
      { correlationId: "test_billing_boundary" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const report = result.body.data;
    assert.equal(report.billingReady, false);
    assert.equal(report.paymentReady, false);
    assert.equal(report.invoiceReady, false);
    assert.equal(report.tenantBillingReady, false);
    assert.equal(report.productionFinancialOperationsReady, false);
    assert.equal(report.claim, "not_claimed");

    assert.ok(report.financialTruth);
    assert.ok(report.billingBoundary);
    assert.ok(Array.isArray(report.billableEventCandidates));
    assert.ok(report.billableEventCandidates.length > 0);
    assert.ok(Array.isArray(report.readinessGates));
    assert.ok(report.readinessGates.length > 0);
    assert.ok(Array.isArray(report.deferredScope));
    assert.ok(report.deferredScope.length > 0);
    assert.ok(Array.isArray(report.sourceEvidence));
    assert.ok(report.sourceEvidence.length > 0);
    assert.ok(report.claimDiscipline);

    assert.equal(report.financialTruth.authorityLevel, "candidate_source");
    assert.equal(report.financialTruth.state, "not_started");
    assert.equal(report.billingBoundary.billingBoundaryStatus, "candidate");
    assert.equal(report.billingBoundary.noClaimPosture, "evidence-bounded only");
    assert.equal(report.billableEventCandidates[0].state, "candidate");

    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
    assert.equal(serialized.includes("password"), false);
  } finally {
    await context.close();
  }
});

for (const method of ["POST", "PATCH", "DELETE"]) {
  test(`${method} /api/v1/system/billing-boundary is method-not-allowed`, async () => {
    const context = createControlPlaneContext();
    try {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/billing-boundary", headers: {} },
        "/api/v1/system/billing-boundary",
        context,
        { correlationId: `test_billing_boundary_${method.toLowerCase()}` },
      );

      assert.equal(result.status, 405);
      assert.equal(result.body.success, false);
    } finally {
      await context.close();
    }
  });
}
