import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  checkAcsBlockedAction,
  checkAcsBusinessCommerceActionPosture,
  checkAcsConsumerActionPosture,
  checkAcsMarketplaceCommerceActionPosture,
  checkAcsPermissionAction,
  classifyTradingIntent,
  createAcsBlockedActionFixtures,
  createAcsReadinessRegistryFixtures,
  getAcsAxodusAppPreviewSnapshot,
  getAcsBusinessAlignmentSnapshot,
  getAcsConsumerSnapshot,
  getAcsMarketplaceAlignmentSnapshot,
  getAcsPermissionStateEntry,
  inspectAxodusAppPreviewSnapshot,
  inspectBusinessAlignmentSnapshot,
  inspectConsumerContractSnapshot,
  inspectEmergencyStops,
  inspectMarketplaceAlignmentSnapshot,
  inspectOperationalGateRegistry,
  inspectSecretStorageStatus,
  listAcsPermissionStateEntries,
} from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeContractPath = join(__dirname, "..", "src", "http", "routes", "acs-routes.ts");
const httpContractDocPath = join(__dirname, "..", ".instructions", "ACS_HTTP_API_CONTRACTS.md");

const REQUIRED_BLOCKED_ACTION_IDS = [
  "acs.provision.real",
  "credentials.issue.real",
  "credentials.read.secret",
  "wallet.create.real",
  "wallet.sign.real",
  "treasury.execute.real",
  "trading.execute.real",
  "settlement.execute.real",
  "payouts.execute.real",
  "billing.execute.real",
  "database.production.connect",
  "api.production.mutate",
  "provider.external.production.execute",
  "smart_contract.deploy_or_mutate",
  "permission.enforce.production",
  "state.mutate.production",
  "portfolio.global_registers.mutate",
] as const;

const PROHIBITED_ACTIONS = new Set(REQUIRED_BLOCKED_ACTION_IDS);

test("every required blocked action is present, BLOCKED, and outside ACS-EPIC-01 unblocking scope", () => {
  const actions = createAcsBlockedActionFixtures();
  const actionIds = new Set(actions.map((action) => action.id));

  for (const actionId of REQUIRED_BLOCKED_ACTION_IDS) {
    assert.equal(actionIds.has(actionId), true, actionId);

    const action = actions.find((candidate) => candidate.id === actionId);
    assert.ok(action, actionId);
    assert.equal(action.status, "BLOCKED");
    assert.equal(action.futureUnblockGate, "OUT_OF_SCOPE_FOR_ACS_EPIC_01");
  }
});

test("permission action checks return representational blocked posture for prohibited actions", () => {
  const checks = [
    ["acs.secrets-credentials", "credentials.issue.real"],
    ["acs.secrets-credentials", "credentials.read.secret"],
    ["acs.wallet-signing", "wallet.sign.real"],
    ["acs.treasury", "treasury.execute.real"],
    ["acs.settlement", "settlement.execute.real"],
    ["acs.billing-execution", "billing.execute.real"],
    ["acs.provisioning", "acs.provision.real"],
    ["acs.external-provider-production-execution", "provider.external.production.execute"],
    ["acs.permission-state-model", "permission.enforce.production"],
  ] as const;

  for (const [entryId, action] of checks) {
    const result = checkAcsPermissionAction(entryId, action);
    assert.equal(result.representedAllowed, false, action);
    assert.equal(result.representedBlocked, true, action);
    assert.equal(result.productionEnforcement, false, action);
    assert.equal(result.executionTriggered, false, action);
  }
});

test("gate blocked-action checks return blocked posture for all prohibited actions", () => {
  for (const actionId of REQUIRED_BLOCKED_ACTION_IDS) {
    const result = checkAcsBlockedAction(actionId);
    assert.equal(result.representedBlocked, true, actionId);
    assert.equal(result.productionEnforcement, false, actionId);
    assert.equal(result.executionTriggered, false, actionId);
  }
});

test("consumer action posture checks remain representational only for prohibited actions", () => {
  const checks = [
    "wallet.sign.real",
    "billing.execute.real",
    "provider.external.production.execute",
    "portfolio.global_registers.mutate",
  ] as const;

  for (const action of checks) {
    const result = checkAcsConsumerActionPosture(action);
    assert.equal(result.representedAllowed, false, action);
    assert.equal(result.representedBlocked, true, action);
    assert.equal(result.productionEnforcement, false, action);
    assert.equal(result.executionTriggered, false, action);
    assert.equal(result.consumerReadOnly, true, action);
  }
});

test("AxodusAPP preview does not expose production integration authority", () => {
  const snapshot = getAcsAxodusAppPreviewSnapshot();

  assert.equal(snapshot.integrationReadiness.previewOnly, true);
  assert.equal(snapshot.integrationReadiness.readOnly, true);
  assert.equal(snapshot.integrationReadiness.axodusAppRuntimeRequired, false);
  assert.equal(snapshot.integrationReadiness.axodusAppRuntimeCalled, false);
  assert.equal(snapshot.integrationReadiness.productionIntegration, false);
});

test("Business and Marketplace commerce action posture checks do not allow execution", () => {
  const business = checkAcsBusinessCommerceActionPosture("billing.execute.real");
  const marketplace = checkAcsMarketplaceCommerceActionPosture("provider.external.production.execute");

  assert.equal(business.representedAllowed, false);
  assert.equal(business.representedBlocked, true);
  assert.equal(business.productionIntegration, false);
  assert.equal(business.executionTriggered, false);
  assert.equal(business.runtimeCallTriggered, false);

  assert.equal(marketplace.representedAllowed, false);
  assert.equal(marketplace.representedBlocked, true);
  assert.equal(marketplace.productionIntegration, false);
  assert.equal(marketplace.executionTriggered, false);
  assert.equal(marketplace.runtimeCallTriggered, false);
});

test("inspection surfaces remain read-only and cloned", () => {
  const gates = inspectOperationalGateRegistry();
  const consumer = inspectConsumerContractSnapshot();
  const axodusapp = inspectAxodusAppPreviewSnapshot();
  const business = inspectBusinessAlignmentSnapshot();
  const marketplace = inspectMarketplaceAlignmentSnapshot();

  gates.gates[0].blockedActions.push("mutation-attempt");
  consumer.snapshot.blockedActions.actions[0].evidence.push("mutation-attempt");
  axodusapp.snapshot.blockedActionCards[0].evidence.push("mutation-attempt");
  business.snapshot.commerceBlockedActions[0].evidence.push("mutation-attempt");
  marketplace.snapshot.commerceBlockedActions[0].evidence.push("mutation-attempt");

  assert.equal(inspectOperationalGateRegistry().gates[0].blockedActions.includes("mutation-attempt"), false);
  assert.equal(inspectConsumerContractSnapshot().snapshot.blockedActions.actions[0].evidence.includes("mutation-attempt"), false);
  assert.equal(inspectAxodusAppPreviewSnapshot().snapshot.blockedActionCards[0].evidence.includes("mutation-attempt"), false);
  assert.equal(inspectBusinessAlignmentSnapshot().snapshot.commerceBlockedActions[0].evidence.includes("mutation-attempt"), false);
  assert.equal(inspectMarketplaceAlignmentSnapshot().snapshot.commerceBlockedActions[0].evidence.includes("mutation-attempt"), false);
});

test("HTTP contracts do not expose mutation routes for ACS registries or contracts", () => {
  const routeSource = readFileSync(routeContractPath, "utf8");
  const httpContractDoc = readFileSync(httpContractDocPath, "utf8");

  assert.doesNotMatch(routeSource, /\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/);
  assert.match(httpContractDoc, /read-only\/inspection-first/i);
  assert.match(httpContractDoc, /must not expose secrets, mutate tenant state, call real exchanges or start autonomous workflows/i);
});

test("no readiness fixture marks ACS as L4 Consolidated", () => {
  const fixtures = createAcsReadinessRegistryFixtures();
  const consumer = getAcsConsumerSnapshot();
  const axodusapp = getAcsAxodusAppPreviewSnapshot();

  assert.ok(fixtures.every((entry) => entry.status !== "L4_CONSOLIDATED"));
  assert.equal(consumer.boundaries.l4Consolidated, false);
  assert.equal(axodusapp.acsStatus, "L4_CANDIDATE");
});

test("no fixture marks production DB, production API, or provider production execution as allowed", () => {
  const permissionEntries = listAcsPermissionStateEntries();
  const allowedActions = permissionEntries.flatMap((entry) => entry.allowedActions);
  const consumer = getAcsConsumerSnapshot();

  assert.equal(allowedActions.some((action) => PROHIBITED_ACTIONS.has(action as (typeof REQUIRED_BLOCKED_ACTION_IDS)[number])), false);
  assert.equal(consumer.boundaries.productionProviderExecutionLayer, false);
  assert.equal(consumer.boundaries.productionPermissionEnforcementAvailable, false);
});

test("no fixture or enforcement test path requires real secrets", () => {
  const secretStatus = inspectSecretStorageStatus();
  const credentials = getAcsPermissionStateEntry("acs.secrets-credentials");

  assert.equal(secretStatus.storageEnabled, false);
  assert.equal(secretStatus.plaintextStorageAllowed, false);
  assert.equal(secretStatus.frontendSecretExposureAllowed, false);
  assert.equal(secretStatus.currentAdapter, "MockAcsSecretStorage");
  assert.ok(credentials?.blockedActions.includes("credentials.issue.real"));
  assert.ok(credentials?.blockedActions.includes("credentials.read.secret"));
  assert.ok(credentials?.blockedActions.includes("credentials.use.production"));
});

test("Hummingbot runtime remains blocked or sandbox-only", () => {
  const hummingbot = getAcsPermissionStateEntry("acs.hummingbot-sandbox-policy");
  const liveTrading = classifyTradingIntent({
    requestId: "req_live_trading",
    source: "cli",
    requesterRef: "tester",
    message: "start live trading now",
    rawUserPromptRef: "prompt_live_trading",
  });

  assert.ok(hummingbot?.states.includes("MOCK_ALLOWED"));
  assert.ok(hummingbot?.states.includes("EXECUTION_BLOCKED"));
  assert.ok(hummingbot?.blockedActions.includes("hummingbot.runtime.execute"));
  assert.equal(liveTrading.directSideEffectsAllowed, false);
  assert.equal(liveTrading.responseMode, "no_go");
  assert.ok(liveTrading.reasonCodes.includes("hummingbot_runtime_no_go"));
});

test("emergency stop and safety posture do not create execution authority", () => {
  const emergencyStops = inspectEmergencyStops();
  const consumer = getAcsConsumerSnapshot();

  assert.equal(emergencyStops.executionImpact, "policy_inspection_block_only");
  assert.ok(emergencyStops.warnings.some((warning) => warning.includes("read-only")));
  assert.equal(consumer.boundaries.mutationAuthorityAvailable, false);
});

test("boundary enforcement fixtures remain local-only and non-external", () => {
  const business = getAcsBusinessAlignmentSnapshot();
  const marketplace = getAcsMarketplaceAlignmentSnapshot();
  const axodusapp = getAcsAxodusAppPreviewSnapshot();

  assert.match(business.nonProductionNotice, /non-production/i);
  assert.match(marketplace.nonProductionNotice, /non-production/i);
  assert.match(axodusapp.nonProductionNotice, /non-production/i);
});
