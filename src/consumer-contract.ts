import {
  getAcsBlockedAction,
  listAcsBlockedActions,
  listAcsOperationalGates,
  summarizeAcsOperationalGates,
  type AcsBlockedAction,
  type AcsBlockedActionCheckResult,
  type AcsOperationalGate,
  type AcsOperationalGateSummary,
} from "./gates.js";
import {
  listAcsPermissionStateEntries,
  listBlockedAcsPermissionStateEntries,
  summarizeAcsPermissionState,
  type AcsPermissionActionCheckResult,
  type AcsPermissionStateEntry,
  type AcsPermissionStateSummary,
} from "./permissions.js";
import {
  getAcsReadinessRegistryEntry,
  listAcsReadinessRegistryEntries,
  listBlockedAcsReadinessRegistryEntries,
  summarizeAcsReadinessRegistry,
  type AcsReadinessRegistryEntry,
  type AcsReadinessRegistrySummary,
} from "./readiness.js";

export const ACS_CONSUMER_MODE = "READ_ONLY_CONSUMER" as const;
export const ACS_CONSUMER_SOURCE = "ACS_LOCAL_CONFIG_FIRST_REGISTRIES" as const;
export const ACS_CONSUMER_EXECUTION_POSTURE = "EXECUTION_GATED_NON_PRODUCTION" as const;
export const ACS_CONSUMER_VALIDATION_STATUS = "NOT_EXECUTED_ENVIRONMENT_BLOCKER" as const;
export const ACS_CONSUMER_CONTRACT_VERSION = "0.1.0" as const;
export const ACS_CONSUMER_CONTRACT_GENERATED_AT = "2026-06-22T00:00:00.000Z" as const;
export const ACS_CONSUMER_RECOMMENDED_NEXT_REQ = "ACS-REQ-08" as const;

export interface AcsConsumerReadinessView {
  readonly entries: readonly AcsReadinessRegistryEntry[];
  readonly summary: AcsReadinessRegistrySummary;
}

export interface AcsConsumerPermissionView {
  readonly entries: readonly AcsPermissionStateEntry[];
  readonly summary: AcsPermissionStateSummary;
}

export interface AcsConsumerGateView {
  readonly gates: readonly AcsOperationalGate[];
  readonly summary: AcsOperationalGateSummary;
}

export interface AcsConsumerBlockedActionSummary {
  readonly totalEntries: number;
  readonly criticalBlockedActionsCount: number;
  readonly executionGated: true;
  readonly nonProduction: true;
  readonly productionEnforcementAvailable: false;
  readonly domains: readonly string[];
  readonly warnings: readonly string[];
}

export interface AcsConsumerBlockedActionView {
  readonly actions: readonly AcsBlockedAction[];
  readonly summary: AcsConsumerBlockedActionSummary;
}

export interface AcsConsumerValidationPosture {
  readonly status: typeof ACS_CONSUMER_VALIDATION_STATUS;
  readonly currentCycleExecutableValidationRun: false;
  readonly reason: string;
  readonly source: string;
}

export interface AcsConsumerBoundaryPosture {
  readonly readOnly: true;
  readonly nonProduction: true;
  readonly executionGated: true;
  readonly mutationAuthorityAvailable: false;
  readonly productionPermissionEnforcementAvailable: false;
  readonly provisioningSystem: false;
  readonly signingWalletSystem: false;
  readonly treasuryExecutor: false;
  readonly tradingExecutor: false;
  readonly settlementExecutor: false;
  readonly billingExecutor: false;
  readonly payoutsExecutor: false;
  readonly productionProviderExecutionLayer: false;
  readonly l4Consolidated: false;
  readonly noGoPosture: readonly string[];
  readonly integrationReadiness: {
    readonly genericConsumerContract: "IMPLEMENTED_READ_ONLY";
    readonly axodusAppAdapter: "NOT_IMPLEMENTED_IN_ACS_REQ_07";
    readonly businessMarketplaceAlignment: "NOT_IMPLEMENTED_IN_ACS_REQ_07";
    readonly portfolioGlobalRegisters: "UNAVAILABLE_IN_CURRENT_ENVIRONMENT";
  };
}

export interface AcsConsumerSnapshot {
  readonly id: string;
  readonly version: typeof ACS_CONSUMER_CONTRACT_VERSION;
  readonly generatedAt: typeof ACS_CONSUMER_CONTRACT_GENERATED_AT;
  readonly source: typeof ACS_CONSUMER_SOURCE;
  readonly consumerMode: typeof ACS_CONSUMER_MODE;
  readonly acsStatus: string;
  readonly lLevel: string;
  readonly dLevel: string;
  readonly executionPosture: typeof ACS_CONSUMER_EXECUTION_POSTURE;
  readonly readiness: AcsConsumerReadinessView;
  readonly permissions: AcsConsumerPermissionView;
  readonly gates: AcsConsumerGateView;
  readonly blockedActions: AcsConsumerBlockedActionView;
  readonly validation: AcsConsumerValidationPosture;
  readonly boundaries: AcsConsumerBoundaryPosture;
  readonly recommendedNextReq: typeof ACS_CONSUMER_RECOMMENDED_NEXT_REQ;
}

export interface AcsConsumerSummary {
  readonly id: string;
  readonly generatedAt: typeof ACS_CONSUMER_CONTRACT_GENERATED_AT;
  readonly consumerMode: typeof ACS_CONSUMER_MODE;
  readonly acsStatus: string;
  readonly executionGated: true;
  readonly nonProduction: true;
  readonly readOnly: true;
  readonly criticalBlockedActionsCount: number;
  readonly closedGatesCount: number;
  readonly blockedReadinessCount: number;
  readonly blockedPermissionCount: number;
  readonly validationStatus: typeof ACS_CONSUMER_VALIDATION_STATUS;
  readonly recommendedNextReq: typeof ACS_CONSUMER_RECOMMENDED_NEXT_REQ;
}

export interface AcsConsumerActionPostureCheckResult {
  readonly action: string;
  readonly representedAllowed: boolean;
  readonly representedBlocked: boolean;
  readonly blockedAction: AcsBlockedActionCheckResult;
  readonly matchingPermissionEntries: readonly string[];
  readonly permissionSignals: readonly AcsPermissionActionCheckResult[];
  readonly productionEnforcement: false;
  readonly executionTriggered: false;
  readonly consumerReadOnly: true;
  readonly summary: string;
}

export function getAcsConsumerReadinessView(): AcsConsumerReadinessView {
  const entries = listAcsReadinessRegistryEntries();
  return {
    entries,
    summary: summarizeAcsReadinessRegistry(entries),
  };
}

export function getAcsConsumerPermissionView(): AcsConsumerPermissionView {
  const entries = listAcsPermissionStateEntries();
  return {
    entries,
    summary: summarizeAcsPermissionState(entries),
  };
}

export function getAcsConsumerGateView(): AcsConsumerGateView {
  const gates = listAcsOperationalGates();
  const actions = listAcsBlockedActions();
  return {
    gates,
    summary: summarizeAcsOperationalGates(gates, actions),
  };
}

export function getAcsConsumerBlockedActionView(): AcsConsumerBlockedActionView {
  const actions = listAcsBlockedActions();
  return {
    actions,
    summary: {
      totalEntries: actions.length,
      criticalBlockedActionsCount: actions.length,
      executionGated: true,
      nonProduction: true,
      productionEnforcementAvailable: false,
      domains: [...new Set(actions.map((action) => action.domain))].sort(),
      warnings: [
        "Blocked action data is representational only for read-only consumers.",
        "No blocked action check implies production enforcement or execution authority.",
      ],
    },
  };
}

export function getAcsConsumerSnapshot(): AcsConsumerSnapshot {
  const coreEntry = getAcsReadinessRegistryEntry("acs.core");
  const readiness = getAcsConsumerReadinessView();
  const permissions = getAcsConsumerPermissionView();
  const gates = getAcsConsumerGateView();
  const blockedActions = getAcsConsumerBlockedActionView();

  return {
    id: "acs.read-only-consumer-contract",
    version: ACS_CONSUMER_CONTRACT_VERSION,
    generatedAt: ACS_CONSUMER_CONTRACT_GENERATED_AT,
    source: ACS_CONSUMER_SOURCE,
    consumerMode: ACS_CONSUMER_MODE,
    acsStatus: coreEntry?.status ?? "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
    lLevel: coreEntry?.lLevel ?? "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
    dLevel: coreEntry?.dLevel ?? "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
    executionPosture: ACS_CONSUMER_EXECUTION_POSTURE,
    readiness,
    permissions,
    gates,
    blockedActions,
    validation: {
      status: ACS_CONSUMER_VALIDATION_STATUS,
      currentCycleExecutableValidationRun: false,
      reason: "node and npm are unavailable in the current environment",
      source: ".instructions/VALIDATION.md",
    },
    boundaries: {
      readOnly: true,
      nonProduction: true,
      executionGated: true,
      mutationAuthorityAvailable: false,
      productionPermissionEnforcementAvailable: false,
      provisioningSystem: false,
      signingWalletSystem: false,
      treasuryExecutor: false,
      tradingExecutor: false,
      settlementExecutor: false,
      billingExecutor: false,
      payoutsExecutor: false,
      productionProviderExecutionLayer: false,
      l4Consolidated: false,
      noGoPosture: [
        "acs.provision.real",
        "credentials.issue.real",
        "credentials.read.secret",
        "wallet.create.real",
        "wallet.sign.real",
        "treasury.execute.real",
        "trading.execute.real",
        "settlement.execute.real",
        "payouts.execute.real",
        "billing.execute.real",
        "database.production.connect",
        "api.production.mutate",
        "provider.external.production.execute",
        "smart_contract.deploy_or_mutate",
        "permission.enforce.production",
        "state.mutate.production",
        "portfolio.global_registers.mutate",
      ],
      integrationReadiness: {
        genericConsumerContract: "IMPLEMENTED_READ_ONLY",
        axodusAppAdapter: "NOT_IMPLEMENTED_IN_ACS_REQ_07",
        businessMarketplaceAlignment: "NOT_IMPLEMENTED_IN_ACS_REQ_07",
        portfolioGlobalRegisters: "UNAVAILABLE_IN_CURRENT_ENVIRONMENT",
      },
    },
    recommendedNextReq: ACS_CONSUMER_RECOMMENDED_NEXT_REQ,
  };
}

export function getAcsConsumerSummary(): AcsConsumerSummary {
  const snapshot = getAcsConsumerSnapshot();
  const blockedReadiness = listBlockedAcsReadinessRegistryEntries(snapshot.readiness.entries);
  const blockedPermissions = listBlockedAcsPermissionStateEntries(snapshot.permissions.entries);

  return {
    id: snapshot.id,
    generatedAt: snapshot.generatedAt,
    consumerMode: snapshot.consumerMode,
    acsStatus: snapshot.acsStatus,
    executionGated: true,
    nonProduction: true,
    readOnly: true,
    criticalBlockedActionsCount: snapshot.blockedActions.summary.criticalBlockedActionsCount,
    closedGatesCount: snapshot.gates.summary.closedGates,
    blockedReadinessCount: blockedReadiness.length,
    blockedPermissionCount: blockedPermissions.length,
    validationStatus: snapshot.validation.status,
    recommendedNextReq: snapshot.recommendedNextReq,
  };
}

export function checkAcsConsumerActionPosture(action: string): AcsConsumerActionPostureCheckResult {
  const blockedAction = checkConsumerBlockedAction(action);
  const permissionSignals = listAcsPermissionStateEntries()
    .filter((entry) => entry.allowedActions.includes(action) || entry.blockedActions.includes(action))
    .map((entry) => ({
      entryFound: true,
      entryId: entry.id,
      subject: entry.subject,
      domain: entry.domain,
      action,
      representedAllowed: entry.allowedActions.includes(action),
      representedBlocked: entry.blockedActions.includes(action),
      matchedState: entry.blockedActions.includes(action)
        ? findBlockedPermissionState(entry.states)
        : findAllowedPermissionState(entry.states),
      authorityClass: entry.authorityClass,
      enforcementMode: entry.enforcementMode,
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Consumer action posture is representational only and does not imply production enforcement.",
    }));

  const representedBlocked = blockedAction.actionFound || permissionSignals.some((entry) => entry.representedBlocked);
  const representedAllowed = !representedBlocked && permissionSignals.some((entry) => entry.representedAllowed);

  return {
    action,
    representedAllowed,
    representedBlocked,
    blockedAction,
    matchingPermissionEntries: permissionSignals.map((entry) => entry.entryId),
    permissionSignals,
    productionEnforcement: false,
    executionTriggered: false,
    consumerReadOnly: true,
    summary: representedBlocked
      ? "Action posture is represented as blocked for read-only consumers and does not imply production enforcement."
      : representedAllowed
        ? "Action posture is represented as read-only allowed for consumer inspection and does not imply execution authority."
        : "Action posture is not explicitly represented as allowed; default non-production and execution-gated posture remains in effect.",
  };
}

function checkConsumerBlockedAction(action: string): AcsBlockedActionCheckResult {
  const blockedAction = getAcsBlockedAction(action);
  if (!blockedAction) {
    return {
      actionFound: false,
      actionId: action,
      gateId: "NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED",
      domain: "operational-gate-registry",
      status: "BLOCKED",
      representedBlocked: true,
      productionEnforcement: false,
      executionTriggered: false,
      summary: "Blocked action not found explicitly; default execution-gated posture still applies for consumers.",
    };
  }

  return {
    actionFound: true,
    actionId: blockedAction.id,
    gateId: blockedAction.gateId,
    domain: blockedAction.domain,
    status: "BLOCKED",
    representedBlocked: true,
    productionEnforcement: false,
    executionTriggered: false,
    summary: "Blocked action is exposed to consumers as blocked and read-only only.",
  };
}

function findAllowedPermissionState(states: readonly string[]): "READ_ALLOWED" | "PREVIEW_ALLOWED" | "MOCK_ALLOWED" | "CONFIG_ALLOWED" {
  if (states.includes("READ_ALLOWED")) {
    return "READ_ALLOWED";
  }

  if (states.includes("PREVIEW_ALLOWED")) {
    return "PREVIEW_ALLOWED";
  }

  if (states.includes("MOCK_ALLOWED")) {
    return "MOCK_ALLOWED";
  }

  return "CONFIG_ALLOWED";
}

function findBlockedPermissionState(states: readonly string[]): "EXECUTION_BLOCKED" | "SIGNING_BLOCKED" | "TREASURY_BLOCKED" | "SETTLEMENT_BLOCKED" | "PROVISIONING_BLOCKED" {
  if (states.includes("SIGNING_BLOCKED")) {
    return "SIGNING_BLOCKED";
  }

  if (states.includes("TREASURY_BLOCKED")) {
    return "TREASURY_BLOCKED";
  }

  if (states.includes("SETTLEMENT_BLOCKED")) {
    return "SETTLEMENT_BLOCKED";
  }

  if (states.includes("PROVISIONING_BLOCKED")) {
    return "PROVISIONING_BLOCKED";
  }

  return "EXECUTION_BLOCKED";
}
