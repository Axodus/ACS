import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createHummingbotSandboxDisablePilotFixture,
  createHummingbotSandboxInvalidRemoveFixture,
  createHummingbotSandboxRemovePilotFixture,
  evaluateHummingbotSandboxLifecycleTransition,
  getHummingbotSandboxLifecycleStates,
} from "../dist/index.js";

const sandboxRoot = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-sandbox");
const docsPath = join(process.cwd(), ".instructions", "ACS_HUMMINGBOT_STRATEGY_REMOVE_DISABLE_LIFECYCLE.md");
const strategyPath = join(sandboxRoot, "strategies", "acs_rsi_sandbox_pilot.py");
const disablePilotPath = join(sandboxRoot, "proposals", "acs-rsi-sandbox-disable-pilot.json");
const removePilotPath = join(sandboxRoot, "proposals", "acs-rsi-sandbox-remove-pilot.json");
const lifecycleProofPath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-lifecycle-proof.md");
const rollbackVerificationPath = join(sandboxRoot, "rollback", "acs-rsi-sandbox-remove-rollback-verification.json");
const consolePath = join(sandboxRoot, "console", "acs-rsi-sandbox-lifecycle-console.txt");

test("Hummingbot sandbox lifecycle states are modeled in order", () => {
  assert.deepEqual(getHummingbotSandboxLifecycleStates(), [
    "proposed",
    "approved_for_sandbox",
    "created",
    "edited",
    "disabled",
    "removed",
    "rolled_back",
    "archived",
  ]);
});

test("disable pilot is allowed from created state and preferred before remove", () => {
  const decision = evaluateHummingbotSandboxLifecycleTransition(createHummingbotSandboxDisablePilotFixture());
  const pilot = JSON.parse(readFileSync(disablePilotPath, "utf8"));

  assert.equal(decision.allowed, true);
  assert.equal(decision.to, "disabled");
  assert.equal(pilot.fromState, "created");
  assert.equal(pilot.toState, "disabled");
  assert.equal(pilot.preferredOverRemove, true);
  assert.equal(pilot.physicalFileDeleted, false);
  assert.equal(pilot.realRuntimeTouched, false);
});

test("remove requires disabled state, high risk, rollback plan, and evidence preservation", () => {
  const allowed = evaluateHummingbotSandboxLifecycleTransition(createHummingbotSandboxRemovePilotFixture());
  const invalid = evaluateHummingbotSandboxLifecycleTransition(createHummingbotSandboxInvalidRemoveFixture());
  const pilot = JSON.parse(readFileSync(removePilotPath, "utf8"));

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.to, "removed");
  assert.equal(allowed.reasonCodes.includes("rollback_plan_present"), true);
  assert.equal(allowed.reasonCodes.includes("evidence_preserved"), true);
  assert.equal(invalid.allowed, false);
  assert.equal(invalid.blockedReason, "invalid_lifecycle_transition");

  assert.equal(pilot.fromState, "disabled");
  assert.equal(pilot.toState, "removed");
  assert.equal(pilot.removeMode, "logical_tombstone");
  assert.equal(pilot.riskLevel, "high");
  assert.equal(pilot.rollbackPlanPresent, true);
  assert.equal(pilot.auditEvidencePreserved, true);
  assert.equal(pilot.physicalFileDeleted, false);
  assert.equal(pilot.realRuntimeTouched, false);
});

test("remove pilot preserves original strategy and evidence files", () => {
  const pilot = JSON.parse(readFileSync(removePilotPath, "utf8"));

  assert.equal(existsSync(strategyPath), true);
  for (const evidenceFile of pilot.evidenceFilesPreserved) {
    assert.equal(existsSync(join(process.cwd(), evidenceFile)), true, evidenceFile);
  }
});

test("rollback verification confirms sandbox-only lifecycle rollback", () => {
  const rollback = JSON.parse(readFileSync(rollbackVerificationPath, "utf8"));

  assert.equal(rollback.fromState, "removed");
  assert.equal(rollback.toState, "rolled_back");
  assert.equal(rollback.rollbackWorks, true);
  assert.equal(rollback.strategyFileStillPresent, true);
  assert.equal(rollback.evidenceStillPresent, true);
  assert.equal(rollback.liveRollbackTargetAllowed, false);
  assert.equal(rollback.realRuntimeTouched, false);
});

test("proof and console confirm runtime real remains untouched", () => {
  const proof = readFileSync(lifecycleProofPath, "utf8");
  const consoleSnapshot = readFileSync(consolePath, "utf8");
  const docs = readFileSync(docsPath, "utf8");
  const schema = readFileSync(join(process.cwd(), "src", "schemas", "hummingbot-sandbox-lifecycle.schema.yaml"), "utf8");

  assert.match(proof, /Remove does not touch real runtime/);
  assert.match(proof, /Remove does not delete the sandbox evidence files/);
  assert.match(consoleSnapshot, /realRuntimeTouched=false/);
  assert.match(consoleSnapshot, /strategyFileStillPresent=true/);
  assert.match(docs, /`disable` is preferred before `remove`/);
  assert.match(schema, /removeRequiresRollbackPlan/);
});
