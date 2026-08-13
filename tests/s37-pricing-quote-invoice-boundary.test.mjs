import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

test("GET /api/v1/system/pricing-invoice-boundary returns a read-only boundary projection", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/pricing-invoice-boundary", headers: {} },
      "/api/v1/system/pricing-invoice-boundary",
      context,
      { correlationId: "test_pricing_invoice_boundary" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const report = result.body.data;
    assert.equal(report.pricingReady, false);
    assert.equal(report.invoiceReady, false);
    assert.equal(report.billingReady, false);
    assert.equal(report.paymentReady, false);
    assert.equal(report.tenantBillingReady, false);
    assert.equal(report.productionFinancialOperationsReady, false);
    assert.equal(report.taxReady, false);
    assert.equal(report.complianceReady, false);
    assert.equal(report.claim, "not_claimed");

    assert.ok(report.pricingBoundary);
    assert.ok(Array.isArray(report.quoteCandidates));
    assert.ok(report.quoteCandidates.length > 0);
    assert.ok(report.quoteToInvoiceFlow);
    assert.ok(Array.isArray(report.invoiceCandidates));
    assert.ok(report.invoiceCandidates.length > 0);
    assert.ok(report.invoiceArtifactBoundary);
    assert.ok(Array.isArray(report.readinessGates));
    assert.ok(report.readinessGates.length > 0);
    assert.ok(Array.isArray(report.deferredScope));
    assert.ok(report.deferredScope.length > 0);
    assert.ok(Array.isArray(report.sourceEvidence));
    assert.ok(report.sourceEvidence.length > 0);
    assert.ok(report.claimDiscipline);

    assert.equal(report.pricingBoundary.pricingBoundaryStatus, "candidate");
    assert.equal(report.pricingBoundary.pricingAuthority, "candidate_source");
    assert.equal(report.quoteCandidates[0].amountState, "missing_amount");
    assert.equal(report.quoteCandidates[0].currencyState, "missing_currency");
    assert.equal(report.invoiceCandidates[0].artifactState, "draft_candidate");
    assert.equal(report.invoiceArtifactBoundary.legalTaxInvoiceReadiness, "not claimed");
    assert.equal(report.invoiceArtifactBoundary.complianceReadiness, "not claimed");

    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
    assert.equal(serialized.includes("password"), false);
  } finally {
    await context.close();
  }
});

for (const method of ["POST", "PATCH", "DELETE"]) {
  test(`${method} /api/v1/system/pricing-invoice-boundary is method-not-allowed`, async () => {
    const context = createControlPlaneContext();
    try {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/pricing-invoice-boundary", headers: {} },
        "/api/v1/system/pricing-invoice-boundary",
        context,
        { correlationId: `test_pricing_invoice_boundary_${method.toLowerCase()}` },
      );

      assert.equal(result.status, 405);
      assert.equal(result.body.success, false);
    } finally {
      await context.close();
    }
  });
}
