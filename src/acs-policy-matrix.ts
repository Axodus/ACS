import type { OperationalActor, OperationalState } from "./operational-state.js";
import { evaluateStrategyActivation, TERMINAL_RESTRICTED_STATES } from "./operational-state.js";
import type { PolicyDecision } from "./types.js";

export type AcsPolicyAuthority = "user" | "acs" | "governance" | "risk_engine";

export type AcsPolicyPermission = "yes" | "partial" | "no" | "never";

export type AcsCapabilityId =
  | "change.leverage"
  | "activate.strategy"
  | "pause.bot"
  | "emergency.stop"
  | "validate.license"
  | "validate.api"
  | "change.preset"
  | "suspend.user"
  | "revoke.access"
  | "withdraw.funds";

export interface AcsPolicyMatrixEntry {
  readonly capability: AcsCapabilityId;
  readonly label: string;
  readonly user: AcsPolicyPermission;
  readonly acs: AcsPolicyPermission;
  readonly governance: AcsPolicyPermission;
  readonly riskEngine: AcsPolicyPermission;
  readonly allowedStates: readonly OperationalState[];
  readonly receiptRequired: boolean;
  readonly telemetryRequired: boolean;
  readonly notes: string;
}

export const ACS_POLICY_MATRIX: readonly AcsPolicyMatrixEntry[] = [
  {
    capability: "change.leverage",
    label: "Change leverage",
    user: "partial",
    acs: "no",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["READY", "PAUSED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "User may request changes only inside governance-approved and risk-approved bounds.",
  },
  {
    capability: "activate.strategy",
    label: "Activate strategy",
    user: "yes",
    acs: "no",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["READY"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Activation requires user confirmation and current READY state.",
  },
  {
    capability: "pause.bot",
    label: "Pause bot",
    user: "yes",
    acs: "yes",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["ACTIVE", "READY", "RISK_RESTRICTED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Pause is a protective action and may be initiated by any authority.",
  },
  {
    capability: "emergency.stop",
    label: "Emergency stop",
    user: "yes",
    acs: "yes",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["API_VALIDATED", "RISK_RESTRICTED", "READY", "ACTIVE", "PAUSED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Emergency stop must be fast, auditable, and never blocked by convenience logic.",
  },
  {
    capability: "validate.license",
    label: "Validate license",
    user: "partial",
    acs: "yes",
    governance: "yes",
    riskEngine: "no",
    allowedStates: ["CERTIFIED", "LICENSED", "API_PENDING", "API_VALIDATED", "READY", "ACTIVE", "PAUSED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "ACS may validate ownership and status; governance defines license rules.",
  },
  {
    capability: "validate.api",
    label: "Validate API",
    user: "partial",
    acs: "yes",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["LICENSED", "API_PENDING", "API_VALIDATED", "RISK_RESTRICTED", "READY", "PAUSED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "API validation must reject withdrawal permissions and unsafe access.",
  },
  {
    capability: "change.preset",
    label: "Change preset",
    user: "yes",
    acs: "no",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["API_VALIDATED", "RISK_RESTRICTED", "READY", "PAUSED"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Public users default to conservative presets unless governance and risk policy allow otherwise.",
  },
  {
    capability: "suspend.user",
    label: "Suspend user",
    user: "no",
    acs: "partial",
    governance: "yes",
    riskEngine: "yes",
    allowedStates: ["API_VALIDATED", "RISK_RESTRICTED", "READY", "ACTIVE", "PAUSED", "EMERGENCY_STOP"],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Suspension requires documented policy, risk, or governance basis.",
  },
  {
    capability: "revoke.access",
    label: "Revoke access",
    user: "no",
    acs: "no",
    governance: "yes",
    riskEngine: "partial",
    allowedStates: [
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
    ],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "Revocation is a governance/license authority action, with risk engine evidence allowed.",
  },
  {
    capability: "withdraw.funds",
    label: "Withdraw funds",
    user: "never",
    acs: "never",
    governance: "never",
    riskEngine: "never",
    allowedStates: [],
    receiptRequired: true,
    telemetryRequired: true,
    notes: "ACS never withdraws funds and must reject any withdrawal capability.",
  },
];

export function getPolicyMatrixEntry(capability: AcsCapabilityId): AcsPolicyMatrixEntry {
  const entry = ACS_POLICY_MATRIX.find((candidate) => candidate.capability === capability);
  if (!entry) {
    throw new Error(`unknown ACS capability: ${capability}`);
  }

  return entry;
}

export function evaluateCapabilityPolicy(
  capability: AcsCapabilityId,
  state: OperationalState,
  actor: OperationalActor,
): PolicyDecision {
  const entry = getPolicyMatrixEntry(capability);
  const permission = getAuthorityPermission(entry, actor);

  if (permission === "never") {
    return { allowed: false, reason: `${entry.label} is never allowed for ${actor}` };
  }

  if (permission === "no") {
    return { allowed: false, reason: `${entry.label} is not allowed for ${actor}` };
  }

  if (TERMINAL_RESTRICTED_STATES.includes(state) && capability === "activate.strategy") {
    return { allowed: false, reason: `${entry.label} is blocked in ${state}` };
  }

  if (!entry.allowedStates.includes(state)) {
    return { allowed: false, reason: `${entry.label} is not allowed from ${state}` };
  }

  if (capability === "activate.strategy") {
    return evaluateStrategyActivation(state);
  }

  return { allowed: true };
}

function getAuthorityPermission(entry: AcsPolicyMatrixEntry, actor: OperationalActor): AcsPolicyPermission {
  if (actor === "risk_engine") {
    return entry.riskEngine;
  }

  if (actor === "system") {
    return entry.acs;
  }

  return entry[actor];
}

