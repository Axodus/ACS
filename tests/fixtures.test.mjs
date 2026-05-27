import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_FIXTURE_IDS,
  createAcsTenantFixtures,
  createSampleAcsReceiptFixture,
  createSampleEmergencyStopFixtures,
  createSamplePerformanceRecordFixtures,
  createSamplePolicyDecisionFixtures,
  createSampleUserStatusSummaryFixtures,
} from "../dist/index.js";

test("ACS fixtures expose stable tenant, capability, receipt, stop, status, and performance samples", () => {
  const tenants = createAcsTenantFixtures();
  const decisions = createSamplePolicyDecisionFixtures();
  const receipt = createSampleAcsReceiptFixture();
  const stops = createSampleEmergencyStopFixtures();
  const statuses = createSampleUserStatusSummaryFixtures();
  const performance = createSamplePerformanceRecordFixtures();

  assert.equal(ACS_FIXTURE_IDS.tradingIgnitionCapability, "product.trading-ignition");
  assert.ok(tenants.some((tenant) => tenant.tenantId === ACS_FIXTURE_IDS.enabledTenant));
  assert.equal(decisions.blocked.blockedReason, "emergency_stop_active");
  assert.equal(receipt.capabilityId, ACS_FIXTURE_IDS.tradingIgnitionCapability);
  assert.equal(stops[0].active, true);
  assert.equal(statuses.eligible.policy.allowed, true);
  assert.equal(statuses.licenseLoss.policy.blockedReason, "license_expired");
  assert.equal(performance[0].mode, "internal-validation");
});
