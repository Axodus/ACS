import type { OperationalState } from "./operational-state.js";
import type { PolicyDecision } from "./types.js";

export type RiskPresetId = "conservative" | "balanced" | "experimental";
export type RiskPresetAudience = "public" | "internal";

export interface RiskPresetLimits {
  readonly maxCapitalUsd: number;
  readonly maxLeverage: number;
  readonly maxDailyLossPercent: number;
  readonly maxDrawdownPercent: number;
  readonly maxOpenPositions: number;
  readonly futuresAllowed: boolean;
  readonly marginAllowed: boolean;
}

export interface RiskPresetDefinition {
  readonly id: RiskPresetId;
  readonly label: string;
  readonly audience: RiskPresetAudience;
  readonly defaultForPublic: boolean;
  readonly requiresGovernanceApproval: boolean;
  readonly requiresInternalValidation: boolean;
  readonly limits: RiskPresetLimits;
  readonly userWarning: string;
}

export interface RiskPresetSelectionInput {
  readonly presetId?: RiskPresetId;
  readonly userAudience: RiskPresetAudience;
  readonly operationalState: OperationalState;
  readonly governanceApproved?: boolean;
  readonly internalValidationApproved?: boolean;
}

export interface RiskPresetSelectionResult {
  readonly allowed: boolean;
  readonly preset: RiskPresetDefinition;
  readonly reasons: readonly string[];
}

export interface RiskLimitRequest {
  readonly capitalUsd: number;
  readonly leverage: number;
  readonly dailyLossPercent: number;
  readonly drawdownPercent: number;
  readonly openPositions: number;
  readonly futuresEnabled: boolean;
  readonly marginEnabled: boolean;
}

export interface RiskLimitEvaluation {
  readonly allowed: boolean;
  readonly preset: RiskPresetDefinition;
  readonly violations: readonly string[];
}

export const RISK_PRESETS: readonly RiskPresetDefinition[] = [
  {
    id: "conservative",
    label: "Conservative",
    audience: "public",
    defaultForPublic: true,
    requiresGovernanceApproval: false,
    requiresInternalValidation: false,
    limits: {
      maxCapitalUsd: 100,
      maxLeverage: 1,
      maxDailyLossPercent: 2,
      maxDrawdownPercent: 5,
      maxOpenPositions: 1,
      futuresAllowed: false,
      marginAllowed: false,
    },
    userWarning: "Designed for small-capital, spot-only validation. No profit is promised.",
  },
  {
    id: "balanced",
    label: "Balanced",
    audience: "public",
    defaultForPublic: false,
    requiresGovernanceApproval: true,
    requiresInternalValidation: true,
    limits: {
      maxCapitalUsd: 100,
      maxLeverage: 2,
      maxDailyLossPercent: 3,
      maxDrawdownPercent: 8,
      maxOpenPositions: 2,
      futuresAllowed: true,
      marginAllowed: false,
    },
    userWarning: "Requires governance and internal validation before public use.",
  },
  {
    id: "experimental",
    label: "Experimental",
    audience: "internal",
    defaultForPublic: false,
    requiresGovernanceApproval: true,
    requiresInternalValidation: true,
    limits: {
      maxCapitalUsd: 100,
      maxLeverage: 3,
      maxDailyLossPercent: 5,
      maxDrawdownPercent: 12,
      maxOpenPositions: 3,
      futuresAllowed: true,
      marginAllowed: false,
    },
    userWarning: "Internal validation only. Not available for public users.",
  },
];

export function getRiskPreset(presetId: RiskPresetId): RiskPresetDefinition {
  const preset = RISK_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new Error(`unknown risk preset: ${presetId}`);
  }

  return preset;
}

export function getDefaultRiskPreset(audience: RiskPresetAudience): RiskPresetDefinition {
  if (audience === "public") {
    return getRiskPreset("conservative");
  }

  return getRiskPreset("experimental");
}

export function evaluateRiskPresetSelection(input: RiskPresetSelectionInput): RiskPresetSelectionResult {
  const preset = input.presetId ? getRiskPreset(input.presetId) : getDefaultRiskPreset(input.userAudience);
  const reasons: string[] = [];

  if (!["API_VALIDATED", "RISK_RESTRICTED", "READY", "PAUSED"].includes(input.operationalState)) {
    reasons.push(`risk preset selection is not allowed from ${input.operationalState}`);
  }

  if (input.userAudience === "public" && preset.audience === "internal") {
    reasons.push("public users cannot select internal risk presets");
  }

  if (preset.requiresGovernanceApproval && input.governanceApproved !== true) {
    reasons.push(`${preset.id} preset requires governance approval`);
  }

  if (preset.requiresInternalValidation && input.internalValidationApproved !== true) {
    reasons.push(`${preset.id} preset requires internal validation approval`);
  }

  return {
    allowed: reasons.length === 0,
    preset,
    reasons,
  };
}

export function evaluateRiskLimits(preset: RiskPresetDefinition, request: RiskLimitRequest): RiskLimitEvaluation {
  const violations: string[] = [];

  if (request.capitalUsd > preset.limits.maxCapitalUsd) {
    violations.push(`capital ${request.capitalUsd} exceeds max ${preset.limits.maxCapitalUsd}`);
  }

  if (request.leverage > preset.limits.maxLeverage) {
    violations.push(`leverage ${request.leverage} exceeds max ${preset.limits.maxLeverage}`);
  }

  if (request.dailyLossPercent > preset.limits.maxDailyLossPercent) {
    violations.push(`daily loss ${request.dailyLossPercent}% exceeds max ${preset.limits.maxDailyLossPercent}%`);
  }

  if (request.drawdownPercent > preset.limits.maxDrawdownPercent) {
    violations.push(`drawdown ${request.drawdownPercent}% exceeds max ${preset.limits.maxDrawdownPercent}%`);
  }

  if (request.openPositions > preset.limits.maxOpenPositions) {
    violations.push(`open positions ${request.openPositions} exceeds max ${preset.limits.maxOpenPositions}`);
  }

  if (request.futuresEnabled && !preset.limits.futuresAllowed) {
    violations.push("futures are not allowed by this preset");
  }

  if (request.marginEnabled && !preset.limits.marginAllowed) {
    violations.push("margin is not allowed by this preset");
  }

  return {
    allowed: violations.length === 0,
    preset,
    violations,
  };
}

export function evaluatePresetActivation(
  selection: RiskPresetSelectionResult,
  limits: RiskLimitEvaluation,
): PolicyDecision {
  if (!selection.allowed) {
    return { allowed: false, reason: selection.reasons.join("; ") };
  }

  if (!limits.allowed) {
    return { allowed: false, reason: limits.violations.join("; ") };
  }

  return { allowed: true };
}

