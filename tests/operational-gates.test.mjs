import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_OPERATIONAL_GATE_STATUSES,
  checkAcsBlockedAction,
  createAcsBlockedActionFixtures,
  createAcsOperationalGateFixtures,
  getAcsBlockedAction,
  getAcsOperationalGate,
  isAcsBlockedAction,
  isAcsOperationalGate,
  listAcsBlockedActions,
  listAcsOperationalGates,
  summarizeAcsOperationalGates,
} from "../dist/index.js";

const REQUIRED_GATES = [
  "gate.wallet-signing",
  "gate.treasury",
  "gate.trading-execution",
  "gate.settlement",
  "gate.billing-execution",
  "gate.acs-provisioning",
  "gate.credentials",
  "gate.production-database",
  "gate.external-provider-production",
  "gate.payouts",
  "gate.smart-contract-mutation",
  "gate.production-api-mutation",
  "gate.production-permission-enforcement",
  "gate.production-state-mutation",
  "gate.portfolio-global-register-mutation",
];

const REQUIRED_BLOCKED_ACTIONS = [
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
];

test("all required gates exist", () => {
  const gates = createAcsOperationalGateFixtures();
  const gateIds = new Set(gates.map((gate) => gate.id));

  assert.deepEqual(ACS_OPERATIONAL_GATE_STATUSES, [
    "CLOSED",
    "BLOCKED",
    "EXECUTION_GATED",
    "READ_ONLY_ALLOWED",
  ]);

  for (const gateId of REQUIRED_GATES) {
    assert.equal(gateIds.has(gateId), true, gateId);
  }

  assert.ok(gates.every((gate) => isAcsOperationalGate(gate)));
});

test("all critical gates are closed, blocked, or execution-gated", () => {
  const gates = createAcsOperationalGateFixtures().filter((gate) => REQUIRED_GATES.includes(gate.id));

  assert.ok(gates.every((gate) => ["CLOSED", "BLOCKED", "EXECUTION_GATED"].includes(gate.status)));
});

test("all required blocked actions exist and have status BLOCKED", () => {
  const actions = createAcsBlockedActionFixtures();
  const actionIds = new Set(actions.map((action) => action.id));

  for (const actionId of REQUIRED_BLOCKED_ACTIONS) {
    assert.equal(actionIds.has(actionId), true, actionId);
  }

  assert.ok(actions.every((action) => action.status === "BLOCKED"));
  assert.ok(actions.every((action) => isAcsBlockedAction(action)));
});

test("blocked actions are linked to valid gates", () => {
  const gates = new Set(createAcsOperationalGateFixtures().map((gate) => gate.id));
  const actions = createAcsBlockedActionFixtures();

  assert.ok(actions.every((action) => gates.has(action.gateId)));
});

test("wallet/signing gate blocks wallet.create.real and wallet.sign.real", () => {
  const gate = getAcsOperationalGate("gate.wallet-signing");

  assert.ok(gate);
  assert.ok(gate.blockedActions.includes("wallet.create.real"));
  assert.ok(gate.blockedActions.includes("wallet.sign.real"));
});

test("treasury gate blocks treasury.execute.real", () => {
  const gate = getAcsOperationalGate("gate.treasury");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["treasury.execute.real"]);
});

test("trading execution gate blocks trading.execute.real", () => {
  const gate = getAcsOperationalGate("gate.trading-execution");

  assert.ok(gate);
  assert.ok(gate.blockedActions.includes("trading.execute.real"));
});

test("settlement gate blocks settlement.execute.real", () => {
  const gate = getAcsOperationalGate("gate.settlement");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["settlement.execute.real"]);
});

test("payouts gate blocks payouts.execute.real", () => {
  const gate = getAcsOperationalGate("gate.payouts");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["payouts.execute.real"]);
});

test("billing gate blocks billing.execute.real", () => {
  const gate = getAcsOperationalGate("gate.billing-execution");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["billing.execute.real"]);
});

test("ACS provisioning gate blocks acs.provision.real", () => {
  const gate = getAcsOperationalGate("gate.acs-provisioning");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["acs.provision.real"]);
});

test("credentials gate blocks credentials.issue.real and credentials.read.secret", () => {
  const gate = getAcsOperationalGate("gate.credentials");

  assert.ok(gate);
  assert.ok(gate.blockedActions.includes("credentials.issue.real"));
  assert.ok(gate.blockedActions.includes("credentials.read.secret"));
});

test("production database gate blocks database.production.connect", () => {
  const gate = getAcsOperationalGate("gate.production-database");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["database.production.connect"]);
});

test("external provider production gate blocks provider.external.production.execute", () => {
  const gate = getAcsOperationalGate("gate.external-provider-production");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["provider.external.production.execute"]);
});

test("smart contract gate blocks smart_contract.deploy_or_mutate", () => {
  const gate = getAcsOperationalGate("gate.smart-contract-mutation");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["smart_contract.deploy_or_mutate"]);
});

test("production API mutation gate blocks api.production.mutate", () => {
  const gate = getAcsOperationalGate("gate.production-api-mutation");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["api.production.mutate"]);
});

test("production permission enforcement gate blocks permission.enforce.production", () => {
  const gate = getAcsOperationalGate("gate.production-permission-enforcement");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["permission.enforce.production"]);
});

test("production state mutation gate blocks state.mutate.production", () => {
  const gate = getAcsOperationalGate("gate.production-state-mutation");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["state.mutate.production"]);
});

test("portfolio/global register mutation gate blocks portfolio.global_registers.mutate", () => {
  const gate = getAcsOperationalGate("gate.portfolio-global-register-mutation");

  assert.ok(gate);
  assert.deepEqual(gate.blockedActions, ["portfolio.global_registers.mutate"]);
});

test("read functions do not mutate gate and blocked-action fixture data", () => {
  const gates = createAcsOperationalGateFixtures();
  const actions = createAcsBlockedActionFixtures();
  const listedGates = listAcsOperationalGates(gates);
  const listedActions = listAcsBlockedActions(actions);

  listedGates[0].allowedRepresentations.push("mutation-attempt");
  listedGates[0].blockedActions.push("mutation-attempt");
  listedActions[0].allowedRepresentation.push("mutation-attempt");
  listedActions[0].blockedExecution.push("mutation-attempt");

  assert.equal(gates[0].allowedRepresentations.includes("mutation-attempt"), false);
  assert.equal(gates[0].blockedActions.includes("mutation-attempt"), false);
  assert.equal(actions[0].allowedRepresentation.includes("mutation-attempt"), false);
  assert.equal(actions[0].blockedExecution.includes("mutation-attempt"), false);
});

test("summary output preserves execution-gated and non-production posture", () => {
  const summary = summarizeAcsOperationalGates();

  assert.equal(summary.executionGated, true);
  assert.equal(summary.nonProduction, true);
  assert.equal(summary.mutationAuthorityAvailable, false);
  assert.equal(summary.productionEnforcementAvailable, false);
  assert.ok(summary.totalGates >= REQUIRED_GATES.length);
  assert.ok(summary.blockedActionCount >= REQUIRED_BLOCKED_ACTIONS.length);
});

test("blocked action check is representational only and does not imply production enforcement", () => {
  const result = checkAcsBlockedAction("wallet.sign.real");

  assert.equal(result.actionFound, true);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.representedBlocked, true);
  assert.equal(result.productionEnforcement, false);
  assert.equal(result.executionTriggered, false);
});

test("blocked action entries remain linked to the expected gate ids", () => {
  assert.equal(getAcsBlockedAction("wallet.sign.real")?.gateId, "gate.wallet-signing");
  assert.equal(getAcsBlockedAction("treasury.execute.real")?.gateId, "gate.treasury");
  assert.equal(getAcsBlockedAction("portfolio.global_registers.mutate")?.gateId, "gate.portfolio-global-register-mutation");
});
