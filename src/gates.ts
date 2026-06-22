import { createAcsBlockedActionFixtures, createAcsOperationalGateFixtures } from "./fixtures/acs-operational-gate-fixtures.js";

export const ACS_OPERATIONAL_GATE_STATUSES = [
  "CLOSED",
  "BLOCKED",
  "EXECUTION_GATED",
  "READ_ONLY_ALLOWED",
] as const;

export type AcsOperationalGateStatus = (typeof ACS_OPERATIONAL_GATE_STATUSES)[number];

export const ACS_OPERATIONAL_GATE_DOMAINS = [
  "operational-gate-registry",
  "wallet-signing",
  "treasury",
  "trading-execution",
  "settlement",
  "billing-execution",
  "acs-provisioning",
  "credentials",
  "production-database",
  "external-provider-production",
  "payouts",
  "smart-contract-mutation",
  "production-api-mutation",
  "production-permission-enforcement",
  "production-state-mutation",
  "portfolio-global-register-mutation",
] as const;

export type AcsOperationalGateDomain = (typeof ACS_OPERATIONAL_GATE_DOMAINS)[number];

export const ACS_OPERATIONAL_GATE_AUTHORITY_CLASSES = [
  "MAY_REPRESENT",
  "MAY_EXPOSE_READ_ONLY",
  "MAY_BLOCK_OR_SIGNAL",
  "MUST_NOT_EXECUTE",
] as const;

export type AcsOperationalGateAuthorityClass = (typeof ACS_OPERATIONAL_GATE_AUTHORITY_CLASSES)[number];

export const ACS_OPERATIONAL_GATE_ENFORCEMENT_MODES = [
  "REPRESENTATIONAL_ONLY",
  "LOCAL_BLOCK_SIGNAL",
  "PRODUCTION_ENFORCEMENT_BLOCKED",
] as const;

export type AcsOperationalGateEnforcementMode = (typeof ACS_OPERATIONAL_GATE_ENFORCEMENT_MODES)[number];

export interface AcsOperationalGate {
  readonly id: string;
  readonly name: string;
  readonly domain: AcsOperationalGateDomain;
  readonly status: AcsOperationalGateStatus;
  readonly authorityClass: AcsOperationalGateAuthorityClass;
  readonly enforcementMode: AcsOperationalGateEnforcementMode;
  readonly summary: string;
  readonly blockedActions: readonly string[];
  readonly allowedRepresentations: readonly string[];
  readonly prohibitedExecutions: readonly string[];
  readonly evidence: readonly string[];
  readonly blockers: readonly string[];
  readonly lastUpdated: string;
  readonly source: string;
}

export interface AcsBlockedAction {
  readonly id: string;
  readonly domain: AcsOperationalGateDomain;
  readonly status: "BLOCKED";
  readonly gateId: string;
  readonly summary: string;
  readonly allowedRepresentation: readonly string[];
  readonly blockedExecution: readonly string[];
  readonly reason: string;
  readonly evidence: readonly string[];
  readonly futureUnblockGate: "OUT_OF_SCOPE_FOR_ACS_EPIC_01";
  readonly lastUpdated: string;
  readonly source: string;
}

export interface AcsOperationalGateSummary {
  readonly totalGates: number;
  readonly blockedActionCount: number;
  readonly closedGates: number;
  readonly blockedGates: number;
  readonly executionGatedGates: number;
  readonly executionGated: true;
  readonly nonProduction: true;
  readonly mutationAuthorityAvailable: false;
  readonly productionEnforcementAvailable: false;
  readonly statuses: Readonly<Record<AcsOperationalGateStatus, number>>;
  readonly domains: readonly AcsOperationalGateDomain[];
  readonly warnings: readonly string[];
}

export interface AcsBlockedActionCheckResult {
  readonly actionFound: boolean;
  readonly actionId: string;
  readonly gateId: string;
  readonly domain: AcsOperationalGateDomain;
  readonly status: "BLOCKED";
  readonly representedBlocked: true;
  readonly productionEnforcement: false;
  readonly executionTriggered: false;
  readonly summary: string;
}

const CLOSED_OR_BLOCKED_GATE_STATUSES = new Set<AcsOperationalGateStatus>([
  "CLOSED",
  "BLOCKED",
  "EXECUTION_GATED",
]);

export function isAcsOperationalGateStatus(value: string): value is AcsOperationalGateStatus {
  return (ACS_OPERATIONAL_GATE_STATUSES as readonly string[]).includes(value);
}

export function isAcsOperationalGateDomain(value: string): value is AcsOperationalGateDomain {
  return (ACS_OPERATIONAL_GATE_DOMAINS as readonly string[]).includes(value);
}

export function isAcsOperationalGateAuthorityClass(value: string): value is AcsOperationalGateAuthorityClass {
  return (ACS_OPERATIONAL_GATE_AUTHORITY_CLASSES as readonly string[]).includes(value);
}

export function isAcsOperationalGateEnforcementMode(value: string): value is AcsOperationalGateEnforcementMode {
  return (ACS_OPERATIONAL_GATE_ENFORCEMENT_MODES as readonly string[]).includes(value);
}

export function isAcsOperationalGate(value: unknown): value is AcsOperationalGate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const gate = value as Partial<AcsOperationalGate>;
  return typeof gate.id === "string"
    && typeof gate.name === "string"
    && typeof gate.domain === "string"
    && isAcsOperationalGateDomain(gate.domain)
    && typeof gate.status === "string"
    && isAcsOperationalGateStatus(gate.status)
    && typeof gate.authorityClass === "string"
    && isAcsOperationalGateAuthorityClass(gate.authorityClass)
    && typeof gate.enforcementMode === "string"
    && isAcsOperationalGateEnforcementMode(gate.enforcementMode)
    && typeof gate.summary === "string"
    && Array.isArray(gate.blockedActions)
    && gate.blockedActions.every((action) => typeof action === "string")
    && Array.isArray(gate.allowedRepresentations)
    && gate.allowedRepresentations.every((item) => typeof item === "string")
    && Array.isArray(gate.prohibitedExecutions)
    && gate.prohibitedExecutions.every((item) => typeof item === "string")
    && Array.isArray(gate.evidence)
    && gate.evidence.every((item) => typeof item === "string")
    && Array.isArray(gate.blockers)
    && gate.blockers.every((item) => typeof item === "string")
    && typeof gate.lastUpdated === "string"
    && typeof gate.source === "string";
}

export function isAcsBlockedAction(value: unknown): value is AcsBlockedAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const action = value as Partial<AcsBlockedAction>;
  return typeof action.id === "string"
    && typeof action.domain === "string"
    && isAcsOperationalGateDomain(action.domain)
    && action.status === "BLOCKED"
    && typeof action.gateId === "string"
    && typeof action.summary === "string"
    && Array.isArray(action.allowedRepresentation)
    && action.allowedRepresentation.every((item) => typeof item === "string")
    && Array.isArray(action.blockedExecution)
    && action.blockedExecution.every((item) => typeof item === "string")
    && typeof action.reason === "string"
    && Array.isArray(action.evidence)
    && action.evidence.every((item) => typeof item === "string")
    && action.futureUnblockGate === "OUT_OF_SCOPE_FOR_ACS_EPIC_01"
    && typeof action.lastUpdated === "string"
    && typeof action.source === "string";
}

export function listAcsOperationalGates(
  gates: readonly AcsOperationalGate[] = createAcsOperationalGateFixtures(),
): readonly AcsOperationalGate[] {
  return gates.map(cloneAcsOperationalGate);
}

export function getAcsOperationalGate(
  id: string,
  gates: readonly AcsOperationalGate[] = createAcsOperationalGateFixtures(),
): AcsOperationalGate | undefined {
  const gate = gates.find((candidate) => candidate.id === id);
  return gate ? cloneAcsOperationalGate(gate) : undefined;
}

export function listAcsOperationalGatesByDomain(
  domain: AcsOperationalGateDomain,
  gates: readonly AcsOperationalGate[] = createAcsOperationalGateFixtures(),
): readonly AcsOperationalGate[] {
  return gates.filter((gate) => gate.domain === domain).map(cloneAcsOperationalGate);
}

export function listBlockedOrClosedAcsOperationalGates(
  gates: readonly AcsOperationalGate[] = createAcsOperationalGateFixtures(),
): readonly AcsOperationalGate[] {
  return gates
    .filter((gate) => CLOSED_OR_BLOCKED_GATE_STATUSES.has(gate.status))
    .map(cloneAcsOperationalGate);
}

export function listAcsBlockedActions(
  actions: readonly AcsBlockedAction[] = createAcsBlockedActionFixtures(),
): readonly AcsBlockedAction[] {
  return actions.map(cloneAcsBlockedAction);
}

export function getAcsBlockedAction(
  id: string,
  actions: readonly AcsBlockedAction[] = createAcsBlockedActionFixtures(),
): AcsBlockedAction | undefined {
  const action = actions.find((candidate) => candidate.id === id);
  return action ? cloneAcsBlockedAction(action) : undefined;
}

export function listAcsBlockedActionsByDomain(
  domain: AcsOperationalGateDomain,
  actions: readonly AcsBlockedAction[] = createAcsBlockedActionFixtures(),
): readonly AcsBlockedAction[] {
  return actions
    .filter((action) => action.domain === domain)
    .map(cloneAcsBlockedAction);
}

export function summarizeAcsOperationalGates(
  gates: readonly AcsOperationalGate[] = createAcsOperationalGateFixtures(),
  actions: readonly AcsBlockedAction[] = createAcsBlockedActionFixtures(),
): AcsOperationalGateSummary {
  const counts = Object.fromEntries(
    ACS_OPERATIONAL_GATE_STATUSES.map((status) => [status, 0]),
  ) as Record<AcsOperationalGateStatus, number>;

  for (const gate of gates) {
    counts[gate.status] += 1;
  }

  return {
    totalGates: gates.length,
    blockedActionCount: actions.length,
    closedGates: gates.filter((gate) => gate.status === "CLOSED").length,
    blockedGates: gates.filter((gate) => gate.status === "BLOCKED").length,
    executionGatedGates: gates.filter((gate) => gate.status === "EXECUTION_GATED").length,
    executionGated: true,
    nonProduction: true,
    mutationAuthorityAvailable: false,
    productionEnforcementAvailable: false,
    statuses: counts,
    domains: [...new Set(gates.map((gate) => gate.domain))].sort() as readonly AcsOperationalGateDomain[],
    warnings: [
      "ACS operational gate registry is local/config-first and read-only in this phase.",
      "All critical execution gates remain closed, blocked, or execution-gated.",
    ],
  };
}

export function checkAcsBlockedAction(
  id: string,
  actions: readonly AcsBlockedAction[] = createAcsBlockedActionFixtures(),
): AcsBlockedActionCheckResult {
  const action = actions.find((candidate) => candidate.id === id);
  if (!action) {
    return {
      actionFound: false,
      actionId: id,
      gateId: "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
      domain: "operational-gate-registry",
      status: "BLOCKED",
      representedBlocked: true,
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Blocked action not found; action remains blocked by default in the current phase.",
    };
  }

  return {
    actionFound: true,
    actionId: action.id,
    gateId: action.gateId,
    domain: action.domain,
    status: "BLOCKED",
    representedBlocked: true,
    productionEnforcement: false,
    executionTriggered: false,
    summary: "Blocked action is represented as blocked and this check does not imply production enforcement.",
  };
}

function cloneAcsOperationalGate(gate: AcsOperationalGate): AcsOperationalGate {
  return {
    ...gate,
    blockedActions: [...gate.blockedActions],
    allowedRepresentations: [...gate.allowedRepresentations],
    prohibitedExecutions: [...gate.prohibitedExecutions],
    evidence: [...gate.evidence],
    blockers: [...gate.blockers],
  };
}

function cloneAcsBlockedAction(action: AcsBlockedAction): AcsBlockedAction {
  return {
    ...action,
    allowedRepresentation: [...action.allowedRepresentation],
    blockedExecution: [...action.blockedExecution],
    evidence: [...action.evidence],
  };
}
