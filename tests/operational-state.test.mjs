import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVATION_BLOCKING_STATES,
  canTransition,
  evaluateStrategyActivation,
  getAllowedTransitions,
  isOperationalState,
  OPERATIONAL_STATES,
} from "../dist/index.js";

test("defines the ACS operational states as the control backbone", () => {
  assert.deepEqual(OPERATIONAL_STATES, [
    "UNINITIALIZED",
    "LEARNING",
    "CERTIFIED",
    "LICENSED",
    "API_PENDING",
    "API_VALIDATED",
    "RISK_RESTRICTED",
    "READY",
    "ACTIVE",
    "PAUSED",
    "EMERGENCY_STOP",
    "SUSPENDED",
    "REVOKED",
  ]);
  assert.equal(isOperationalState("READY"), true);
  assert.equal(isOperationalState("UNKNOWN"), false);
});

test("allows the guided readiness path and blocks unauthorized jumps", () => {
  assert.equal(canTransition("UNINITIALIZED", "LEARNING", "user"), true);
  assert.equal(canTransition("LEARNING", "CERTIFIED", "acs"), true);
  assert.equal(canTransition("CERTIFIED", "LICENSED", "user"), true);
  assert.equal(canTransition("LICENSED", "API_PENDING", "user"), true);
  assert.equal(canTransition("API_PENDING", "API_VALIDATED", "acs"), true);
  assert.equal(canTransition("API_VALIDATED", "READY", "risk_engine"), true);
  assert.equal(canTransition("UNINITIALIZED", "READY", "user"), false);
  assert.equal(canTransition("READY", "ACTIVE", "acs"), false);
});

test("blocks strategy activation outside READY state", () => {
  for (const state of ACTIVATION_BLOCKING_STATES) {
    const decision = evaluateStrategyActivation(state);
    assert.equal(decision.allowed, false, state);
  }

  assert.equal(evaluateStrategyActivation("READY").allowed, true);
});

test("exposes emergency and suspension transitions for restricted states", () => {
  assert.ok(getAllowedTransitions("ACTIVE").some((transition) => transition.to === "EMERGENCY_STOP"));
  assert.ok(getAllowedTransitions("EMERGENCY_STOP").some((transition) => transition.to === "SUSPENDED"));
  assert.ok(getAllowedTransitions("SUSPENDED").some((transition) => transition.to === "REVOKED"));
});

