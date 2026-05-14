import type { PolicyDecision } from "./types.js";

export const OPERATIONAL_STATES = [
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
] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

export type OperationalActor = "user" | "acs" | "governance" | "risk_engine" | "system";

export interface OperationalTransition {
  readonly from: OperationalState;
  readonly to: OperationalState;
  readonly initiatedBy: readonly OperationalActor[];
  readonly reversible: boolean;
  readonly reason: string;
}

export const ACTIVATION_BLOCKING_STATES: readonly OperationalState[] = [
  "UNINITIALIZED",
  "LEARNING",
  "CERTIFIED",
  "LICENSED",
  "API_PENDING",
  "API_VALIDATED",
  "RISK_RESTRICTED",
  "PAUSED",
  "EMERGENCY_STOP",
  "SUSPENDED",
  "REVOKED",
];

export const TERMINAL_RESTRICTED_STATES: readonly OperationalState[] = [
  "EMERGENCY_STOP",
  "SUSPENDED",
  "REVOKED",
];

export const OPERATIONAL_TRANSITIONS: readonly OperationalTransition[] = [
  {
    from: "UNINITIALIZED",
    to: "LEARNING",
    initiatedBy: ["user", "acs"],
    reversible: false,
    reason: "user starts the Axodus learning path",
  },
  {
    from: "LEARNING",
    to: "CERTIFIED",
    initiatedBy: ["acs"],
    reversible: false,
    reason: "required Academy and Proof of Knowledge checks are complete",
  },
  {
    from: "CERTIFIED",
    to: "LICENSED",
    initiatedBy: ["user", "acs"],
    reversible: true,
    reason: "required NFT license is attached and valid",
  },
  {
    from: "LICENSED",
    to: "API_PENDING",
    initiatedBy: ["user"],
    reversible: true,
    reason: "user starts exchange API setup",
  },
  {
    from: "API_PENDING",
    to: "API_VALIDATED",
    initiatedBy: ["acs"],
    reversible: true,
    reason: "exchange API passes safety validation",
  },
  {
    from: "API_VALIDATED",
    to: "RISK_RESTRICTED",
    initiatedBy: ["risk_engine", "governance"],
    reversible: true,
    reason: "risk policy allows only restricted operation",
  },
  {
    from: "API_VALIDATED",
    to: "READY",
    initiatedBy: ["acs", "risk_engine"],
    reversible: true,
    reason: "readiness, license, API, and risk checks are satisfied",
  },
  {
    from: "RISK_RESTRICTED",
    to: "READY",
    initiatedBy: ["risk_engine", "governance"],
    reversible: true,
    reason: "risk restrictions are cleared",
  },
  {
    from: "READY",
    to: "ACTIVE",
    initiatedBy: ["user"],
    reversible: true,
    reason: "user confirms strategy activation inside policy limits",
  },
  {
    from: "ACTIVE",
    to: "PAUSED",
    initiatedBy: ["user", "acs", "risk_engine", "governance"],
    reversible: true,
    reason: "trading automation is paused without revoking eligibility",
  },
  {
    from: "PAUSED",
    to: "ACTIVE",
    initiatedBy: ["user"],
    reversible: true,
    reason: "user resumes after policy checks remain valid",
  },
  {
    from: "ACTIVE",
    to: "RISK_RESTRICTED",
    initiatedBy: ["risk_engine", "governance"],
    reversible: true,
    reason: "risk limits require restricted operation",
  },
  ...["READY", "ACTIVE", "PAUSED", "RISK_RESTRICTED", "API_VALIDATED"].map((from) => ({
    from: from as OperationalState,
    to: "EMERGENCY_STOP" as OperationalState,
    initiatedBy: ["user", "acs", "risk_engine", "governance"] as const,
    reversible: true,
    reason: "emergency stop is triggered by an authorized actor",
  })),
  ...["READY", "ACTIVE", "PAUSED", "RISK_RESTRICTED", "API_VALIDATED", "EMERGENCY_STOP"].map((from) => ({
    from: from as OperationalState,
    to: "SUSPENDED" as OperationalState,
    initiatedBy: ["acs", "risk_engine", "governance"] as const,
    reversible: true,
    reason: "eligibility, safety, or governance policy requires suspension",
  })),
  ...OPERATIONAL_STATES.filter((state) => state !== "REVOKED").map((from) => ({
    from,
    to: "REVOKED" as OperationalState,
    initiatedBy: ["governance"] as const,
    reversible: false,
    reason: "governance or license policy revokes access",
  })),
];

export function isOperationalState(value: string): value is OperationalState {
  return (OPERATIONAL_STATES as readonly string[]).includes(value);
}

export function getAllowedTransitions(from: OperationalState): readonly OperationalTransition[] {
  return OPERATIONAL_TRANSITIONS.filter((transition) => transition.from === from);
}

export function canTransition(from: OperationalState, to: OperationalState, actor: OperationalActor): boolean {
  return OPERATIONAL_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to && transition.initiatedBy.includes(actor),
  );
}

export function evaluateStrategyActivation(state: OperationalState): PolicyDecision {
  if (state !== "READY") {
    return {
      allowed: false,
      reason: `strategy activation requires READY state; current state is ${state}`,
    };
  }

  return { allowed: true };
}

