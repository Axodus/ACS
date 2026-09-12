import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const root = resolve(import.meta.dirname, "..");
const projections = [
  { path: "/api/v1/system/billing-boundary", claims: ["billingReady", "paymentReady", "invoiceReady", "tenantBillingReady", "productionFinancialOperationsReady"] },
  { path: "/api/v1/system/pricing-invoice-boundary", claims: ["pricingReady", "invoiceReady", "billingReady", "paymentReady", "tenantBillingReady", "productionFinancialOperationsReady", "taxReady", "complianceReady"] },
  { path: "/api/v1/system/payment-rails-boundary", claims: ["paymentReady", "billingReady", "invoiceReady", "tenantBillingReady", "productionFinancialOperationsReady", "refundReady", "chargebackReady"] },
  { path: "/api/v1/system/tenant-billing-boundary", claims: ["tenantBillingReady", "billingReady", "paymentReady", "invoiceReady", "productionFinancialOperationsReady", "tenantAdministrationReady"] },
  { path: "/api/v1/system/settlement-reconciliation", claims: ["receiptReady", "legalTaxReceiptReady", "settlementReady", "reconciliationReady", "accountingIntegrationReady", "billingReady", "paymentReady", "invoiceReady", "tenantBillingReady", "productionFinancialOperationsReady", "taxReady", "complianceReady"] },
  { path: "/api/v1/system/financial-audit", claims: ["financialAuditReady", "complianceReady", "taxReady", "billingReady", "paymentReady", "invoiceReady", "tenantBillingReady", "receiptReady", "settlementReady", "reconciliationReady", "productionFinancialOperationsReady"] },
];

test("EPIC-13 Product API projections remain GET-only, evidence-bounded and not claimed", async () => {
  const context = createControlPlaneContext();
  try {
    for (const projection of projections) {
      const result = await routeProductApiRequest(
        { method: "GET", url: projection.path, headers: {} },
        projection.path,
        context,
        { correlationId: "s43_" + projection.path.split("/").at(-1) },
      );
      assert.equal(result.status, 200, projection.path);
      assert.equal(result.body.success, true, projection.path);
      const report = result.body.data;
      assert.equal(typeof report.checkedAt, "number", projection.path + " must include checkedAt");
      assert.equal(report.claim, "not_claimed", projection.path + " must remain not_claimed");
      for (const claim of projection.claims) {
        assert.equal(report[claim], false, projection.path + " must keep " + claim + " false");
      }
      for (const field of ["blockers", "caveats", "deferredScope"]) {
        assert.ok(Array.isArray(report[field]), projection.path + " must include " + field);
        assert.ok(report[field].length > 0, projection.path + " must retain " + field);
      }
      const serialized = JSON.stringify(report);
      for (const forbidden of ["sk-", "apiKey", "password", "\"amount\":", "\"currency\":"]) {
        assert.equal(serialized.includes(forbidden), false, projection.path + " must not expose " + forbidden);
      }
    }
  } finally {
    await context.close();
  }
});

for (const projection of projections) {
  for (const method of ["POST", "PATCH", "DELETE"]) {
    test(method + " " + projection.path + " remains unsupported", async () => {
      const context = createControlPlaneContext();
      try {
        const result = await routeProductApiRequest(
          { method, url: projection.path, headers: {} },
          projection.path,
          context,
          { correlationId: "s43_" + method.toLowerCase() + "_" + projection.path.split("/").at(-1) },
        );
        assert.equal(result.status, 405);
        assert.equal(result.body.success, false);
      } finally {
        await context.close();
      }
    });
  }
}

test("S09 acceptance surface and pre-closure evidence remain present without a closure claim", () => {
  const app = readFileSync(resolve(root, ".design/app-standalone/src/App.tsx"), "utf8");
  const economics = readFileSync(resolve(root, ".design/app-standalone/src/domains/economics/Economics.tsx"), "utf8");
  const inventory = readFileSync(resolve(root, "docs/epics/epic-13/final-hardening-inventory.md"), "utf8");
  assert.match(app, /path="\/system\/billing-acceptance"/);
  assert.match(economics, /No financial actions/);
  assert.match(inventory, /EPIC-13 Closed: NO \/ pending S11/);
  assert.match(inventory, /Production Financial Operations: NO \/ not yet claimed/);
});
