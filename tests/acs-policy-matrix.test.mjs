import assert from "node:assert/strict";
import test from "node:test";
import {
  ACS_POLICY_MATRIX,
  evaluateCapabilityPolicy,
  getPolicyMatrixEntry,
  OPERATIONAL_STATES,
} from "../dist/index.js";

test("defines the initial ACS policy matrix capabilities", () => {
  assert.deepEqual(
    ACS_POLICY_MATRIX.map((entry) => entry.capability),
    [
      "change.leverage",
      "activate.strategy",
      "pause.bot",
      "emergency.stop",
      "validate.license",
      "validate.api",
      "change.preset",
      "suspend.user",
      "revoke.access",
      "withdraw.funds",
    ],
  );

  assert.ok(ACS_POLICY_MATRIX.every((entry) => entry.receiptRequired));
  assert.ok(ACS_POLICY_MATRIX.every((entry) => entry.telemetryRequired));
});

test("never allows withdrawal authority through ACS", () => {
  const withdraw = getPolicyMatrixEntry("withdraw.funds");

  assert.equal(withdraw.user, "never");
  assert.equal(withdraw.acs, "never");
  assert.equal(withdraw.governance, "never");
  assert.equal(withdraw.riskEngine, "never");
  assert.deepEqual(withdraw.allowedStates, []);

  for (const state of OPERATIONAL_STATES) {
    for (const actor of ["user", "acs", "governance", "risk_engine"]) {
      assert.equal(evaluateCapabilityPolicy("withdraw.funds", state, actor).allowed, false, `${state}:${actor}`);
    }
  }
});

test("allows strategy activation only by user from READY", () => {
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "READY", "user").allowed, true);
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "READY", "acs").allowed, false);
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "ACTIVE", "user").allowed, false);
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "EMERGENCY_STOP", "user").allowed, false);
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "SUSPENDED", "user").allowed, false);
  assert.equal(evaluateCapabilityPolicy("activate.strategy", "REVOKED", "user").allowed, false);
});

test("allows emergency stop by every authority from active operation", () => {
  for (const actor of ["user", "acs", "governance", "risk_engine"]) {
    assert.equal(evaluateCapabilityPolicy("emergency.stop", "ACTIVE", actor).allowed, true, actor);
  }
});

