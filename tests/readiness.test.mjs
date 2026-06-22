import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_READINESS_STATUSES,
  createAcsReadinessRegistryFixtures,
  evaluateReadinessChecklist,
  getAcsReadinessRegistryEntry,
  isAcsReadinessRegistryEntry,
  listAcsReadinessRegistryEntries,
  listBlockedAcsReadinessRegistryEntries,
  summarizeAcsReadinessRegistry,
} from "../dist/index.js";

test("reports the next blocked operational state from readiness checks", () => {
  const result = evaluateReadinessChecklist({
    walletConnected: true,
    academyCompleted: true,
    quizzesCompleted: false,
    proofOfKnowledgeValidated: false,
    neuronsEarned: false,
    licenseAttached: false,
    riskAcknowledged: false,
    apiConfigured: false,
    apiWithdrawalsDisabled: false,
    apiConnectionValidated: false,
  });

  assert.equal(result.completed, false);
  assert.equal(result.nextState, "CERTIFIED");
  assert.ok(result.blockedBy.includes("quizzes.completed"));
});

test("marks readiness complete only when every MVP gate passes", () => {
  const result = evaluateReadinessChecklist({
    walletConnected: true,
    academyCompleted: true,
    quizzesCompleted: true,
    proofOfKnowledgeValidated: true,
    neuronsEarned: true,
    licenseAttached: true,
    riskAcknowledged: true,
    apiConfigured: true,
    apiWithdrawalsDisabled: true,
    apiConnectionValidated: true,
  });

  assert.equal(result.completed, true);
  assert.equal(result.nextState, "READY");
  assert.deepEqual(result.blockedBy, []);
});

test("supports every required readiness registry status", () => {
  assert.deepEqual(ACS_READINESS_STATUSES, [
    "NOT_STARTED",
    "STRUCTURED",
    "LOCAL_VALIDATION_CANDIDATE",
    "L4_CANDIDATE",
    "L4_READINESS",
    "L4_CONSOLIDATED",
    "HOLD",
    "BLOCKED",
    "EXECUTION_GATED",
  ]);
});

test("readiness registry fixture entries validate against the runtime type guard", () => {
  const fixtures = createAcsReadinessRegistryFixtures();

  assert.ok(fixtures.length >= 13);
  assert.ok(fixtures.every((entry) => isAcsReadinessRegistryEntry(entry)));
});

test("ACS core readiness entry is not marked L4 Consolidated", () => {
  const entry = getAcsReadinessRegistryEntry("acs.core");

  assert.ok(entry);
  assert.equal(entry.status, "L4_CANDIDATE");
  assert.notEqual(entry.status, "L4_CONSOLIDATED");
  assert.equal(entry.lLevel, "L4 Candidate");
});

test("permission state model and operational gate registry are implemented as local registries", () => {
  const permissionModel = getAcsReadinessRegistryEntry("acs.permission-state-model");
  const gateRegistry = getAcsReadinessRegistryEntry("acs.operational-gate-registry");

  assert.ok(permissionModel);
  assert.equal(permissionModel.status, "LOCAL_VALIDATION_CANDIDATE");
  assert.ok(permissionModel.evidence.includes("src/permissions.ts"));

  assert.ok(gateRegistry);
  assert.equal(gateRegistry.status, "LOCAL_VALIDATION_CANDIDATE");
  assert.ok(gateRegistry.evidence.includes("src/gates.ts"));
});

test("portfolio registers and validation environment are represented as blocked in the current environment", () => {
  const portfolio = getAcsReadinessRegistryEntry("acs.portfolio-global-registers");
  const validation = getAcsReadinessRegistryEntry("acs.local-validation-environment");

  assert.ok(portfolio);
  assert.equal(portfolio.status, "BLOCKED");
  assert.ok(portfolio.blockers.some((blocker) => blocker.includes("global portfolio path unavailable")));

  assert.ok(validation);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.blockers.includes("NOT_EXECUTED_ENVIRONMENT_BLOCKER"));
});

test("readiness registry read functions do not mutate fixture data", () => {
  const fixtures = createAcsReadinessRegistryFixtures();
  const listed = listAcsReadinessRegistryEntries(fixtures);

  listed[0].evidence.push("mutation-attempt");
  listed[0].blockers.push("mutation-attempt");

  assert.equal(fixtures[0].evidence.includes("mutation-attempt"), false);
  assert.equal(fixtures[0].blockers.includes("mutation-attempt"), false);
});

test("blocked readiness entries are listed correctly", () => {
  const blocked = listBlockedAcsReadinessRegistryEntries();

  assert.ok(blocked.length >= 2);
  assert.ok(blocked.every((entry) => entry.status === "BLOCKED"));
  assert.ok(blocked.some((entry) => entry.id === "acs.portfolio-global-registers"));
  assert.ok(blocked.some((entry) => entry.id === "acs.local-validation-environment"));
});

test("readiness registry summary preserves execution-gated and non-production posture", () => {
  const summary = summarizeAcsReadinessRegistry();

  assert.equal(summary.executionGated, true);
  assert.equal(summary.nonProduction, true);
  assert.equal(summary.mutationAuthorityAvailable, false);
  assert.equal(summary.l4Consolidated, false);
  assert.ok(summary.totalEntries >= 13);
  assert.ok(summary.statuses.L4_CANDIDATE >= 1);
  assert.ok(summary.statuses.BLOCKED >= 2);
});
