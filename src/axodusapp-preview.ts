import {
  getAcsConsumerSnapshot,
  type AcsConsumerBoundaryPosture,
  type AcsConsumerBlockedActionView,
  type AcsConsumerGateView,
  type AcsConsumerPermissionView,
  type AcsConsumerReadinessView,
  type AcsConsumerSnapshot,
} from "./consumer-contract.js";

export const ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE = "AXODUSAPP_PREVIEW_READ_ONLY" as const;
export const ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER = "AXODUSAPP_PORTFOLIO_INTELLIGENCE_HUB_PREVIEW" as const;
export const ACS_AXODUSAPP_PREVIEW_SOURCE = "ACS_READ_ONLY_CONSUMER_CONTRACT" as const;
export const ACS_AXODUSAPP_PREVIEW_VERSION = "0.1.0" as const;
export const ACS_AXODUSAPP_PREVIEW_GENERATED_AT = "2026-06-22T00:00:00.000Z" as const;
export const ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ = "ACS-REQ-09" as const;

export interface AcsAxodusAppPreviewCard {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly severity: "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly blocked: boolean;
  readonly source: string;
}

export interface AcsAxodusAppIntegrationReadiness {
  readonly previewOnly: true;
  readonly localConfigFirst: true;
  readonly readOnly: true;
  readonly axodusAppRuntimeRequired: false;
  readonly axodusAppRuntimeCalled: false;
  readonly productionIntegration: false;
  readonly businessMarketplaceContractImplemented: false;
}

export interface AcsAxodusAppPreviewSnapshot {
  readonly id: string;
  readonly version: typeof ACS_AXODUSAPP_PREVIEW_VERSION;
  readonly generatedAt: typeof ACS_AXODUSAPP_PREVIEW_GENERATED_AT;
  readonly source: typeof ACS_AXODUSAPP_PREVIEW_SOURCE;
  readonly adapterMode: typeof ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE;
  readonly targetConsumer: typeof ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER;
  readonly acsStatus: string;
  readonly lLevel: string;
  readonly dLevel: string;
  readonly executionPosture: string;
  readonly validationStatus: string;
  readonly readinessCards: readonly AcsAxodusAppPreviewCard[];
  readonly permissionCards: readonly AcsAxodusAppPreviewCard[];
  readonly gateCards: readonly AcsAxodusAppPreviewCard[];
  readonly blockedActionCards: readonly AcsAxodusAppPreviewCard[];
  readonly criticalWarnings: readonly string[];
  readonly integrationReadiness: AcsAxodusAppIntegrationReadiness;
  readonly nonProductionNotice: string;
  readonly recommendedNextReq: typeof ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ;
}

export interface AcsAxodusAppPreviewSummary {
  readonly id: string;
  readonly adapterMode: typeof ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE;
  readonly targetConsumer: typeof ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER;
  readonly readOnly: true;
  readonly nonProduction: true;
  readonly executionGated: true;
  readonly validationStatus: string;
  readonly criticalWarningsCount: number;
  readonly readinessCardCount: number;
  readonly permissionCardCount: number;
  readonly gateCardCount: number;
  readonly blockedActionCardCount: number;
  readonly recommendedNextReq: typeof ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ;
}

export function getAcsAxodusAppPreviewSnapshot(
  consumerSnapshot: AcsConsumerSnapshot = getAcsConsumerSnapshot(),
): AcsAxodusAppPreviewSnapshot {
  return {
    id: "acs.axodusapp.preview",
    version: ACS_AXODUSAPP_PREVIEW_VERSION,
    generatedAt: ACS_AXODUSAPP_PREVIEW_GENERATED_AT,
    source: ACS_AXODUSAPP_PREVIEW_SOURCE,
    adapterMode: ACS_AXODUSAPP_PREVIEW_ADAPTER_MODE,
    targetConsumer: ACS_AXODUSAPP_PREVIEW_TARGET_CONSUMER,
    acsStatus: consumerSnapshot.acsStatus,
    lLevel: consumerSnapshot.lLevel,
    dLevel: consumerSnapshot.dLevel,
    executionPosture: consumerSnapshot.executionPosture,
    validationStatus: consumerSnapshot.validation.status,
    readinessCards: getAcsAxodusAppReadinessCards(consumerSnapshot.readiness),
    permissionCards: getAcsAxodusAppPermissionCards(consumerSnapshot.permissions),
    gateCards: getAcsAxodusAppGateCards(consumerSnapshot.gates),
    blockedActionCards: getAcsAxodusAppBlockedActionCards(consumerSnapshot.blockedActions),
    criticalWarnings: getAcsAxodusAppCriticalWarnings(consumerSnapshot.boundaries, consumerSnapshot.validation.status),
    integrationReadiness: {
      previewOnly: true,
      localConfigFirst: true,
      readOnly: true,
      axodusAppRuntimeRequired: false,
      axodusAppRuntimeCalled: false,
      productionIntegration: false,
      businessMarketplaceContractImplemented: false,
    },
    nonProductionNotice: "AxodusAPP preview is local/config-first, read-only, execution-gated, and non-production.",
    recommendedNextReq: ACS_AXODUSAPP_PREVIEW_RECOMMENDED_NEXT_REQ,
  };
}

export function summarizeAcsAxodusAppPreviewPosture(
  snapshot: AcsAxodusAppPreviewSnapshot = getAcsAxodusAppPreviewSnapshot(),
): AcsAxodusAppPreviewSummary {
  return {
    id: snapshot.id,
    adapterMode: snapshot.adapterMode,
    targetConsumer: snapshot.targetConsumer,
    readOnly: true,
    nonProduction: true,
    executionGated: true,
    validationStatus: snapshot.validationStatus,
    criticalWarningsCount: snapshot.criticalWarnings.length,
    readinessCardCount: snapshot.readinessCards.length,
    permissionCardCount: snapshot.permissionCards.length,
    gateCardCount: snapshot.gateCards.length,
    blockedActionCardCount: snapshot.blockedActionCards.length,
    recommendedNextReq: snapshot.recommendedNextReq,
  };
}

export function getAcsAxodusAppReadinessCards(
  readiness: AcsConsumerReadinessView = getAcsConsumerSnapshot().readiness,
): readonly AcsAxodusAppPreviewCard[] {
  return readiness.entries.map((entry) => ({
    id: entry.id,
    title: entry.name,
    status: entry.status,
    severity: mapReadinessSeverity(entry.status),
    summary: entry.summary,
    evidence: [...entry.evidence],
    blocked: entry.status === "BLOCKED" || entry.status === "EXECUTION_GATED",
    source: entry.source,
  }));
}

export function getAcsAxodusAppPermissionCards(
  permissions: AcsConsumerPermissionView = getAcsConsumerSnapshot().permissions,
): readonly AcsAxodusAppPreviewCard[] {
  return permissions.entries.map((entry) => ({
    id: entry.id,
    title: entry.subject,
    status: entry.states.join(", "),
    severity: entry.blockedActions.length > 0 ? "HIGH" : "INFO",
    summary: entry.summary,
    evidence: [...entry.evidence],
    blocked: entry.blockedActions.length > 0,
    source: entry.source,
  }));
}

export function getAcsAxodusAppGateCards(
  gates: AcsConsumerGateView = getAcsConsumerSnapshot().gates,
): readonly AcsAxodusAppPreviewCard[] {
  return gates.gates.map((gate) => ({
    id: gate.id,
    title: gate.name,
    status: gate.status,
    severity: mapGateSeverity(gate.status),
    summary: gate.summary,
    evidence: [...gate.evidence],
    blocked: gate.status !== "READ_ONLY_ALLOWED",
    source: gate.source,
  }));
}

export function getAcsAxodusAppBlockedActionCards(
  blockedActions: AcsConsumerBlockedActionView = getAcsConsumerSnapshot().blockedActions,
): readonly AcsAxodusAppPreviewCard[] {
  return blockedActions.actions.map((action) => ({
    id: action.id,
    title: action.id,
    status: action.status,
    severity: "CRITICAL",
    summary: action.summary,
    evidence: [...action.evidence],
    blocked: true,
    source: action.source,
  }));
}

export function getAcsAxodusAppCriticalWarnings(
  boundaries: AcsConsumerBoundaryPosture = getAcsConsumerSnapshot().boundaries,
  validationStatus: string = getAcsConsumerSnapshot().validation.status,
): readonly string[] {
  return [
    "Preview-only adapter. No AxodusAPP runtime call is performed.",
    "ACS remains local/config-first, read-only, execution-gated, and non-production.",
    "No provisioning, signing, treasury, trading, settlement, billing, payouts, or provider execution is enabled.",
    "No production permission enforcement is exposed through this preview.",
    `Validation status: ${validationStatus}.`,
    `Blocked no-go actions represented: ${boundaries.noGoPosture.join(", ")}.`,
  ];
}

function mapReadinessSeverity(status: string): "INFO" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (status === "BLOCKED") {
    return "CRITICAL";
  }

  if (status === "EXECUTION_GATED" || status === "HOLD") {
    return "HIGH";
  }

  if (status === "NOT_STARTED" || status === "STRUCTURED") {
    return "MEDIUM";
  }

  return "INFO";
}

function mapGateSeverity(status: string): "INFO" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (status === "CLOSED" || status === "BLOCKED") {
    return "CRITICAL";
  }

  if (status === "EXECUTION_GATED") {
    return "HIGH";
  }

  return "INFO";
}
