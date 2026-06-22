import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ,
  ACS_BUSINESS_ALIGNMENT_TARGET,
  ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE,
  ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ,
  ACS_MARKETPLACE_ALIGNMENT_TARGET,
  checkAcsBusinessCommerceActionPosture,
  checkAcsMarketplaceCommerceActionPosture,
  getAcsAxodusAppPreviewSnapshot,
  getAcsBusinessAlignmentSnapshot,
  getAcsBusinessCommerceBlockedActions,
  getAcsBusinessCriticalWarnings,
  getAcsBusinessMarketplaceAlignmentSummary,
  getAcsConsumerSnapshot,
  getAcsMarketplaceAlignmentSnapshot,
  getAcsMarketplaceCommerceBlockedActions,
  getAcsMarketplaceCriticalWarnings,
} from "../dist/index.js";

test("Business alignment snapshot is read-only and non-executive", () => {
  const snapshot = getAcsBusinessAlignmentSnapshot();

  assert.equal(snapshot.alignmentMode, ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE);
  assert.equal(snapshot.targetConsumer, ACS_BUSINESS_ALIGNMENT_TARGET);
  assert.match(snapshot.nonProductionNotice, /read-only, non-executive, and non-production/i);
  assert.equal(snapshot.opportunityReadiness.executionAuthority, false);
});

test("Marketplace alignment snapshot is read-only and non-executive", () => {
  const snapshot = getAcsMarketplaceAlignmentSnapshot();

  assert.equal(snapshot.alignmentMode, ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE);
  assert.equal(snapshot.targetConsumer, ACS_MARKETPLACE_ALIGNMENT_TARGET);
  assert.match(snapshot.nonProductionNotice, /read-only, HOLD\/BACKLOG_READY, and non-production/i);
  assert.equal(snapshot.marketplacePosture.nonExecutive, true);
});

test("Marketplace posture remains HOLD/BACKLOG_READY and non-executive", () => {
  const snapshot = getAcsMarketplaceAlignmentSnapshot();

  assert.equal(snapshot.marketplacePosture.status, "HOLD/BACKLOG_READY_NON_EXECUTIVE");
  assert.equal(snapshot.marketplacePosture.holdOrBacklogReady, true);
});

test("Business opportunity readiness does not imply execution authority", () => {
  const snapshot = getAcsBusinessAlignmentSnapshot();

  assert.equal(snapshot.opportunityReadiness.executionAuthority, false);
  assert.equal(snapshot.opportunityReadiness.blocked, true);
});

test("commerce blocked actions include billing, settlement, payouts, treasury, and provider production execution", () => {
  const business = getAcsBusinessCommerceBlockedActions();
  const marketplace = getAcsMarketplaceCommerceBlockedActions();
  const businessIds = new Set(business.map((action) => action.id));
  const marketplaceIds = new Set(marketplace.map((action) => action.id));

  for (const actionId of [
    "billing.execute.real",
    "settlement.execute.real",
    "payouts.execute.real",
    "treasury.execute.real",
    "provider.external.production.execute",
  ]) {
    assert.equal(businessIds.has(actionId), true, actionId);
    assert.equal(marketplaceIds.has(actionId), true, actionId);
  }
});

test("payment, billing, settlement, payouts, and treasury execution remain blocked", () => {
  const payment = checkAcsBusinessCommerceActionPosture("payment.execute.real");
  const billing = checkAcsBusinessCommerceActionPosture("billing.execute.real");
  const settlement = checkAcsMarketplaceCommerceActionPosture("settlement.execute.real");
  const payouts = checkAcsMarketplaceCommerceActionPosture("payouts.execute.real");
  const treasury = checkAcsBusinessCommerceActionPosture("treasury.execute.real");

  assert.equal(payment.representedBlocked, true);
  assert.equal(billing.representedBlocked, true);
  assert.equal(settlement.representedBlocked, true);
  assert.equal(payouts.representedBlocked, true);
  assert.equal(treasury.representedBlocked, true);
});

test("provider production execution remains blocked", () => {
  const check = checkAcsMarketplaceCommerceActionPosture("provider.external.production.execute");

  assert.equal(check.representedBlocked, true);
  assert.equal(check.consumerCheck.representedBlocked, true);
});

test("snapshots expose non-production and execution-gated warnings", () => {
  const businessWarnings = getAcsBusinessCriticalWarnings();
  const marketplaceWarnings = getAcsMarketplaceCriticalWarnings();

  assert.ok(businessWarnings.some((warning) => warning.includes("non-executive")));
  assert.ok(businessWarnings.some((warning) => warning.includes("Validation status")));
  assert.ok(marketplaceWarnings.some((warning) => warning.includes("HOLD/BACKLOG_READY")));
  assert.ok(marketplaceWarnings.some((warning) => warning.includes("No production commerce")));
});

test("action posture checks are representational only", () => {
  const businessCheck = checkAcsBusinessCommerceActionPosture("billing.execute.real");
  const marketplaceCheck = checkAcsMarketplaceCommerceActionPosture("provider.external.production.execute");

  assert.equal(businessCheck.representedAllowed, false);
  assert.equal(businessCheck.representedBlocked, true);
  assert.equal(businessCheck.productionIntegration, false);
  assert.equal(businessCheck.executionTriggered, false);
  assert.equal(businessCheck.runtimeCallTriggered, false);

  assert.equal(marketplaceCheck.representedAllowed, false);
  assert.equal(marketplaceCheck.representedBlocked, true);
  assert.equal(marketplaceCheck.productionIntegration, false);
  assert.equal(marketplaceCheck.executionTriggered, false);
  assert.equal(marketplaceCheck.runtimeCallTriggered, false);
});

test("returned alignment data does not mutate consumer contract state", () => {
  const business = getAcsBusinessAlignmentSnapshot();
  const marketplace = getAcsMarketplaceAlignmentSnapshot();
  const consumer = getAcsConsumerSnapshot();

  business.businessReadiness.evidence.push("mutation-attempt");
  business.commerceBlockedActions[0].evidence.push("mutation-attempt");
  marketplace.marketplaceReadiness.evidence.push("mutation-attempt");
  marketplace.commerceBlockedActions[0].evidence.push("mutation-attempt");

  assert.equal(consumer.readiness.entries.find((entry) => entry.id === "acs.business-alignment")?.evidence.includes("mutation-attempt"), false);
  assert.equal(consumer.readiness.entries.find((entry) => entry.id === "acs.marketplace-alignment")?.evidence.includes("mutation-attempt"), false);
  assert.equal(consumer.blockedActions.actions[0].evidence.includes("mutation-attempt"), false);
});

test("no Business or Marketplace runtime dependency exists and no production commerce integration is implied", () => {
  const business = checkAcsBusinessCommerceActionPosture("billing.execute.real");
  const marketplace = checkAcsMarketplaceCommerceActionPosture("provider.external.production.execute");
  const summary = getAcsBusinessMarketplaceAlignmentSummary();

  assert.equal(business.runtimeCallTriggered, false);
  assert.equal(marketplace.runtimeCallTriggered, false);
  assert.equal(summary.commerceExecutionBlocked, true);
  assert.equal(summary.billingExecutionBlocked, true);
  assert.equal(summary.settlementExecutionBlocked, true);
  assert.equal(summary.payoutsExecutionBlocked, true);
  assert.equal(summary.treasuryExecutionBlocked, true);
  assert.equal(summary.providerProductionExecutionBlocked, true);
});

test("AxodusAPP preview behavior is unchanged by ACS-REQ-09", () => {
  const preview = getAcsAxodusAppPreviewSnapshot();

  assert.equal(preview.recommendedNextReq, ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ);
  assert.equal(preview.targetConsumer, "AXODUSAPP_PORTFOLIO_INTELLIGENCE_HUB_PREVIEW");
});

test("recommended next request points to ACS-REQ-10", () => {
  const business = getAcsBusinessAlignmentSnapshot();
  const marketplace = getAcsMarketplaceAlignmentSnapshot();
  const summary = getAcsBusinessMarketplaceAlignmentSummary();

  assert.equal(business.recommendedNextReq, ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ);
  assert.equal(marketplace.recommendedNextReq, ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ);
  assert.equal(summary.recommendedNextReq, ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ);
});
