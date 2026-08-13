import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

test("GET /api/v1/system/financial-audit returns a read-only audit/compliance/risk boundary", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/financial-audit", headers: {} },
      "/api/v1/system/financial-audit",
      context,
      { correlationId: "test_financial_audit" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    const report = result.body.data;
    for (const key of [
      "financialAuditReady", "complianceReady", "taxReady", "billingReady", "paymentReady",
      "invoiceReady", "tenantBillingReady", "receiptReady", "settlementReady",
      "reconciliationReady", "productionFinancialOperationsReady",
    ]) {
      assert.equal(report[key], false, key + " must remain false");
    }
    assert.equal(report.claim, "not_claimed");
    assert.ok(report.financialAuditTrailBoundary);
    assert.ok(Array.isArray(report.evidenceCorrelationMatrix));
    assert.ok(report.evidenceCorrelationMatrix.length > 0);
    assert.ok(report.complianceBoundary);
    assert.ok(report.taxLegalReadinessBoundary);
    assert.ok(Array.isArray(report.financialRiskRegister));
    assert.ok(report.financialRiskRegister.length > 0);
    assert.ok(report.noClaimDiscipline);
    assert.ok(Array.isArray(report.noClaimDiscipline.claims));
    assert.ok(Array.isArray(report.readinessGates));
    assert.ok(report.readinessGates.length > 0);
    assert.ok(Array.isArray(report.deferredScope));
    assert.ok(report.deferredScope.length > 0);
    assert.equal(report.financialAuditTrailBoundary.auditGradeState, "not_audit_grade");
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
    assert.equal(serialized.includes("password"), false);
    assert.equal(serialized.includes("\"amount\":"), false);
    assert.equal(serialized.includes("\"currency\":"), false);
  } finally {
    await context.close();
  }
});

for (const method of ["POST", "PATCH", "DELETE"]) {
  test(method + " /api/v1/system/financial-audit is method-not-allowed", async () => {
    const context = createControlPlaneContext();
    try {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/financial-audit", headers: {} },
        "/api/v1/system/financial-audit",
        context,
        { correlationId: "test_financial_audit_" + method.toLowerCase() },
      );
      assert.equal(result.status, 405);
      assert.equal(result.body.success, false);
    } finally {
      await context.close();
    }
  });
}
