import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

test("GET /api/v1/system/settlement-reconciliation returns a read-only evidence boundary", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/settlement-reconciliation", headers: {} },
      "/api/v1/system/settlement-reconciliation",
      context,
      { correlationId: "test_settlement_reconciliation" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const report = result.body.data;
    for (const key of [
      "receiptReady",
      "legalTaxReceiptReady",
      "settlementReady",
      "reconciliationReady",
      "accountingIntegrationReady",
      "billingReady",
      "paymentReady",
      "invoiceReady",
      "tenantBillingReady",
      "productionFinancialOperationsReady",
      "taxReady",
      "complianceReady",
    ]) {
      assert.equal(report[key], false, key + " must remain false");
    }
    assert.equal(report.claim, "not_claimed");

    assert.ok(report.operationalReceiptBoundary);
    assert.ok(report.legalTaxReceiptBoundary);
    assert.ok(report.settlementVisibility);
    assert.ok(report.reconciliationEvidence);
    assert.ok(report.providerAccountingDependencies);
    assert.ok(Array.isArray(report.readinessGates));
    assert.ok(report.readinessGates.length > 0);
    assert.ok(Array.isArray(report.deferredScope));
    assert.ok(report.deferredScope.length > 0);
    assert.ok(Array.isArray(report.sourceEvidence));
    assert.ok(report.sourceEvidence.length > 0);
    assert.ok(report.claimDiscipline);

    assert.equal(report.operationalReceiptBoundary.artifactState, "operational_evidence");
    assert.equal(report.legalTaxReceiptBoundary.taxLegalReceipt, "not claimed");
    assert.equal(report.settlementVisibility.settlementState, "provider_not_integrated");
    assert.equal(report.reconciliationEvidence.matchingState, "missing_accounting_source");
    assert.equal(report.providerAccountingDependencies.state, "blocked");

    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
    assert.equal(serialized.includes("password"), false);
    assert.equal(serialized.includes("\"amount\":"), false);
    assert.equal(serialized.includes("\"currency\":"), false);
    assert.equal(serialized.includes("\"settledAt\":"), false);
  } finally {
    await context.close();
  }
});

for (const method of ["POST", "PATCH", "DELETE"]) {
  test(method + " /api/v1/system/settlement-reconciliation is method-not-allowed", async () => {
    const context = createControlPlaneContext();
    try {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/settlement-reconciliation", headers: {} },
        "/api/v1/system/settlement-reconciliation",
        context,
        { correlationId: "test_settlement_reconciliation_" + method.toLowerCase() },
      );

      assert.equal(result.status, 405);
      assert.equal(result.body.success, false);
    } finally {
      await context.close();
    }
  });
}
