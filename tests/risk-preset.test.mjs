import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePresetActivation,
  evaluateRiskLimits,
  evaluateRiskPresetSelection,
  getDefaultRiskPreset,
  getRiskPreset,
  RISK_PRESETS,
} from "../dist/index.js";

test("defines conservative as the public default risk preset", () => {
  assert.deepEqual(
    RISK_PRESETS.map((preset) => preset.id),
    ["conservative", "balanced", "experimental"],
  );
  assert.equal(getDefaultRiskPreset("public").id, "conservative");
  assert.equal(getDefaultRiskPreset("public").limits.maxCapitalUsd, 100);
  assert.equal(getDefaultRiskPreset("public").limits.maxLeverage, 1);
  assert.equal(getDefaultRiskPreset("public").limits.futuresAllowed, false);
});

test("blocks public users from selecting experimental risk preset", () => {
  const result = evaluateRiskPresetSelection({
    presetId: "experimental",
    userAudience: "public",
    operationalState: "READY",
    governanceApproved: true,
    internalValidationApproved: true,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("public users cannot select internal risk presets"));
});

test("requires governance and internal validation for balanced preset", () => {
  const blocked = evaluateRiskPresetSelection({
    presetId: "balanced",
    userAudience: "public",
    operationalState: "READY",
  });

  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reasons.includes("balanced preset requires governance approval"));
  assert.ok(blocked.reasons.includes("balanced preset requires internal validation approval"));

  const allowed = evaluateRiskPresetSelection({
    presetId: "balanced",
    userAudience: "public",
    operationalState: "READY",
    governanceApproved: true,
    internalValidationApproved: true,
  });

  assert.equal(allowed.allowed, true);
});

test("evaluates requested limits against the selected preset", () => {
  const conservative = getRiskPreset("conservative");
  const result = evaluateRiskLimits(conservative, {
    capitalUsd: 150,
    leverage: 2,
    dailyLossPercent: 3,
    drawdownPercent: 6,
    openPositions: 2,
    futuresEnabled: true,
    marginEnabled: true,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.violations.includes("capital 150 exceeds max 100"));
  assert.ok(result.violations.includes("leverage 2 exceeds max 1"));
  assert.ok(result.violations.includes("futures are not allowed by this preset"));
  assert.ok(result.violations.includes("margin is not allowed by this preset"));
});

test("combines preset selection and risk limits into an activation decision", () => {
  const selection = evaluateRiskPresetSelection({
    userAudience: "public",
    operationalState: "READY",
  });
  const limits = evaluateRiskLimits(selection.preset, {
    capitalUsd: 100,
    leverage: 1,
    dailyLossPercent: 2,
    drawdownPercent: 5,
    openPositions: 1,
    futuresEnabled: false,
    marginEnabled: false,
  });

  assert.equal(evaluatePresetActivation(selection, limits).allowed, true);
});

