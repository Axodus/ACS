import assert from "node:assert/strict";
import test from "node:test";
import {
  createAcsPerformanceRecord,
  createAcsReceipt,
  EmergencyStopService,
  evaluateLicenseLoss,
  getMockTradingIgnitionPerformanceRecords,
  getMockUserStatusSummary,
  InMemoryAcsReceiptStore,
  InMemoryTelemetrySink,
  MockAcsSecretStorage,
  routeAcsRequest,
} from "../dist/index.js";

test("ACS receipts are tenant, product, policy, and JSON aware without secret leakage", () => {
  const coreReceipt = createAcsReceipt({
    consumptionLevel: "core",
    capabilityId: "core.governance-alignment",
    actionType: "inspect",
    actor: { type: "system", id: "acs" },
    policyDecision: { allowed: true, automationLevel: "assisted" },
  });
  const serviceReceipt = createAcsReceipt({
    consumptionLevel: "service",
    tenantId: "dao-alpha",
    capabilityId: "service.risk-analysis",
    actionType: "policy_check",
    actor: { type: "agent", id: "trinity" },
    policyDecision: { allowed: true, automationLevel: "manual_approval", requiresTenantApproval: true },
  });
  const productReceipt = createAcsReceipt({
    consumptionLevel: "product",
    wallet: "0xlicensed",
    capabilityId: "product.trading-ignition",
    actionType: "readiness_check",
    actor: { type: "user", id: "0xlicensed" },
    policyDecision: { allowed: false, blockedReason: "manual_approval_required", automationLevel: "manual_approval" },
    metadata: { apiSecret: "raw-secret", nested: { oauthToken: "raw-token", visible: "ok" } },
  });

  assert.ok(coreReceipt.correlationId);
  assert.equal(serviceReceipt.tenantId, "dao-alpha");
  assert.equal(productReceipt.wallet, "0xlicensed");
  assert.equal(productReceipt.policyDecision.allowed, false);
  assert.equal(productReceipt.metadata.apiSecret, "[redacted]");
  assert.equal(productReceipt.metadata.nested.oauthToken, "[redacted]");
  assert.equal(JSON.parse(JSON.stringify(productReceipt)).receiptId, productReceipt.receiptId);
});

test("emergency stops block user, tenant, capability, and system scopes", () => {
  const receipts = new InMemoryAcsReceiptStore();
  const telemetry = new InMemoryTelemetrySink();
  const service = new EmergencyStopService(telemetry, receipts);

  const userStop = service.createStop({
    scope: "user",
    source: "user",
    wallet: "0xstopped",
    capabilityId: "product.trading-ignition",
    reason: "user requested stop",
    severity: "critical",
  });
  assert.equal(service.evaluate({ wallet: "0xstopped", capabilityId: "product.trading-ignition" }).blockedReason, "emergency_stop_active");
  assert.equal(userStop.receipt.operationalState, "EMERGENCY_STOP");

  const tenantStop = service.createStop({
    scope: "tenant",
    source: "tenant-admin",
    tenantId: "dao-alpha",
    reason: "tenant incident",
    severity: "critical",
  });
  assert.equal(service.evaluate({ tenantId: "dao-alpha", capabilityId: "service.risk-analysis" }).blocked, true);
  service.resolveStop(tenantStop.stop.stopId);
  assert.equal(service.evaluate({ tenantId: "dao-alpha", capabilityId: "service.risk-analysis" }).blocked, false);

  service.createStop({
    scope: "capability",
    source: "governance",
    capabilityId: "product.trading-ignition",
    reason: "capability review",
    severity: "constitutional",
  });
  assert.equal(service.evaluate({ capabilityId: "product.trading-ignition" }).blocked, true);

  service.createStop({
    scope: "system",
    source: "system",
    reason: "global safety halt",
    severity: "constitutional",
  });
  assert.equal(service.evaluate({ capabilityId: "core.governance-alignment" }).blocked, true);
  assert.equal(receipts.list().length, 4);
  assert.ok(telemetry.list().some((event) => event.type === "emergency.stop.created"));
});

test("performance records are schema-only, serializable, and do not imply returns", () => {
  const mockRecord = createAcsPerformanceRecord({
    capabilityId: "product.trading-ignition",
    mode: "mock",
    warnings: ["mock only"],
  });
  const internalRecord = createAcsPerformanceRecord({
    tenantId: "dao-alpha",
    wallet: "0xlicensed",
    capabilityId: "product.trading-ignition",
    mode: "internal-validation",
    tradeCount: 0,
    warnings: ["internal validation only"],
  });
  const tradingIgnitionRecords = getMockTradingIgnitionPerformanceRecords();

  assert.equal(mockRecord.mode, "mock");
  assert.equal(internalRecord.mode, "internal-validation");
  assert.equal(tradingIgnitionRecords[0].capabilityId, "product.trading-ignition");
  assert.ok(tradingIgnitionRecords[0].warnings.length > 0);
  assert.equal("promisedProfit" in mockRecord, false);
  assert.equal(JSON.parse(JSON.stringify(internalRecord)).mode, "internal-validation");
});

test("user status summary covers eligibility, blocks, license loss, and emergency stops", () => {
  const eligible = getMockUserStatusSummary({ wallet: "0xlicensed", tenantId: "dao-alpha", productId: "product.trading-ignition" });
  const missingLicense = getMockUserStatusSummary({ wallet: "0xunlicensed", productId: "product.trading-ignition" });
  const expired = getMockUserStatusSummary({ wallet: "0xexpired", productId: "product.trading-ignition" });
  const stopped = getMockUserStatusSummary({ wallet: "0xstopped", productId: "product.trading-ignition" });

  assert.equal(eligible.policy.allowed, true);
  assert.equal(eligible.license.valid, true);
  assert.equal(missingLicense.policy.allowed, false);
  assert.equal(missingLicense.license.blockedReason, "license_missing");
  assert.equal(expired.operationalState, "RISK_RESTRICTED");
  assert.equal(expired.policy.blockedReason, "license_expired");
  assert.equal(stopped.emergencyStop.active, true);
  assert.equal(stopped.policy.blockedReason, "license_missing");
});

test("license loss decisions block product access and generate receipts", () => {
  for (const reason of [
    "license_expired",
    "license_revoked",
    "license_transferred",
    "license_not_owned",
    "tenant_access_suspended",
    "governance_restricted",
  ]) {
    const decision = evaluateLicenseLoss({
      wallet: "0xloss",
      tenantId: "dao-alpha",
      productId: "product.trading-ignition",
      reason,
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.blockedReason, reason);
    assert.equal(decision.receipt.policyDecision.blockedReason, reason);
  }
});

test("mock secret storage returns references without echoing raw secrets", async () => {
  const storage = new MockAcsSecretStorage();
  const stored = await storage.storeSecret({
    tenantId: "dao-alpha",
    wallet: "0xlicensed",
    provider: "mock-exchange",
    secretType: "cex-api-secret",
    value: "raw-secret-value",
  });
  const read = await storage.readSecret({ secretRef: stored.secretRef, purpose: "inspection-test" });
  const revoked = await storage.revokeSecret({ secretRef: stored.secretRef, reason: "test cleanup" });
  const receipt = createAcsReceipt({
    consumptionLevel: "product",
    wallet: "0xlicensed",
    capabilityId: "product.trading-ignition",
    actionType: "secret_contract_test",
    actor: { type: "system", id: "acs.test" },
    policyDecision: { allowed: false, automationLevel: "blocked" },
    metadata: { secretValue: "raw-secret-value", secretRef: stored.secretRef },
  });

  assert.ok(stored.secretRef.startsWith("secretref_"));
  assert.notEqual(read.value, "raw-secret-value");
  assert.equal(revoked.revoked, true);
  assert.equal(receipt.metadata.secretValue, "[redacted]");
  assert.equal(JSON.stringify(receipt).includes("raw-secret-value"), false);
});

test("HTTP hardening envelope includes correlation id, structured errors, and user status", () => {
  const health = routeAcsRequest("/acs/health", { correlationId: "corr-test" });
  const status = routeAcsRequest("/acs/user-status/0xexpired?productId=product.trading-ignition");
  const invalid = routeAcsRequest("/acs/capabilities?level=unknown");
  const unknownProduct = routeAcsRequest("/acs/product-access/0xlicensed/product.unknown");
  const policyStop = routeAcsRequest("/acs/policy-check?capabilityId=product.trading-ignition&wallet=0xstopped");

  assert.equal(health.body.correlationId, "corr-test");
  assert.equal(health.body.data.hardening.responseEnvelope, "enabled");
  assert.equal(status.body.data.policy.blockedReason, "license_expired");
  assert.equal(invalid.body.error.code, "invalid_query");
  assert.match(invalid.body.error.message, /invalid consumption level/);
  assert.equal(unknownProduct.status, 400);
  assert.match(unknownProduct.body.error.message, /unknown ACS capability/);
  assert.equal(policyStop.body.data.blockedReason, "emergency_stop_active");
});
