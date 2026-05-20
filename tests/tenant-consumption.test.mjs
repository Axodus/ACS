import assert from "node:assert/strict";
import test from "node:test";
import {
  AcsCapabilityRegistry,
  assertSameTenantContext,
  evaluateCapabilityPolicy,
  evaluateProductAccess,
  evaluateTenantServiceAccess,
  InMemoryOperationalStateReceiptStore,
  InMemoryTelemetrySink,
  OperationalStateMachine,
} from "../dist/index.js";

const tenantA = {
  tenantId: "dao-alpha",
  tenantType: "dao",
  governanceStatus: "active",
  federationTier: "standard",
  enabledServices: ["service.risk-analysis", "product.trading-ignition"],
  restrictions: [],
};

const tenantB = {
  tenantId: "dao-beta",
  tenantType: "dao",
  governanceStatus: "active",
  federationTier: "standard",
  enabledServices: [],
  restrictions: ["acs.services.suspended"],
};

test("core capability can run without tenant user license", () => {
  const registry = new AcsCapabilityRegistry();
  const capability = registry.require("core.tenant-health-monitoring");

  assert.equal(capability.level, "core");
  assert.equal(capability.coreOnly, true);
  assert.equal(capability.requiresUserLicense, false);
  assert.equal(capability.receiptsRequired, true);
  assert.equal(capability.telemetryRequired, true);
});

test("service capability requires enabled tenant and governance when configured", () => {
  const registry = new AcsCapabilityRegistry();
  const capability = registry.require("service.risk-analysis");

  assert.equal(
    evaluateTenantServiceAccess({ tenant: tenantA, capability, governanceApproved: false }).allowed,
    false,
  );
  assert.equal(
    evaluateTenantServiceAccess({ tenant: tenantA, capability, governanceApproved: true }).allowed,
    true,
  );
  assert.equal(
    evaluateTenantServiceAccess({ tenant: tenantB, capability, governanceApproved: true }).allowed,
    false,
  );
});

test("product capability requires user product access", () => {
  const registry = new AcsCapabilityRegistry();
  const capability = registry.require("product.trading-ignition");

  const blocked = evaluateProductAccess({
    capability,
    access: {
      subscriptionActive: false,
      nftLicenseValid: false,
      marketplacePurchaseValid: false,
      governancePermission: true,
      userReadinessState: "READY",
    },
  });
  assert.equal(blocked.allowed, false);

  const allowed = evaluateProductAccess({
    capability,
    access: {
      walletAddress: "0x123",
      subscriptionActive: false,
      nftLicenseValid: true,
      marketplacePurchaseValid: false,
      governancePermission: true,
      userReadinessState: "READY",
    },
  });
  assert.equal(allowed.allowed, true);
});

test("tenant A cannot access tenant B context", () => {
  assert.throws(() => assertSameTenantContext(tenantA, tenantB), /tenant context mismatch/);
  assert.doesNotThrow(() => assertSameTenantContext(tenantA, tenantA));
});

test("automation remains non-autonomous while governance is immature", () => {
  const strategyActivation = evaluateCapabilityPolicy("activate.strategy", "READY", "user", "product");

  assert.equal(strategyActivation.allowed, true);

  const withdraw = evaluateCapabilityPolicy("withdraw.funds", "READY", "user", "product");
  assert.equal(withdraw.allowed, false);
});

test("Trading Ignition is classified as product capability with tenant service availability", () => {
  const registry = new AcsCapabilityRegistry();
  const capability = registry.require("product.trading-ignition");

  assert.equal(capability.level, "product");
  assert.equal(capability.category, "trading");
  assert.equal(capability.tenantAccessAllowed, true);
  assert.equal(capability.productAccessAllowed, true);
  assert.equal(capability.automationLevel, "manual_approval");
});

test("operational telemetry and receipts include consumption level and tenant id", () => {
  const telemetry = new InMemoryTelemetrySink();
  const receipts = new InMemoryOperationalStateReceiptStore();
  const machine = new OperationalStateMachine({ telemetry, receipts });

  const receipt = machine.transition({
    subjectId: "user:1",
    tenantId: "dao-alpha",
    consumptionLevel: "product",
    from: "READY",
    to: "ACTIVE",
    actor: "user",
    reason: "user activated Trading Ignition",
  });

  assert.equal(receipt.tenantId, "dao-alpha");
  assert.equal(receipt.consumptionLevel, "product");
  assert.equal(telemetry.list()[0].data.tenantId, "dao-alpha");
  assert.equal(telemetry.list()[0].data.consumptionLevel, "product");
});

