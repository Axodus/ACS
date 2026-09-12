import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const appPath = resolve(root, ".design/app-standalone/src/App.tsx");
const economicsPath = resolve(root, ".design/app-standalone/src/domains/economics/Economics.tsx");
const clientPath = resolve(root, ".design/app-standalone/src/api/product-api.ts");
const browserAcceptancePath = resolve(root, "docs/epics/epic-13/browser-acceptance.md");
const app = readFileSync(appPath, "utf8");
const economics = readFileSync(economicsPath, "utf8");
const client = readFileSync(clientPath, "utf8");

const financialRoutes = [
  "/system/billing-boundary",
  "/system/pricing-invoice-boundary",
  "/system/payment-rails-boundary",
  "/system/tenant-billing-boundary",
  "/system/settlement-reconciliation",
  "/system/financial-audit",
];

const productApiMethods = [
  "getBillingBoundaryReport",
  "getPricingInvoiceBoundaryReport",
  "getPaymentRailsBoundaryReport",
  "getTenantBillingBoundaryReport",
  "getSettlementReconciliationBoundaryReport",
  "getFinancialAuditBoundaryReport",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("S09 exposes a read-only billing operator acceptance surface and all financial boundaries", () => {
  assert.match(app, /path="\/system\/billing-acceptance"/);
  assert.match(economics, /Billing UX &amp; Operator Acceptance/);
  for (const route of financialRoutes) {
    assert.match(economics, new RegExp(escapeRegExp(route)));
  }
  for (const method of productApiMethods) {
    assert.match(client, new RegExp(method));
  }
});

test("S09 displays no-claim consistency and state taxonomy", () => {
  for (const claim of [
    "Billing UX Accepted",
    "Operator Acceptance Ready",
    "Browser Acceptance Ready",
    "Financial Audit Ready",
    "Compliance Ready",
    "Tax Ready",
    "Production Financial Operations",
  ]) {
    assert.match(economics, new RegExp(escapeRegExp(claim)));
  }
  for (const state of ["candidate", "blocked", "deferred", "not_claimed", "evidence_only"]) {
    assert.match(economics, new RegExp(state));
  }
  assert.match(economics, /NO \/ not yet claimed/);
});

test("S09 documents browser/manual acceptance without claiming browser certification", () => {
  assert.equal(existsSync(browserAcceptancePath), true);
  const checklist = readFileSync(browserAcceptancePath, "utf8");
  assert.match(checklist, /Status: NOT EXECUTED/);
  assert.match(checklist, /No browser certification is claimed/);
  for (const route of financialRoutes) {
    assert.match(checklist, new RegExp(escapeRegExp(route)));
  }
});

test("S09 contains no productive financial action surface", () => {
  const prohibited = [
    "charge tenant",
    "create invoice",
    "issue invoice",
    "capture payment",
    "authorize payment",
    "refund",
    "chargeback",
    "settle",
    "reconcile",
    "generate legal receipt",
    "generate tax invoice",
    "configure payment provider",
    "connect accounting",
    "approve financial operation",
  ];
  for (const action of prohibited) {
    assert.equal(economics.toLowerCase().includes(">" + action + "<"), false, "productive action must not be rendered: " + action);
  }
  assert.equal(economics.includes("No financial actions"), true);
});
