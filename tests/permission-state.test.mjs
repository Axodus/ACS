import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_PERMISSION_STATES,
  checkAcsPermissionAction,
  createAcsPermissionStateFixtures,
  getAcsPermissionStateEntry,
  isAcsPermissionStateEntry,
  listAcsPermissionStateEntries,
  listBlockedAcsPermissionStateEntries,
  summarizeAcsPermissionState,
} from "../dist/index.js";

test("supports every required permission state", () => {
  assert.deepEqual(ACS_PERMISSION_STATES, [
    "READ_ALLOWED",
    "PREVIEW_ALLOWED",
    "MOCK_ALLOWED",
    "CONFIG_ALLOWED",
    "EXECUTION_BLOCKED",
    "SIGNING_BLOCKED",
    "TREASURY_BLOCKED",
    "SETTLEMENT_BLOCKED",
    "PROVISIONING_BLOCKED",
  ]);
});

test("permission state fixtures validate against the runtime type guard", () => {
  const fixtures = createAcsPermissionStateFixtures();

  assert.ok(fixtures.length >= 20);
  assert.ok(fixtures.every((entry) => isAcsPermissionStateEntry(entry)));
});

test("ACS inspection and readiness access are read/config/preview only", () => {
  const inspection = getAcsPermissionStateEntry("acs.core-inspection");
  const readiness = getAcsPermissionStateEntry("acs.readiness-registry");

  assert.ok(inspection);
  assert.deepEqual(inspection.states, ["READ_ALLOWED", "PREVIEW_ALLOWED"]);

  assert.ok(readiness);
  assert.ok(readiness.states.includes("READ_ALLOWED"));
  assert.ok(readiness.states.includes("PREVIEW_ALLOWED"));
  assert.ok(readiness.states.includes("CONFIG_ALLOWED"));
  assert.equal(readiness.states.includes("EXECUTION_BLOCKED"), false);
});

test("permission state model is representational only", () => {
  const entry = getAcsPermissionStateEntry("acs.permission-state-model");

  assert.ok(entry);
  assert.equal(entry.enforcementMode, "PRODUCTION_ENFORCEMENT_BLOCKED");
  assert.ok(entry.blockedActions.includes("permission.enforce.production"));
});

test("operational gate registry is represented as read-only after ACS-REQ-06", () => {
  const entry = getAcsPermissionStateEntry("acs.operational-gate-registry");

  assert.ok(entry);
  assert.equal(entry.domain, "operational-gate-registry");
  assert.ok(entry.states.includes("READ_ALLOWED"));
  assert.ok(entry.states.includes("EXECUTION_BLOCKED"));
  assert.ok(entry.allowedActions.includes("blocked-action.check"));
});

test("Trinity, MCP, and Trading permission entries remain execution-gated", () => {
  const trinity = getAcsPermissionStateEntry("acs.trinity-intake-boundary");
  const mcp = getAcsPermissionStateEntry("acs.mcp-adapter-boundary");
  const trading = getAcsPermissionStateEntry("acs.trading-boundary");

  assert.ok(trinity?.states.includes("EXECUTION_BLOCKED"));
  assert.ok(mcp?.states.includes("EXECUTION_BLOCKED"));
  assert.ok(trading?.states.includes("EXECUTION_BLOCKED"));
});

test("Hummingbot sandbox remains policy/sandbox only with no runtime execution", () => {
  const entry = getAcsPermissionStateEntry("acs.hummingbot-sandbox-policy");

  assert.ok(entry);
  assert.ok(entry.states.includes("MOCK_ALLOWED"));
  assert.ok(entry.blockedActions.includes("hummingbot.runtime.execute"));
});

test("secrets and credentials block real issue, read, and use", () => {
  const entry = getAcsPermissionStateEntry("acs.secrets-credentials");

  assert.ok(entry);
  assert.ok(entry.blockedActions.includes("credentials.issue.real"));
  assert.ok(entry.blockedActions.includes("credentials.read.secret"));
  assert.ok(entry.blockedActions.includes("credentials.use.production"));
});

test("wallet/signing states are blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.wallet-signing");

  assert.ok(entry);
  assert.ok(entry.states.includes("SIGNING_BLOCKED"));
  assert.ok(entry.blockedActions.includes("wallet.sign.real"));
});

test("treasury states are blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.treasury");

  assert.ok(entry);
  assert.deepEqual(entry.states, ["TREASURY_BLOCKED"]);
});

test("settlement states are blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.settlement");

  assert.ok(entry);
  assert.deepEqual(entry.states, ["SETTLEMENT_BLOCKED"]);
});

test("billing execution states are blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.billing-execution");

  assert.ok(entry);
  assert.ok(entry.states.includes("EXECUTION_BLOCKED"));
  assert.ok(entry.blockedActions.includes("billing.execute.real"));
});

test("provisioning states are blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.provisioning");

  assert.ok(entry);
  assert.deepEqual(entry.states, ["PROVISIONING_BLOCKED"]);
});

test("external provider production execution is blocked", () => {
  const entry = getAcsPermissionStateEntry("acs.external-provider-production-execution");

  assert.ok(entry);
  assert.ok(entry.blockedActions.includes("provider.external.production.execute"));
});

test("portfolio/global register mutation is blocked in the current environment", () => {
  const entry = getAcsPermissionStateEntry("acs.portfolio-global-registers");

  assert.ok(entry);
  assert.ok(entry.blockedActions.includes("portfolio.registers.mutate"));
  assert.ok(entry.blockers.some((blocker) => blocker.includes("global portfolio path unavailable")));
});

test("permission read functions do not mutate fixture data", () => {
  const fixtures = createAcsPermissionStateFixtures();
  const listed = listAcsPermissionStateEntries(fixtures);

  listed[0].states.push("CONFIG_ALLOWED");
  listed[0].allowedActions.push("mutation-attempt");
  listed[0].blockedActions.push("mutation-attempt");
  listed[0].evidence.push("mutation-attempt");
  listed[0].blockers.push("mutation-attempt");

  assert.equal(fixtures[0].states.includes("CONFIG_ALLOWED"), false);
  assert.equal(fixtures[0].allowedActions.includes("mutation-attempt"), false);
  assert.equal(fixtures[0].blockedActions.includes("mutation-attempt"), false);
  assert.equal(fixtures[0].evidence.includes("mutation-attempt"), false);
  assert.equal(fixtures[0].blockers.includes("mutation-attempt"), false);
});

test("permission summary preserves non-production posture", () => {
  const summary = summarizeAcsPermissionState();

  assert.equal(summary.executionGated, true);
  assert.equal(summary.nonProduction, true);
  assert.equal(summary.mutationAuthorityAvailable, false);
  assert.equal(summary.productionEnforcementAvailable, false);
  assert.ok(summary.totalEntries >= 20);
  assert.ok(summary.states.EXECUTION_BLOCKED >= 1);
  assert.ok(summary.states.SIGNING_BLOCKED >= 1);
});

test("action check is representational only and does not imply production enforcement", () => {
  const allowed = checkAcsPermissionAction("acs.permission-state-model", "permission.check.representational");
  const blocked = checkAcsPermissionAction("acs.wallet-signing", "wallet.sign.real");

  assert.equal(allowed.representedAllowed, true);
  assert.equal(allowed.representedBlocked, false);
  assert.equal(allowed.productionEnforcement, false);
  assert.equal(allowed.executionTriggered, false);

  assert.equal(blocked.representedAllowed, false);
  assert.equal(blocked.representedBlocked, true);
  assert.equal(blocked.matchedState, "SIGNING_BLOCKED");
  assert.equal(blocked.productionEnforcement, false);
  assert.equal(blocked.executionTriggered, false);
});

test("blocked permission entries are listed correctly", () => {
  const blocked = listBlockedAcsPermissionStateEntries();

  assert.ok(blocked.length >= 10);
  assert.ok(blocked.some((entry) => entry.id === "acs.wallet-signing"));
  assert.ok(blocked.some((entry) => entry.id === "acs.treasury"));
  assert.ok(blocked.some((entry) => entry.id === "acs.provisioning"));
});
