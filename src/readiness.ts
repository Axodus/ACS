import type { OperationalState } from "./operational-state.js";
import { createAcsReadinessRegistryFixtures } from "./fixtures/acs-readiness-fixtures.js";

export type ReadinessCheckId =
  | "wallet.connected"
  | "academy.completed"
  | "quizzes.completed"
  | "proof.validated"
  | "neurons.earned"
  | "license.attached"
  | "risk.acknowledged"
  | "api.configured"
  | "api.withdrawals.disabled"
  | "api.connection.validated";

export interface ReadinessChecklistInput {
  readonly walletConnected: boolean;
  readonly academyCompleted: boolean;
  readonly quizzesCompleted: boolean;
  readonly proofOfKnowledgeValidated: boolean;
  readonly neuronsEarned: boolean;
  readonly licenseAttached: boolean;
  readonly riskAcknowledged: boolean;
  readonly apiConfigured: boolean;
  readonly apiWithdrawalsDisabled: boolean;
  readonly apiConnectionValidated: boolean;
}

export interface ReadinessCheck {
  readonly id: ReadinessCheckId;
  readonly label: string;
  readonly completed: boolean;
  readonly requiredForState: OperationalState;
}

export interface ReadinessChecklistResult {
  readonly checks: readonly ReadinessCheck[];
  readonly completed: boolean;
  readonly nextState: OperationalState;
  readonly blockedBy: readonly ReadinessCheckId[];
}

export const ACS_READINESS_STATUSES = [
  "NOT_STARTED",
  "STRUCTURED",
  "LOCAL_VALIDATION_CANDIDATE",
  "L4_CANDIDATE",
  "L4_READINESS",
  "L4_CONSOLIDATED",
  "HOLD",
  "BLOCKED",
  "EXECUTION_GATED",
] as const;

export type AcsReadinessStatus = (typeof ACS_READINESS_STATUSES)[number];

export const ACS_READINESS_DOMAINS = [
  "acs.core",
  "readiness.registry",
  "permission-state-model",
  "operational-gate-registry",
  "inspection-api",
  "trinity-boundary",
  "mcp-boundary",
  "trading-boundary",
  "axodusapp-preview",
  "business-alignment",
  "marketplace-alignment",
  "governance-alignment",
  "portfolio-global-registers",
  "local-validation-environment",
] as const;

export type AcsReadinessDomain = (typeof ACS_READINESS_DOMAINS)[number];

export const ACS_READINESS_ALLOWED_AUTHORITIES = [
  "represent",
  "expose_read_only",
  "block_or_signal",
] as const;

export type AcsReadinessAllowedAuthority = (typeof ACS_READINESS_ALLOWED_AUTHORITIES)[number];

export const ACS_READINESS_PROHIBITED_AUTHORITIES = [
  "execute_real_actions",
  "mutate_production_state",
  "authorize_production_execution",
  "use_production_secrets",
] as const;

export type AcsReadinessProhibitedAuthority = (typeof ACS_READINESS_PROHIBITED_AUTHORITIES)[number];

export interface AcsReadinessRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly domain: AcsReadinessDomain;
  readonly status: AcsReadinessStatus;
  readonly lLevel?: string;
  readonly dLevel?: string;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly blockers: readonly string[];
  readonly allowedAuthority: readonly AcsReadinessAllowedAuthority[];
  readonly prohibitedAuthority: readonly AcsReadinessProhibitedAuthority[];
  readonly lastUpdated: string;
  readonly source: string;
}

export interface AcsReadinessRegistrySummary {
  readonly totalEntries: number;
  readonly blockedEntries: number;
  readonly executionGated: true;
  readonly nonProduction: true;
  readonly mutationAuthorityAvailable: false;
  readonly l4Consolidated: false;
  readonly statuses: Readonly<Record<AcsReadinessStatus, number>>;
  readonly domains: readonly AcsReadinessDomain[];
  readonly warnings: readonly string[];
}

export function isAcsReadinessStatus(value: string): value is AcsReadinessStatus {
  return (ACS_READINESS_STATUSES as readonly string[]).includes(value);
}

export function isAcsReadinessDomain(value: string): value is AcsReadinessDomain {
  return (ACS_READINESS_DOMAINS as readonly string[]).includes(value);
}

export function isAcsReadinessRegistryEntry(value: unknown): value is AcsReadinessRegistryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<AcsReadinessRegistryEntry>;
  return typeof entry.id === "string"
    && typeof entry.name === "string"
    && typeof entry.domain === "string"
    && isAcsReadinessDomain(entry.domain)
    && typeof entry.status === "string"
    && isAcsReadinessStatus(entry.status)
    && typeof entry.summary === "string"
    && Array.isArray(entry.evidence)
    && entry.evidence.every((item) => typeof item === "string")
    && Array.isArray(entry.blockers)
    && entry.blockers.every((item) => typeof item === "string")
    && Array.isArray(entry.allowedAuthority)
    && entry.allowedAuthority.every((item) => typeof item === "string" && ACS_READINESS_ALLOWED_AUTHORITIES.includes(item as AcsReadinessAllowedAuthority))
    && Array.isArray(entry.prohibitedAuthority)
    && entry.prohibitedAuthority.every((item) => typeof item === "string" && ACS_READINESS_PROHIBITED_AUTHORITIES.includes(item as AcsReadinessProhibitedAuthority))
    && typeof entry.lastUpdated === "string"
    && typeof entry.source === "string"
    && (entry.lLevel === undefined || typeof entry.lLevel === "string")
    && (entry.dLevel === undefined || typeof entry.dLevel === "string");
}

export function listAcsReadinessRegistryEntries(
  entries: readonly AcsReadinessRegistryEntry[] = createAcsReadinessRegistryFixtures(),
): readonly AcsReadinessRegistryEntry[] {
  return entries.map(cloneAcsReadinessRegistryEntry);
}

export function getAcsReadinessRegistryEntry(
  id: string,
  entries: readonly AcsReadinessRegistryEntry[] = createAcsReadinessRegistryFixtures(),
): AcsReadinessRegistryEntry | undefined {
  const entry = entries.find((candidate) => candidate.id === id);
  return entry ? cloneAcsReadinessRegistryEntry(entry) : undefined;
}

export function listAcsReadinessRegistryEntriesByDomain(
  domain: AcsReadinessDomain,
  entries: readonly AcsReadinessRegistryEntry[] = createAcsReadinessRegistryFixtures(),
): readonly AcsReadinessRegistryEntry[] {
  return entries.filter((entry) => entry.domain === domain).map(cloneAcsReadinessRegistryEntry);
}

export function listBlockedAcsReadinessRegistryEntries(
  entries: readonly AcsReadinessRegistryEntry[] = createAcsReadinessRegistryFixtures(),
): readonly AcsReadinessRegistryEntry[] {
  return entries.filter((entry) => entry.status === "BLOCKED").map(cloneAcsReadinessRegistryEntry);
}

export function summarizeAcsReadinessRegistry(
  entries: readonly AcsReadinessRegistryEntry[] = createAcsReadinessRegistryFixtures(),
): AcsReadinessRegistrySummary {
  const counts = Object.fromEntries(
    ACS_READINESS_STATUSES.map((status) => [status, 0]),
  ) as Record<AcsReadinessStatus, number>;

  for (const entry of entries) {
    counts[entry.status] += 1;
  }

  return {
    totalEntries: entries.length,
    blockedEntries: entries.filter((entry) => entry.status === "BLOCKED").length,
    executionGated: true,
    nonProduction: true,
    mutationAuthorityAvailable: false,
    l4Consolidated: false,
    statuses: counts,
    domains: [...new Set(entries.map((entry) => entry.domain))].sort() as readonly AcsReadinessDomain[],
    warnings: [
      "ACS readiness registry is local/config-first and read-only in this phase.",
      "Execution-gated and non-production posture remains preserved.",
    ],
  };
}

export function evaluateReadinessChecklist(input: ReadinessChecklistInput): ReadinessChecklistResult {
  const checks: readonly ReadinessCheck[] = [
    {
      id: "wallet.connected",
      label: "Wallet connected",
      completed: input.walletConnected,
      requiredForState: "LEARNING",
    },
    {
      id: "academy.completed",
      label: "Academy course completed",
      completed: input.academyCompleted,
      requiredForState: "CERTIFIED",
    },
    {
      id: "quizzes.completed",
      label: "Required quizzes completed",
      completed: input.quizzesCompleted,
      requiredForState: "CERTIFIED",
    },
    {
      id: "proof.validated",
      label: "Proof of Knowledge validated",
      completed: input.proofOfKnowledgeValidated,
      requiredForState: "CERTIFIED",
    },
    {
      id: "neurons.earned",
      label: "Required Neurons earned",
      completed: input.neuronsEarned,
      requiredForState: "LICENSED",
    },
    {
      id: "license.attached",
      label: "NFT license attached",
      completed: input.licenseAttached,
      requiredForState: "LICENSED",
    },
    {
      id: "risk.acknowledged",
      label: "Risk acknowledgement completed",
      completed: input.riskAcknowledged,
      requiredForState: "API_PENDING",
    },
    {
      id: "api.configured",
      label: "Exchange API configured",
      completed: input.apiConfigured,
      requiredForState: "API_PENDING",
    },
    {
      id: "api.withdrawals.disabled",
      label: "Exchange API withdrawals disabled",
      completed: input.apiWithdrawalsDisabled,
      requiredForState: "API_VALIDATED",
    },
    {
      id: "api.connection.validated",
      label: "Exchange API connection validated",
      completed: input.apiConnectionValidated,
      requiredForState: "API_VALIDATED",
    },
  ];
  const blockedBy = checks.filter((check) => !check.completed).map((check) => check.id);

  return {
    checks,
    completed: blockedBy.length === 0,
    nextState: inferNextState(checks),
    blockedBy,
  };
}

function inferNextState(checks: readonly ReadinessCheck[]): OperationalState {
  const incomplete = checks.find((check) => !check.completed);
  if (!incomplete) {
    return "READY";
  }

  return incomplete.requiredForState;
}

function cloneAcsReadinessRegistryEntry(entry: AcsReadinessRegistryEntry): AcsReadinessRegistryEntry {
  return {
    ...entry,
    evidence: [...entry.evidence],
    blockers: [...entry.blockers],
    allowedAuthority: [...entry.allowedAuthority],
    prohibitedAuthority: [...entry.prohibitedAuthority],
  };
}
