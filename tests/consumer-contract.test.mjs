import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_CONSUMER_MODE,
  ACS_CONSUMER_RECOMMENDED_NEXT_REQ,
  ACS_CONSUMER_SOURCE,
  checkAcsConsumerActionPosture,
  getAcsConsumerBlockedActionView,
  getAcsConsumerGateView,
  getAcsConsumerPermissionView,
  getAcsConsumerReadinessView,
  getAcsConsumerSnapshot,
  getAcsConsumerSummary,
  listAcsBlockedActions,
  listAcsOperationalGates,
  listAcsPermissionStateEntries,
  listAcsReadinessRegistryEntries,
} from "../dist/index.js";

test("consumer snapshot includes readiness, permissions, gates, and blocked actions", () => {
  const snapshot = getAcsConsumerSnapshot();

  assert.equal(snapshot.consumerMode, ACS_CONSUMER_MODE);
  assert.equal(snapshot.source, ACS_CONSUMER_SOURCE);
  assert.ok(snapshot.readiness.entries.length >= 13);
  assert.ok(snapshot.permissions.entries.length >= 20);
  assert.ok(snapshot.gates.gates.length >= 15);
  assert.ok(snapshot.blockedActions.actions.length >= 17);
});

test("consumer summary preserves read-only, non-production, and execution-gated posture", () => {
  const summary = getAcsConsumerSummary();

  assert.equal(summary.readOnly, true);
  assert.equal(summary.nonProduction, true);
  assert.equal(summary.executionGated, true);
  assert.equal(summary.validationStatus, "NOT_EXECUTED_ENVIRONMENT_BLOCKER");
});

test("ACS is not marked L4 Consolidated in the consumer contract", () => {
  const snapshot = getAcsConsumerSnapshot();

  assert.equal(snapshot.acsStatus, "L4_CANDIDATE");
  assert.equal(snapshot.boundaries.l4Consolidated, false);
});

test("consumer contract exposes critical blocked actions and closed or blocked gates", () => {
  const blockedActions = getAcsConsumerBlockedActionView();
  const gates = getAcsConsumerGateView();

  assert.ok(blockedActions.actions.some((action) => action.id === "wallet.sign.real"));
  assert.ok(blockedActions.actions.some((action) => action.id === "provider.external.production.execute"));
  assert.ok(gates.gates.some((gate) => gate.id === "gate.wallet-signing"));
  assert.ok(gates.gates.some((gate) => ["CLOSED", "BLOCKED", "EXECUTION_GATED"].includes(gate.status)));
});

test("validation posture reflects the current environment blocker", () => {
  const snapshot = getAcsConsumerSnapshot();

  assert.equal(snapshot.validation.status, "NOT_EXECUTED_ENVIRONMENT_BLOCKER");
  assert.equal(snapshot.validation.currentCycleExecutableValidationRun, false);
});

test("generic consumers cannot infer production enforcement authority", () => {
  const snapshot = getAcsConsumerSnapshot();

  assert.equal(snapshot.boundaries.productionPermissionEnforcementAvailable, false);
  assert.equal(snapshot.boundaries.provisioningSystem, false);
  assert.equal(snapshot.boundaries.signingWalletSystem, false);
  assert.equal(snapshot.boundaries.tradingExecutor, false);
  assert.equal(snapshot.boundaries.productionProviderExecutionLayer, false);
});

test("consumer action posture check is representational only", () => {
  const allowed = checkAcsConsumerActionPosture("readiness.summary");
  const blocked = checkAcsConsumerActionPosture("wallet.sign.real");

  assert.equal(allowed.representedAllowed, true);
  assert.equal(allowed.representedBlocked, false);
  assert.equal(allowed.productionEnforcement, false);
  assert.equal(allowed.executionTriggered, false);

  assert.equal(blocked.representedBlocked, true);
  assert.equal(blocked.productionEnforcement, false);
  assert.equal(blocked.executionTriggered, false);
  assert.equal(blocked.blockedAction.actionFound, true);
});

test("consumer snapshot reads do not mutate underlying registries", () => {
  const snapshot = getAcsConsumerSnapshot();

  snapshot.readiness.entries[0].evidence.push("mutation-attempt");
  snapshot.permissions.entries[0].allowedActions.push("mutation-attempt");
  snapshot.gates.gates[0].allowedRepresentations.push("mutation-attempt");
  snapshot.blockedActions.actions[0].allowedRepresentation.push("mutation-attempt");

  assert.equal(listAcsReadinessRegistryEntries()[0].evidence.includes("mutation-attempt"), false);
  assert.equal(listAcsPermissionStateEntries()[0].allowedActions.includes("mutation-attempt"), false);
  assert.equal(listAcsOperationalGates()[0].allowedRepresentations.includes("mutation-attempt"), false);
  assert.equal(listAcsBlockedActions()[0].allowedRepresentation.includes("mutation-attempt"), false);
});

test("REQ-07 does not create AxodusAPP-specific or Business/Marketplace-specific adapters", () => {
  const snapshot = getAcsConsumerSnapshot();

  assert.equal(snapshot.boundaries.integrationReadiness.axodusAppAdapter, "NOT_IMPLEMENTED_IN_ACS_REQ_07");
  assert.equal(snapshot.boundaries.integrationReadiness.businessMarketplaceAlignment, "NOT_IMPLEMENTED_IN_ACS_REQ_07");
});

test("consumer registry views remain read-only and consistent", () => {
  const readiness = getAcsConsumerReadinessView();
  const permissions = getAcsConsumerPermissionView();
  const gates = getAcsConsumerGateView();
  const blockedActions = getAcsConsumerBlockedActionView();

  assert.equal(readiness.summary.executionGated, true);
  assert.equal(permissions.summary.productionEnforcementAvailable, false);
  assert.equal(gates.summary.nonProduction, true);
  assert.equal(blockedActions.summary.productionEnforcementAvailable, false);
});

test("recommended next request points to ACS-REQ-08", () => {
  const snapshot = getAcsConsumerSnapshot();
  const summary = getAcsConsumerSummary();

  assert.equal(snapshot.recommendedNextReq, ACS_CONSUMER_RECOMMENDED_NEXT_REQ);
  assert.equal(summary.recommendedNextReq, ACS_CONSUMER_RECOMMENDED_NEXT_REQ);
});
