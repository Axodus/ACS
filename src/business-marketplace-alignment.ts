import {
  checkAcsConsumerActionPosture,
  getAcsConsumerSnapshot,
  type AcsConsumerActionPostureCheckResult,
  type AcsConsumerBlockedActionView,
  type AcsConsumerSnapshot,
} from "./consumer-contract.js";
import type { AcsBlockedAction } from "./gates.js";

export const ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE = "BUSINESS_MARKETPLACE_READ_ONLY_ALIGNMENT" as const;
export const ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE = "ACS_READ_ONLY_CONSUMER_CONTRACT" as const;
export const ACS_BUSINESS_ALIGNMENT_TARGET = "BUSINESS_ALIGNMENT_PREVIEW" as const;
export const ACS_MARKETPLACE_ALIGNMENT_TARGET = "MARKETPLACE_ALIGNMENT_PREVIEW" as const;
export const ACS_BUSINESS_MARKETPLACE_ALIGNMENT_VERSION = "0.1.0" as const;
export const ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT = "2026-06-22T00:00:00.000Z" as const;
export const ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ = "ACS-REQ-10" as const;

const COMMERCE_BLOCKED_ACTION_IDS = [
  "billing.execute.real",
  "settlement.execute.real",
  "payouts.execute.real",
  "treasury.execute.real",
  "provider.external.production.execute",
] as const;

export interface AcsBusinessMarketplaceAlignmentCard {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly severity: "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly blocked: boolean;
  readonly source: string;
}

export interface AcsBusinessReadinessProjection {
  readonly id: string;
  readonly status: string;
  readonly nonExecutive: true;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly source: string;
}

export interface AcsBusinessOpportunityReadinessProjection {
  readonly id: string;
  readonly status: string;
  readonly executionAuthority: false;
  readonly summary: string;
  readonly blocked: true;
  readonly evidence: readonly string[];
  readonly source: string;
}

export interface AcsMarketplaceReadinessProjection {
  readonly id: string;
  readonly status: string;
  readonly nonExecutive: true;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly source: string;
}

export interface AcsMarketplacePostureProjection {
  readonly id: string;
  readonly status: "HOLD/BACKLOG_READY_NON_EXECUTIVE";
  readonly holdOrBacklogReady: true;
  readonly nonExecutive: true;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly source: string;
}

export interface AcsBusinessAlignmentSnapshot {
  readonly id: string;
  readonly version: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_VERSION;
  readonly generatedAt: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT;
  readonly source: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE;
  readonly alignmentMode: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE;
  readonly targetConsumer: typeof ACS_BUSINESS_ALIGNMENT_TARGET;
  readonly businessReadiness: AcsBusinessReadinessProjection;
  readonly opportunityReadiness: AcsBusinessOpportunityReadinessProjection;
  readonly executionPosture: string;
  readonly commerceBlockedActions: readonly AcsBusinessMarketplaceAlignmentCard[];
  readonly criticalWarnings: readonly string[];
  readonly nonProductionNotice: string;
  readonly recommendedNextReq: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ;
}

export interface AcsMarketplaceAlignmentSnapshot {
  readonly id: string;
  readonly version: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_VERSION;
  readonly generatedAt: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT;
  readonly source: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE;
  readonly alignmentMode: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE;
  readonly targetConsumer: typeof ACS_MARKETPLACE_ALIGNMENT_TARGET;
  readonly marketplaceReadiness: AcsMarketplaceReadinessProjection;
  readonly marketplacePosture: AcsMarketplacePostureProjection;
  readonly executionPosture: string;
  readonly commerceBlockedActions: readonly AcsBusinessMarketplaceAlignmentCard[];
  readonly criticalWarnings: readonly string[];
  readonly nonProductionNotice: string;
  readonly recommendedNextReq: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ;
}

export interface AcsBusinessMarketplaceAlignmentSummary {
  readonly id: string;
  readonly generatedAt: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT;
  readonly source: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE;
  readonly alignmentMode: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE;
  readonly businessNonExecutive: boolean;
  readonly marketplaceNonExecutive: boolean;
  readonly marketplaceHoldOrBacklogReady: boolean;
  readonly commerceExecutionBlocked: boolean;
  readonly billingExecutionBlocked: boolean;
  readonly settlementExecutionBlocked: boolean;
  readonly payoutsExecutionBlocked: boolean;
  readonly treasuryExecutionBlocked: boolean;
  readonly providerProductionExecutionBlocked: boolean;
  readonly recommendedNextReq: typeof ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ;
}

export interface AcsCommerceActionPostureCheckResult {
  readonly action: string;
  readonly targetConsumer: typeof ACS_BUSINESS_ALIGNMENT_TARGET | typeof ACS_MARKETPLACE_ALIGNMENT_TARGET;
  readonly representedAllowed: boolean;
  readonly representedBlocked: boolean;
  readonly productionIntegration: false;
  readonly executionTriggered: false;
  readonly runtimeCallTriggered: false;
  readonly nonExecutive: true;
  readonly consumerCheck: AcsConsumerActionPostureCheckResult;
  readonly summary: string;
}

export function getAcsBusinessAlignmentSnapshot(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): AcsBusinessAlignmentSnapshot {
  const businessReadiness = requireReadinessEntry(snapshot, "acs.business-alignment");

  return {
    id: "acs.business-alignment.preview",
    version: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_VERSION,
    generatedAt: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT,
    source: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE,
    alignmentMode: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE,
    targetConsumer: ACS_BUSINESS_ALIGNMENT_TARGET,
    businessReadiness: {
      id: businessReadiness.id,
      status: businessReadiness.status,
      nonExecutive: true,
      summary: "Business may inspect opportunity readiness and commerce blockers, but no execution authority is granted.",
      evidence: [...businessReadiness.evidence],
      source: businessReadiness.source,
    },
    opportunityReadiness: {
      id: "business.opportunity-readiness",
      status: "READ_ONLY_PREVIEW_ONLY",
      executionAuthority: false,
      summary: "Opportunity readiness is representational only and does not imply billing, settlement, payouts, treasury, or provider execution authority.",
      blocked: true,
      evidence: [
        businessReadiness.source,
        ...snapshot.blockedActions.actions
          .filter((action) => COMMERCE_BLOCKED_ACTION_IDS.includes(action.id as (typeof COMMERCE_BLOCKED_ACTION_IDS)[number]))
          .map((action) => action.source),
      ],
      source: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE,
    },
    executionPosture: snapshot.executionPosture,
    commerceBlockedActions: getAcsBusinessCommerceBlockedActions(snapshot),
    criticalWarnings: getAcsBusinessCriticalWarnings(snapshot),
    nonProductionNotice: "Business alignment is local/config-first, read-only, non-executive, and non-production.",
    recommendedNextReq: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ,
  };
}

export function getAcsMarketplaceAlignmentSnapshot(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): AcsMarketplaceAlignmentSnapshot {
  const marketplaceReadiness = requireReadinessEntry(snapshot, "acs.marketplace-alignment");

  return {
    id: "acs.marketplace-alignment.preview",
    version: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_VERSION,
    generatedAt: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT,
    source: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE,
    alignmentMode: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE,
    targetConsumer: ACS_MARKETPLACE_ALIGNMENT_TARGET,
    marketplaceReadiness: {
      id: marketplaceReadiness.id,
      status: marketplaceReadiness.status,
      nonExecutive: true,
      summary: "Marketplace readiness is exposed for read-only inspection only and does not unlock commerce execution.",
      evidence: [...marketplaceReadiness.evidence],
      source: marketplaceReadiness.source,
    },
    marketplacePosture: {
      id: "marketplace.posture",
      status: "HOLD/BACKLOG_READY_NON_EXECUTIVE",
      holdOrBacklogReady: true,
      nonExecutive: true,
      summary: "Marketplace remains HOLD/BACKLOG_READY and non-executive in this phase.",
      evidence: [...marketplaceReadiness.evidence],
      source: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE,
    },
    executionPosture: snapshot.executionPosture,
    commerceBlockedActions: getAcsMarketplaceCommerceBlockedActions(snapshot),
    criticalWarnings: getAcsMarketplaceCriticalWarnings(snapshot),
    nonProductionNotice: "Marketplace alignment is local/config-first, read-only, HOLD/BACKLOG_READY, and non-production.",
    recommendedNextReq: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ,
  };
}

export function getAcsBusinessMarketplaceAlignmentSummary(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): AcsBusinessMarketplaceAlignmentSummary {
  const commerceBlockedActions = filterCommerceBlockedActions(snapshot.blockedActions);
  const blockedIds = new Set(commerceBlockedActions.map((action) => action.id));

  return {
    id: "acs.business-marketplace-alignment.summary",
    generatedAt: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_GENERATED_AT,
    source: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_SOURCE,
    alignmentMode: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_MODE,
    businessNonExecutive: true,
    marketplaceNonExecutive: true,
    marketplaceHoldOrBacklogReady: true,
    commerceExecutionBlocked: commerceBlockedActions.length > 0,
    billingExecutionBlocked: blockedIds.has("billing.execute.real"),
    settlementExecutionBlocked: blockedIds.has("settlement.execute.real"),
    payoutsExecutionBlocked: blockedIds.has("payouts.execute.real"),
    treasuryExecutionBlocked: blockedIds.has("treasury.execute.real"),
    providerProductionExecutionBlocked: blockedIds.has("provider.external.production.execute"),
    recommendedNextReq: ACS_BUSINESS_MARKETPLACE_ALIGNMENT_RECOMMENDED_NEXT_REQ,
  };
}

export function getAcsBusinessCommerceBlockedActions(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): readonly AcsBusinessMarketplaceAlignmentCard[] {
  return filterCommerceBlockedActions(snapshot.blockedActions).map((action) => toCommerceBlockedActionCard(action, "Business Commerce Block"));
}

export function getAcsMarketplaceCommerceBlockedActions(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): readonly AcsBusinessMarketplaceAlignmentCard[] {
  return filterCommerceBlockedActions(snapshot.blockedActions).map((action) => toCommerceBlockedActionCard(action, "Marketplace Commerce Block"));
}

export function getAcsBusinessCriticalWarnings(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): readonly string[] {
  return [
    "Business alignment is preview-only and non-executive.",
    "ACS exposes state only and does not call Business runtime.",
    "Billing, settlement, payouts, treasury, and provider production execution remain blocked.",
    `Validation status: ${snapshot.validation.status}.`,
  ];
}

export function getAcsMarketplaceCriticalWarnings(
  snapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): readonly string[] {
  return [
    "Marketplace alignment is HOLD/BACKLOG_READY and non-executive.",
    "ACS exposes state only and does not call Marketplace runtime.",
    "No production commerce, billing, settlement, payouts, treasury, or provider execution is enabled.",
    `Validation status: ${snapshot.validation.status}.`,
  ];
}

export function checkAcsBusinessCommerceActionPosture(
  action: string,
): AcsCommerceActionPostureCheckResult {
  return toCommerceActionPosture(action, ACS_BUSINESS_ALIGNMENT_TARGET);
}

export function checkAcsMarketplaceCommerceActionPosture(
  action: string,
): AcsCommerceActionPostureCheckResult {
  return toCommerceActionPosture(action, ACS_MARKETPLACE_ALIGNMENT_TARGET);
}

function requireReadinessEntry(snapshot: AcsConsumerSnapshot, id: string) {
  return snapshot.readiness.entries.find((entry) => entry.id === id) ?? {
    id,
    status: "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
    evidence: ["NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED"],
    source: "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
  };
}

function filterCommerceBlockedActions(
  blockedActions: AcsConsumerBlockedActionView,
): readonly AcsBlockedAction[] {
  return blockedActions.actions
    .filter((action) => COMMERCE_BLOCKED_ACTION_IDS.includes(action.id as (typeof COMMERCE_BLOCKED_ACTION_IDS)[number]))
    .map((action) => ({
      ...action,
      allowedRepresentation: [...action.allowedRepresentation],
      blockedExecution: [...action.blockedExecution],
      evidence: [...action.evidence],
    }));
}

function toCommerceBlockedActionCard(
  action: AcsBlockedAction,
  titlePrefix: string,
): AcsBusinessMarketplaceAlignmentCard {
  return {
    id: action.id,
    title: `${titlePrefix}: ${action.id}`,
    status: action.status,
    severity: "CRITICAL",
    summary: action.summary,
    evidence: [...action.evidence],
    blocked: true,
    source: action.source,
  };
}

function toCommerceActionPosture(
  action: string,
  targetConsumer: typeof ACS_BUSINESS_ALIGNMENT_TARGET | typeof ACS_MARKETPLACE_ALIGNMENT_TARGET,
): AcsCommerceActionPostureCheckResult {
  const consumerCheck = checkAcsConsumerActionPosture(action);

  return {
    action,
    targetConsumer,
    representedAllowed: false,
    representedBlocked: true,
    productionIntegration: false,
    executionTriggered: false,
    runtimeCallTriggered: false,
    nonExecutive: true,
    consumerCheck,
    summary: "Commerce action posture is representational only; no execution authority, runtime call, or production integration is implied.",
  };
}
