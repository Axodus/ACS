import { createAcsPermissionStateFixtures } from "./fixtures/acs-permission-fixtures.js";

export const ACS_PERMISSION_STATES = [
  "READ_ALLOWED",
  "PREVIEW_ALLOWED",
  "MOCK_ALLOWED",
  "CONFIG_ALLOWED",
  "EXECUTION_BLOCKED",
  "SIGNING_BLOCKED",
  "TREASURY_BLOCKED",
  "SETTLEMENT_BLOCKED",
  "PROVISIONING_BLOCKED",
] as const;

export type AcsPermissionState = (typeof ACS_PERMISSION_STATES)[number];

export const ACS_PERMISSION_DOMAINS = [
  "acs-core-inspection",
  "readiness-registry",
  "permission-state-model",
  "operational-gate-registry",
  "trinity-intake",
  "mcp-adapter-boundary",
  "trading-boundary",
  "hummingbot-sandbox-policy",
  "axodusapp-preview-consumer",
  "business-alignment-consumer",
  "marketplace-alignment-consumer",
  "governance-review-approval",
  "secrets-credentials",
  "wallet-signing",
  "treasury",
  "settlement",
  "billing-execution",
  "provisioning",
  "external-provider-production-execution",
  "portfolio-global-registers",
] as const;

export type AcsPermissionDomain = (typeof ACS_PERMISSION_DOMAINS)[number];

export const ACS_PERMISSION_SUBJECT_TYPES = [
  "nucleus",
  "registry",
  "module",
  "consumer",
  "boundary",
  "policy-surface",
  "security-surface",
  "approval-surface",
] as const;

export type AcsPermissionSubjectType = (typeof ACS_PERMISSION_SUBJECT_TYPES)[number];

export const ACS_PERMISSION_AUTHORITY_CLASSES = [
  "MAY_REPRESENT",
  "MAY_EXPOSE_READ_ONLY",
  "MAY_BLOCK_OR_SIGNAL",
  "MUST_NOT_EXECUTE",
] as const;

export type AcsPermissionAuthorityClass = (typeof ACS_PERMISSION_AUTHORITY_CLASSES)[number];

export const ACS_PERMISSION_ENFORCEMENT_MODES = [
  "REPRESENTATIONAL_ONLY",
  "LOCAL_BLOCK_SIGNAL",
  "PRODUCTION_ENFORCEMENT_BLOCKED",
] as const;

export type AcsPermissionEnforcementMode = (typeof ACS_PERMISSION_ENFORCEMENT_MODES)[number];

export interface AcsPermissionStateEntry {
  readonly id: string;
  readonly subject: string;
  readonly subjectType: AcsPermissionSubjectType;
  readonly resource: string;
  readonly domain: AcsPermissionDomain;
  readonly states: readonly AcsPermissionState[];
  readonly allowedActions: readonly string[];
  readonly blockedActions: readonly string[];
  readonly authorityClass: AcsPermissionAuthorityClass;
  readonly enforcementMode: AcsPermissionEnforcementMode;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly blockers: readonly string[];
  readonly lastUpdated: string;
  readonly source: string;
}

export interface AcsPermissionStateSummary {
  readonly totalEntries: number;
  readonly blockedEntries: number;
  readonly executionGated: true;
  readonly nonProduction: true;
  readonly mutationAuthorityAvailable: false;
  readonly productionEnforcementAvailable: false;
  readonly states: Readonly<Record<AcsPermissionState, number>>;
  readonly domains: readonly AcsPermissionDomain[];
  readonly warnings: readonly string[];
}

export interface AcsPermissionActionCheckResult {
  readonly entryFound: boolean;
  readonly entryId: string;
  readonly subject: string;
  readonly domain: AcsPermissionDomain;
  readonly action: string;
  readonly representedAllowed: boolean;
  readonly representedBlocked: boolean;
  readonly matchedState: AcsPermissionState;
  readonly authorityClass: AcsPermissionAuthorityClass;
  readonly enforcementMode: AcsPermissionEnforcementMode;
  readonly productionEnforcement: false;
  readonly executionTriggered: false;
  readonly summary: string;
}

const BLOCKED_PERMISSION_STATES = new Set<AcsPermissionState>([
  "SIGNING_BLOCKED",
  "TREASURY_BLOCKED",
  "SETTLEMENT_BLOCKED",
  "PROVISIONING_BLOCKED",
  "EXECUTION_BLOCKED",
]);

const ALLOWED_PERMISSION_STATES = new Set<AcsPermissionState>([
  "READ_ALLOWED",
  "PREVIEW_ALLOWED",
  "MOCK_ALLOWED",
  "CONFIG_ALLOWED",
]);

export function isAcsPermissionState(value: string): value is AcsPermissionState {
  return (ACS_PERMISSION_STATES as readonly string[]).includes(value);
}

export function isAcsPermissionDomain(value: string): value is AcsPermissionDomain {
  return (ACS_PERMISSION_DOMAINS as readonly string[]).includes(value);
}

export function isAcsPermissionSubjectType(value: string): value is AcsPermissionSubjectType {
  return (ACS_PERMISSION_SUBJECT_TYPES as readonly string[]).includes(value);
}

export function isAcsPermissionAuthorityClass(value: string): value is AcsPermissionAuthorityClass {
  return (ACS_PERMISSION_AUTHORITY_CLASSES as readonly string[]).includes(value);
}

export function isAcsPermissionEnforcementMode(value: string): value is AcsPermissionEnforcementMode {
  return (ACS_PERMISSION_ENFORCEMENT_MODES as readonly string[]).includes(value);
}

export function isAcsPermissionStateEntry(value: unknown): value is AcsPermissionStateEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<AcsPermissionStateEntry>;
  return typeof entry.id === "string"
    && typeof entry.subject === "string"
    && typeof entry.subjectType === "string"
    && isAcsPermissionSubjectType(entry.subjectType)
    && typeof entry.resource === "string"
    && typeof entry.domain === "string"
    && isAcsPermissionDomain(entry.domain)
    && Array.isArray(entry.states)
    && entry.states.every((state) => typeof state === "string" && isAcsPermissionState(state))
    && Array.isArray(entry.allowedActions)
    && entry.allowedActions.every((action) => typeof action === "string")
    && Array.isArray(entry.blockedActions)
    && entry.blockedActions.every((action) => typeof action === "string")
    && typeof entry.authorityClass === "string"
    && isAcsPermissionAuthorityClass(entry.authorityClass)
    && typeof entry.enforcementMode === "string"
    && isAcsPermissionEnforcementMode(entry.enforcementMode)
    && typeof entry.summary === "string"
    && Array.isArray(entry.evidence)
    && entry.evidence.every((item) => typeof item === "string")
    && Array.isArray(entry.blockers)
    && entry.blockers.every((item) => typeof item === "string")
    && typeof entry.lastUpdated === "string"
    && typeof entry.source === "string";
}

export function listAcsPermissionStateEntries(
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): readonly AcsPermissionStateEntry[] {
  return entries.map(cloneAcsPermissionStateEntry);
}

export function getAcsPermissionStateEntry(
  id: string,
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): AcsPermissionStateEntry | undefined {
  const entry = entries.find((candidate) => candidate.id === id);
  return entry ? cloneAcsPermissionStateEntry(entry) : undefined;
}

export function listAcsPermissionStateEntriesBySubject(
  subject: string,
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): readonly AcsPermissionStateEntry[] {
  return entries
    .filter((entry) => entry.subject === subject)
    .map(cloneAcsPermissionStateEntry);
}

export function listAcsPermissionStateEntriesByDomain(
  domain: AcsPermissionDomain,
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): readonly AcsPermissionStateEntry[] {
  return entries
    .filter((entry) => entry.domain === domain)
    .map(cloneAcsPermissionStateEntry);
}

export function listBlockedAcsPermissionStateEntries(
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): readonly AcsPermissionStateEntry[] {
  return entries
    .filter((entry) => entry.states.some((state) => BLOCKED_PERMISSION_STATES.has(state)))
    .map(cloneAcsPermissionStateEntry);
}

export function summarizeAcsPermissionState(
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): AcsPermissionStateSummary {
  const counts = Object.fromEntries(
    ACS_PERMISSION_STATES.map((state) => [state, 0]),
  ) as Record<AcsPermissionState, number>;

  for (const entry of entries) {
    for (const state of entry.states) {
      counts[state] += 1;
    }
  }

  return {
    totalEntries: entries.length,
    blockedEntries: entries.filter((entry) => entry.states.some((state) => BLOCKED_PERMISSION_STATES.has(state))).length,
    executionGated: true,
    nonProduction: true,
    mutationAuthorityAvailable: false,
    productionEnforcementAvailable: false,
    states: counts,
    domains: [...new Set(entries.map((entry) => entry.domain))].sort() as readonly AcsPermissionDomain[],
    warnings: [
      "ACS permission state model is representational only in this phase.",
      "No production permission enforcement, signing, provisioning, treasury, settlement, or provider execution is enabled.",
    ],
  };
}

export function checkAcsPermissionAction(
  entryId: string,
  action: string,
  entries: readonly AcsPermissionStateEntry[] = createAcsPermissionStateFixtures(),
): AcsPermissionActionCheckResult {
  const entry = entries.find((candidate) => candidate.id === entryId);
  if (!entry) {
    return {
      entryFound: false,
      entryId,
      subject: "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
      domain: "permission-state-model",
      action,
      representedAllowed: false,
      representedBlocked: true,
      matchedState: "EXECUTION_BLOCKED",
      authorityClass: "MUST_NOT_EXECUTE",
      enforcementMode: "PRODUCTION_ENFORCEMENT_BLOCKED",
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Permission entry not found; action remains blocked by default in the current phase.",
    };
  }

  if (entry.allowedActions.includes(action)) {
    return {
      entryFound: true,
      entryId: entry.id,
      subject: entry.subject,
      domain: entry.domain,
      action,
      representedAllowed: true,
      representedBlocked: false,
      matchedState: firstMatchingState(entry.states, ALLOWED_PERMISSION_STATES, "READ_ALLOWED"),
      authorityClass: entry.authorityClass,
      enforcementMode: entry.enforcementMode,
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Action is represented as allowed for read-only, preview, mock, or config use only.",
    };
  }

  if (entry.blockedActions.includes(action)) {
    return {
      entryFound: true,
      entryId: entry.id,
      subject: entry.subject,
      domain: entry.domain,
      action,
      representedAllowed: false,
      representedBlocked: true,
      matchedState: firstMatchingState(entry.states, BLOCKED_PERMISSION_STATES, "EXECUTION_BLOCKED"),
      authorityClass: entry.authorityClass,
      enforcementMode: entry.enforcementMode,
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Action is represented as blocked and this check does not imply production enforcement.",
    };
  }

  return {
    entryFound: true,
    entryId: entry.id,
    subject: entry.subject,
    domain: entry.domain,
    action,
    representedAllowed: false,
    representedBlocked: true,
    matchedState: "EXECUTION_BLOCKED",
    authorityClass: entry.authorityClass,
    enforcementMode: "PRODUCTION_ENFORCEMENT_BLOCKED",
    productionEnforcement: false,
    executionTriggered: false,
    summary: "Action is not represented as allowed in the current phase and must be treated as blocked.",
  };
}

function firstMatchingState(
  states: readonly AcsPermissionState[],
  candidates: ReadonlySet<AcsPermissionState>,
  fallback: AcsPermissionState,
): AcsPermissionState {
  return [...candidates].find((candidate) => states.includes(candidate)) ?? fallback;
}

function cloneAcsPermissionStateEntry(entry: AcsPermissionStateEntry): AcsPermissionStateEntry {
  return {
    ...entry,
    states: [...entry.states],
    allowedActions: [...entry.allowedActions],
    blockedActions: [...entry.blockedActions],
    evidence: [...entry.evidence],
    blockers: [...entry.blockers],
  };
}
