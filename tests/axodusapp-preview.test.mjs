import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE,
  ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ,
  ACS_AXODUSAPP_PREVIEW_SOURCE,
  ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER,
  getAcsAxodusAppBlockedActionCards,
  getAcsAxodusAppCriticalWarnings,
  getAcsAxodusAppGateCards,
  getAcsAxodusAppPermissionCards,
  getAcsAxodusAppPreviewSnapshot,
  getAcsAxodusAppReadinessCards,
  summarizeAcsAxodusAppPreviewPosture,
  getAcsConsumerSnapshot,
} from "../dist/index.js";

test("preview snapshot includes readiness, permissions, gates, and blocked actions", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.ok(snapshot.readinessCards.length >= 13);
  assert.ok(snapshot.permissionCards.length >= 20);
  assert.ok(snapshot.gateCards.length >= 15);
  assert.ok(snapshot.blockedActionCards.length >= 17);
});

test("preview snapshot uses the generic consumer contract as source", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.source, ACS_AXODUSAPP_PREVIEW_SOURCE);
});

test("adapter mode and target consumer identify AxodusAPP preview usage", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.adapterMode, ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE);
  assert.equal(snapshot.targetConsumer, ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER);
});

test("preview exposes read-only, non-production, and execution-gated posture", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();
  const summary = summarizeAcsAxodusAppPreviewPosture(snapshot);

  assert.match(snapshot.nonProductionNotice, /local\/config-first, read-only, execution-gated, and non-production/i);
  assert.equal(summary.readOnly, true);
  assert.equal(summary.nonProduction, true);
  assert.equal(summary.executionGated, true);
});

test("preview does not mark ACS as L4 Consolidated", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.acsStatus, "L4_CANDIDATE");
});

test("preview includes validation blocker when executable validation has not run", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.validationStatus, "NOT_EXECUTED_ENVIRONMENT_BLOCKER");
});

test("preview includes critical warnings for production and execution no-go areas", () => {
  const warnings = getAcsAxodusAppCriticalWarnings();

  assert.ok(warnings.some((warning) => warning.includes("Preview-only adapter")));
  assert.ok(warnings.some((warning) => warning.includes("No provisioning, signing, treasury, trading, settlement, billing, payouts, or provider execution is enabled.")));
});

test("cards are dashboard-safe and do not expose secrets", () => {
  const cards = [
    ...getAcsAxodusAppReadinessCards(),
    ...getAcsAxodusAppPermissionCards(),
    ...getAcsAxodusAppGateCards(),
    ...getAcsAxodusAppBlockedActionCards(),
  ];

  assert.ok(cards.every((card) => typeof card.id === "string"));
  assert.ok(cards.every((card) => typeof card.title === "string"));
  assert.ok(cards.every((card) => typeof card.status === "string"));
  assert.ok(cards.every((card) => typeof card.summary === "string"));
  assert.ok(cards.every((card) => Array.isArray(card.evidence)));
  assert.ok(cards.every((card) => !card.summary.toLowerCase().includes("secretref")));
  assert.ok(cards.every((card) => !card.summary.toLowerCase().includes("raw secret")));
});

test("preview data does not mutate consumer contract state", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();
  const consumerSnapshot = getAcsConsumerSnapshot();

  snapshot.readinessCards[0].evidence.push("mutation-attempt");
  snapshot.permissionCards[0].evidence.push("mutation-attempt");
  snapshot.gateCards[0].evidence.push("mutation-attempt");
  snapshot.blockedActionCards[0].evidence.push("mutation-attempt");

  assert.equal(consumerSnapshot.readiness.entries[0].evidence.includes("mutation-attempt"), false);
  assert.equal(consumerSnapshot.permissions.entries[0].evidence.includes("mutation-attempt"), false);
  assert.equal(consumerSnapshot.gates.gates[0].evidence.includes("mutation-attempt"), false);
  assert.equal(consumerSnapshot.blockedActions.actions[0].evidence.includes("mutation-attempt"), false);
});

test("preview adapter does not call AxodusAPP runtime or imply production integration", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.integrationReadiness.axodusAppRuntimeRequired, false);
  assert.equal(snapshot.integrationReadiness.axodusAppRuntimeCalled, false);
  assert.equal(snapshot.integrationReadiness.productionIntegration, false);
});

test("REQ-08 does not create Business or Marketplace alignment contracts", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.integrationReadiness.businessMarketplaceContractImplemented, false);
});

test("recommended next request points to ACS-REQ-09", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();
  const summary = summarizeAcsAxodusAppPreviewPosture();

  assert.equal(snapshot.recommendedNextReq, ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ);
  assert.equal(summary.recommendedNextReq, ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ);
});
