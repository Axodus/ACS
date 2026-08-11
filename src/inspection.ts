import { ACS_POLICY_MATRIX, getPolicyMatrixEntry, type AcsCapabilityId } from "./acs-policy-matrix.js";
import { AcsCapabilityRegistry, type AcsServiceCapability } from "./capability-registry.js";
import {
  checkAcsBusinessCommerceActionPosture,
  checkAcsMarketplaceCommerceActionPosture,
  getAcsBusinessAlignmentSnapshot,
  getAcsBusinessCommerceBlockedActions,
  getAcsBusinessCriticalWarnings,
  getAcsBusinessMarketplaceAlignmentSummary,
  getAcsMarketplaceAlignmentSnapshot,
  getAcsMarketplaceCommerceBlockedActions,
  getAcsMarketplaceCriticalWarnings,
} from "./business-marketplace-alignment.js";
import type { AcsConsumptionLevel } from "./consumption-levels.js";
import {
  getAcsAxodusAppBlockedActionCards,
  getAcsAxodusAppCriticalWarnings,
  getAcsAxodusAppGateCards,
  getAcsAxodusAppPermissionCards,
  getAcsAxodusAppPreviewSnapshot,
  getAcsAxodusAppReadinessCards,
  summarizeAcsAxodusAppPreviewPosture,
} from "./axodusapp-preview.js";
import {
  checkAcsConsumerActionPosture,
  getAcsConsumerBlockedActionView,
  getAcsConsumerGateView,
  getAcsConsumerPermissionView,
  getAcsConsumerReadinessView,
  getAcsConsumerSnapshot,
  getAcsConsumerSummary,
} from "./consumer-contract.js";
import {
  ACS_FIXTURE_IDS,
  createAcsBlockedActionFixtures,
  createAcsOperationalGateFixtures,
  createAcsPermissionStateFixtures,
  createAcsTenantFixtures,
  createAcsReadinessRegistryFixtures,
  createSampleAcsReceiptFixture,
  createSampleEmergencyStopFixtures,
  createSamplePerformanceRecordFixtures,
} from "./fixtures/acs-fixtures.js";
import {
  checkAcsBlockedAction,
  getAcsBlockedAction,
  getAcsOperationalGate,
  isAcsOperationalGateDomain,
  listAcsBlockedActions,
  listAcsBlockedActionsByDomain,
  listAcsOperationalGates,
  listAcsOperationalGatesByDomain,
  listBlockedOrClosedAcsOperationalGates,
  summarizeAcsOperationalGates,
  type AcsOperationalGateDomain,
} from "./gates.js";
import {
  checkAcsPermissionAction,
  getAcsPermissionStateEntry,
  isAcsPermissionDomain,
  listAcsPermissionStateEntries,
  listAcsPermissionStateEntriesByDomain,
  listAcsPermissionStateEntriesBySubject,
  listBlockedAcsPermissionStateEntries,
  summarizeAcsPermissionState,
  type AcsPermissionDomain,
} from "./permissions.js";
import {
  getAcsReadinessRegistryEntry,
  isAcsReadinessDomain,
  isAcsReadinessStatus,
  listAcsReadinessRegistryEntries,
  listAcsReadinessRegistryEntriesByDomain,
  listBlockedAcsReadinessRegistryEntries,
  summarizeAcsReadinessRegistry,
  type AcsReadinessDomain,
  type AcsReadinessStatus,
} from "./readiness.js";
import {
  createEpic10ReadinessReport,
  type Epic10ReadinessInspectionInput,
} from "./control-plane/epic-10-readiness.js";
import { evaluateProductAccess, type AcsProductAccessContext } from "./product-access-registry.js";
import type { AcsTenantContext } from "./tenant-context.js";
import { evaluateTenantServiceAccess } from "./tenant-service-registry.js";
import { getMockUserStatusSummary } from "./user-status.js";

export interface CapabilityInspectionFilter {
  readonly level?: AcsConsumptionLevel;
}

export interface TenantServiceInspectionFilter {
  readonly tenantId?: string;
}

export interface ProductAccessInspectionFilter {
  readonly walletAddress?: string;
  readonly productId?: string;
}

export interface PolicyCheckInput {
  readonly capabilityId: string;
  readonly tenantId?: string;
  readonly wallet?: string;
}

export interface UserStatusInspectionFilter {
  readonly wallet: string;
  readonly tenantId?: string;
  readonly productId?: string;
}

export interface ReadinessRegistryInspectionFilter {
  readonly domain?: AcsReadinessDomain;
  readonly status?: AcsReadinessStatus;
  readonly blockedOnly?: boolean;
}

export interface Epic10ReadinessInspectionFilter extends Epic10ReadinessInspectionInput {}

export interface PermissionStateInspectionFilter {
  readonly subject?: string;
  readonly domain?: AcsPermissionDomain;
  readonly blockedOnly?: boolean;
}

export interface OperationalGateInspectionFilter {
  readonly domain?: AcsOperationalGateDomain;
  readonly blockedOnly?: boolean;
}

export interface BlockedActionInspectionFilter {
  readonly domain?: AcsOperationalGateDomain;
}

export interface InspectionDecision {
  readonly allowed: boolean;
  readonly blockedReason?: string;
  readonly warnings: readonly string[];
}

export interface AcsPolicyInspectionContext {
  readonly capabilityId: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly source: "capability-registry" | "policy-matrix" | "emergency-stop";
  readonly decisionSurface: "inspection";
  readonly executionTriggered: false;
}

const MOCK_TENANTS: readonly AcsTenantContext[] = createAcsTenantFixtures();

function defaultProductAccess(walletAddress?: string): AcsProductAccessContext {
  return {
    ...(walletAddress ? { walletAddress } : {}),
    subscriptionActive: false,
    nftLicenseValid: walletAddress === ACS_FIXTURE_IDS.licensedWallet,
    marketplacePurchaseValid: false,
    governancePermission: true,
    userReadinessState: walletAddress === ACS_FIXTURE_IDS.licensedWallet ? "READY" : "UNINITIALIZED",
  };
}

export function inspectCapabilities(filter: CapabilityInspectionFilter = {}) {
  const registry = new AcsCapabilityRegistry();
  const capabilities = filter.level ? registry.listByLevel(filter.level) : registry.list();

  return {
    capabilities: capabilities.map(toCapabilityInspection),
  };
}

export function inspectTenantServices(filter: TenantServiceInspectionFilter = {}) {
  const registry = new AcsCapabilityRegistry();
  const tenants = filter.tenantId ? [requireTenant(filter.tenantId)] : [...MOCK_TENANTS];
  const serviceCapabilities = registry.list().filter((capability) => capability.tenantAccessAllowed);

  return {
    tenants: tenants.map((tenant) => ({
      tenantId: tenant.tenantId,
      tenantType: tenant.tenantType,
      governanceStatus: tenant.governanceStatus,
      federationTier: tenant.federationTier,
      restrictions: tenant.restrictions,
      services: serviceCapabilities.map((capability) => {
        const decision = evaluateTenantServiceAccess({
          tenant,
          capability,
          governanceApproved: tenant.governanceStatus === "active",
        });

        return {
          tenantId: tenant.tenantId,
          serviceId: capability.id,
          capabilityId: capability.id,
          ...toCapabilityInspection(capability),
          ...toInspectionDecision(decision.allowed, decision.reason),
        };
      }),
    })),
  };
}

export function inspectProductAccess(filter: ProductAccessInspectionFilter = {}) {
  const registry = new AcsCapabilityRegistry();
  const products = registry.list().filter((capability) => capability.productAccessAllowed);
  const filteredProducts = filter.productId
    ? products.filter((capability) => capability.id === filter.productId)
    : products;
  const access = defaultProductAccess(filter.walletAddress);

  return {
    walletAddress: filter.walletAddress,
    products: filteredProducts.map((capability) => {
      const decision = evaluateProductAccess({ capability, access });

      return {
        productId: capability.id,
        capabilityId: capability.id,
        ...toCapabilityInspection(capability),
        ...toInspectionDecision(decision.allowed, decision.reason),
      };
    }),
  };
}

export function inspectPolicyMatrix() {
  return {
    policies: ACS_POLICY_MATRIX.map((entry) => ({
      capabilityId: entry.capability,
      label: entry.label,
      consumableBy: entry.consumableBy,
      coreOnly: entry.coreOnly,
      tenantAccessAllowed: entry.tenantAccessAllowed,
      productAccessAllowed: entry.productAccessAllowed,
      automationLevel: entry.automationLevel,
      requiresGovernanceApproval: entry.governanceApprovalRequired,
      telemetryRequired: entry.telemetryRequired,
      receiptsRequired: entry.receiptRequired,
      authorities: {
        user: entry.user,
        acs: entry.acs,
        governance: entry.governance,
        riskEngine: entry.riskEngine,
      },
      allowedStates: entry.allowedStates,
      notes: entry.notes,
    })),
  };
}

export function inspectUserStatus(filter: UserStatusInspectionFilter) {
  return {
    userStatus: getMockUserStatusSummary(filter),
  };
}

export function inspectReadinessRegistry(filter: ReadinessRegistryInspectionFilter = {}) {
  let entries = listAcsReadinessRegistryEntries(createAcsReadinessRegistryFixtures());

  if (filter.domain) {
    entries = listAcsReadinessRegistryEntriesByDomain(filter.domain, entries);
  }

  if (filter.status) {
    entries = entries.filter((entry) => entry.status === filter.status);
  }

  if (filter.blockedOnly) {
    entries = listBlockedAcsReadinessRegistryEntries(entries);
  }

  return {
    filter: {
      ...(filter.domain ? { domain: filter.domain } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.blockedOnly ? { blockedOnly: true } : {}),
    },
    entries,
    summary: summarizeAcsReadinessRegistry(entries),
  };
}

export function inspectReadinessRegistryEntry(id: string) {
  return {
    entry: getAcsReadinessRegistryEntry(id, createAcsReadinessRegistryFixtures()),
  };
}

export function inspectReadinessRegistrySummary() {
  return {
    summary: summarizeAcsReadinessRegistry(createAcsReadinessRegistryFixtures()),
  };
}

export function inspectEpic10Readiness(filter: Epic10ReadinessInspectionFilter = {}) {
  return {
    readiness: createEpic10ReadinessReport(filter),
  };
}

export function inspectPermissionStateModel(filter: PermissionStateInspectionFilter = {}) {
  let entries = listAcsPermissionStateEntries(createAcsPermissionStateFixtures());

  if (filter.subject) {
    entries = listAcsPermissionStateEntriesBySubject(filter.subject, entries);
  }

  if (filter.domain) {
    entries = listAcsPermissionStateEntriesByDomain(filter.domain, entries);
  }

  if (filter.blockedOnly) {
    entries = listBlockedAcsPermissionStateEntries(entries);
  }

  return {
    filter: {
      ...(filter.subject ? { subject: filter.subject } : {}),
      ...(filter.domain ? { domain: filter.domain } : {}),
      ...(filter.blockedOnly ? { blockedOnly: true } : {}),
    },
    entries,
    summary: summarizeAcsPermissionState(entries),
  };
}

export function inspectPermissionStateEntry(id: string) {
  return {
    entry: getAcsPermissionStateEntry(id, createAcsPermissionStateFixtures()),
  };
}

export function inspectPermissionStateSummary() {
  return {
    summary: summarizeAcsPermissionState(createAcsPermissionStateFixtures()),
  };
}

export function inspectPermissionActionCheck(id: string, action: string) {
  return {
    result: checkAcsPermissionAction(id, action, createAcsPermissionStateFixtures()),
  };
}

export function inspectOperationalGateRegistry(filter: OperationalGateInspectionFilter = {}) {
  let gates = listAcsOperationalGates(createAcsOperationalGateFixtures());
  let actions = listAcsBlockedActions(createAcsBlockedActionFixtures());

  if (filter.domain) {
    gates = listAcsOperationalGatesByDomain(filter.domain, gates);
    actions = listAcsBlockedActionsByDomain(filter.domain, actions);
  }

  if (filter.blockedOnly) {
    gates = listBlockedOrClosedAcsOperationalGates(gates);
  }

  return {
    filter: {
      ...(filter.domain ? { domain: filter.domain } : {}),
      ...(filter.blockedOnly ? { blockedOnly: true } : {}),
    },
    gates,
    summary: summarizeAcsOperationalGates(gates, actions),
  };
}

export function inspectOperationalGateEntry(id: string) {
  return {
    gate: getAcsOperationalGate(id, createAcsOperationalGateFixtures()),
  };
}

export function inspectOperationalGateSummary() {
  return {
    summary: summarizeAcsOperationalGates(createAcsOperationalGateFixtures(), createAcsBlockedActionFixtures()),
  };
}

export function inspectBlockedActions(filter: BlockedActionInspectionFilter = {}) {
  const actions = filter.domain
    ? listAcsBlockedActionsByDomain(filter.domain, createAcsBlockedActionFixtures())
    : listAcsBlockedActions(createAcsBlockedActionFixtures());

  return {
    filter: {
      ...(filter.domain ? { domain: filter.domain } : {}),
    },
    actions,
  };
}

export function inspectBlockedActionEntry(id: string) {
  return {
    action: getAcsBlockedAction(id, createAcsBlockedActionFixtures()),
  };
}

export function inspectBlockedActionCheck(id: string) {
  return {
    result: checkAcsBlockedAction(id, createAcsBlockedActionFixtures()),
  };
}

export function inspectConsumerContractSnapshot() {
  return {
    snapshot: getAcsConsumerSnapshot(),
  };
}

export function inspectConsumerContractSummary() {
  return {
    summary: getAcsConsumerSummary(),
  };
}

export function inspectConsumerReadinessView() {
  return {
    readiness: getAcsConsumerReadinessView(),
  };
}

export function inspectConsumerPermissionView() {
  return {
    permissions: getAcsConsumerPermissionView(),
  };
}

export function inspectConsumerGateView() {
  return {
    gates: getAcsConsumerGateView(),
  };
}

export function inspectConsumerBlockedActionView() {
  return {
    blockedActions: getAcsConsumerBlockedActionView(),
  };
}

export function inspectConsumerActionPosture(action: string) {
  return {
    result: checkAcsConsumerActionPosture(action),
  };
}

export function inspectAxodusAppPreviewSnapshot() {
  return {
    snapshot: getAcsAxodusAppPreviewSnapshot(),
  };
}

export function inspectAxodusAppPreviewSummary() {
  return {
    summary: summarizeAcsAxodusAppPreviewPosture(),
  };
}

export function inspectAxodusAppReadinessCards() {
  return {
    cards: getAcsAxodusAppReadinessCards(),
  };
}

export function inspectAxodusAppPermissionCards() {
  return {
    cards: getAcsAxodusAppPermissionCards(),
  };
}

export function inspectAxodusAppGateCards() {
  return {
    cards: getAcsAxodusAppGateCards(),
  };
}

export function inspectAxodusAppBlockedActionCards() {
  return {
    cards: getAcsAxodusAppBlockedActionCards(),
  };
}

export function inspectAxodusAppCriticalWarnings() {
  return {
    warnings: getAcsAxodusAppCriticalWarnings(),
  };
}

export function inspectBusinessAlignmentSnapshot() {
  return {
    snapshot: getAcsBusinessAlignmentSnapshot(),
  };
}

export function inspectMarketplaceAlignmentSnapshot() {
  return {
    snapshot: getAcsMarketplaceAlignmentSnapshot(),
  };
}

export function inspectBusinessMarketplaceAlignmentSummary() {
  return {
    summary: getAcsBusinessMarketplaceAlignmentSummary(),
  };
}

export function inspectBusinessCommerceBlockedActions() {
  return {
    actions: getAcsBusinessCommerceBlockedActions(),
  };
}

export function inspectMarketplaceCommerceBlockedActions() {
  return {
    actions: getAcsMarketplaceCommerceBlockedActions(),
  };
}

export function inspectBusinessCriticalWarnings() {
  return {
    warnings: getAcsBusinessCriticalWarnings(),
  };
}

export function inspectMarketplaceCriticalWarnings() {
  return {
    warnings: getAcsMarketplaceCriticalWarnings(),
  };
}

export function inspectBusinessCommerceActionPosture(action: string) {
  return {
    result: checkAcsBusinessCommerceActionPosture(action),
  };
}

export function inspectMarketplaceCommerceActionPosture(action: string) {
  return {
    result: checkAcsMarketplaceCommerceActionPosture(action),
  };
}

export function inspectPerformanceRecords() {
  return {
    records: createSamplePerformanceRecordFixtures(),
  };
}

export function inspectAuditReceipts() {
  return {
    receipts: [createSampleAcsReceiptFixture()],
  };
}

export function inspectEmergencyStops() {
  return {
    mode: "mock",
    executionImpact: "policy_inspection_block_only",
    stops: createSampleEmergencyStopFixtures(),
    warnings: [
      "Emergency stop inspection is read-only in this phase.",
      "Future execution adapters must fail closed when matching active stops exist.",
    ],
  };
}

export function inspectSecretStorageStatus() {
  return {
    mode: "contract-only",
    storageEnabled: false,
    plaintextStorageAllowed: false,
    frontendSecretExposureAllowed: false,
    logSecretExposureAllowed: false,
    supportedSecretTypes: ["cex-api-key", "cex-api-secret", "oauth-token", "webhook-secret"],
    currentAdapter: "MockAcsSecretStorage",
    productionAdapterRequired: "KMS or Vault equivalent",
    frontendRules: [
      "Do not store API secrets in localStorage, sessionStorage, browser memory, or frontend logs.",
      "Display secretRef/status only; never display raw secret values.",
      "Recommend disabling withdrawal permissions and using IP permission/allowlist.",
    ],
    warnings: [
      "No real secret persistence is enabled.",
      "No real CEX API integration is enabled.",
    ],
  };
}

export function inspectObservabilityStatus() {
  return {
    mode: "inspection",
    correlationId: {
      enabled: true,
      acceptedHeaders: ["x-correlation-id", "x-request-id"],
      generatedWhenMissing: true,
    },
    responseEnvelope: {
      enabled: true,
      includes: ["success", "version", "correlationId", "timestamp", "data", "error", "warnings"],
    },
    telemetry: {
      runtimeTelemetryEnabled: true,
      httpTelemetryEnabled: false,
      externalExporterEnabled: false,
    },
    audit: {
      receiptsSupported: true,
      secretsRedacted: true,
      tenantScopedReceiptsSupported: true,
    },
    warnings: [
      "HTTP observability is contract-only in this phase.",
      "No external log, metric, trace, or telemetry exporter is enabled.",
    ],
  };
}

export function inspectPolicyCheck(input: PolicyCheckInput) {
  const emergencyStopDecision = inspectMockEmergencyStop(input);
  if (emergencyStopDecision) {
    return emergencyStopDecision;
  }

  const registry = new AcsCapabilityRegistry();
  const capability = registry.list().find((candidate) => candidate.id === input.capabilityId);

  if (capability) {
    return inspectCapabilityPolicyCheck(capability, input);
  }

  const matrixEntry = getPolicyMatrixEntry(input.capabilityId as AcsCapabilityId);
  return {
    policyContext: toPolicyContext({
      capabilityId: matrixEntry.capability,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.wallet ? { wallet: input.wallet } : {}),
      source: "policy-matrix",
    }),
    capabilityId: matrixEntry.capability,
    consumptionLevel: matrixEntry.consumableBy,
    automationLevel: matrixEntry.automationLevel,
    requiresGovernanceApproval: matrixEntry.governanceApprovalRequired,
    telemetryRequired: matrixEntry.telemetryRequired,
    receiptsRequired: matrixEntry.receiptRequired,
    ...toInspectionDecision(matrixEntry.automationLevel !== "blocked", matrixEntry.automationLevel === "blocked" ? "automation is blocked" : undefined),
  };
}

function inspectMockEmergencyStop(input: PolicyCheckInput) {
  const stoppedWallet = input.wallet?.toLowerCase() === ACS_FIXTURE_IDS.stoppedWallet;
  const stoppedTenant = input.tenantId === ACS_FIXTURE_IDS.emergencyTenant;
  const stoppedCapability = input.capabilityId === "product.emergency-blocked";

  if (!stoppedWallet && !stoppedTenant && !stoppedCapability) {
    return undefined;
  }

  return {
    policyContext: toPolicyContext({
      capabilityId: input.capabilityId,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.wallet ? { wallet: input.wallet } : {}),
      source: "emergency-stop",
    }),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    capabilityId: input.capabilityId,
    consumptionLevel: "product",
    automationLevel: "blocked",
    requiresGovernanceApproval: true,
    telemetryRequired: true,
    receiptsRequired: true,
    allowed: false,
    blockedReason: "emergency_stop_active",
    warnings: ["emergency stop active for requested policy context"],
  };
}

function inspectCapabilityPolicyCheck(capability: AcsServiceCapability, input: PolicyCheckInput) {
  const warnings = capability.automationLevel === "autonomous"
    ? ["autonomous execution is not enabled in the current ACS maturity stage"]
    : [];

  if (capability.level === "service" || (input.tenantId && capability.tenantAccessAllowed)) {
    const tenant = input.tenantId ? requireTenant(input.tenantId) : requireTenant("dao-alpha");
    const decision = evaluateTenantServiceAccess({
      tenant,
      capability,
      governanceApproved: tenant.governanceStatus === "active",
    });

    return {
      policyContext: toPolicyContext({
        capabilityId: capability.id,
        tenantId: tenant.tenantId,
        ...(input.wallet ? { wallet: input.wallet } : {}),
        source: "capability-registry",
      }),
      tenantId: tenant.tenantId,
      serviceId: capability.id,
      capabilityId: capability.id,
      ...toCapabilityInspection(capability),
      ...toInspectionDecision(decision.allowed, decision.reason, warnings),
    };
  }

  return {
    policyContext: toPolicyContext({
      capabilityId: capability.id,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.wallet ? { wallet: input.wallet } : {}),
      source: "capability-registry",
    }),
    capabilityId: capability.id,
    ...toCapabilityInspection(capability),
    ...toInspectionDecision(capability.automationLevel !== "blocked", undefined, warnings),
  };
}

function toPolicyContext(input: {
  readonly capabilityId: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly source: AcsPolicyInspectionContext["source"];
}): AcsPolicyInspectionContext {
  return {
    capabilityId: input.capabilityId,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    source: input.source,
    decisionSurface: "inspection",
    executionTriggered: false,
  };
}

function toCapabilityInspection(capability: AcsServiceCapability) {
  return {
    id: capability.id,
    name: capability.name,
    category: capability.category,
    consumptionLevel: capability.level,
    automationLevel: capability.automationLevel,
    requiresGovernanceApproval: capability.requiresGovernanceApproval,
    requiresTenantApproval: capability.requiresTenantApproval,
    requiresUserLicense: capability.requiresUserLicense,
    telemetryRequired: capability.telemetryRequired,
    receiptsRequired: capability.receiptsRequired,
    tenantAccessAllowed: capability.tenantAccessAllowed,
    productAccessAllowed: capability.productAccessAllowed,
    coreOnly: capability.coreOnly,
  };
}

function toInspectionDecision(allowed: boolean, blockedReason?: string, warnings: readonly string[] = []): InspectionDecision {
  return {
    allowed,
    ...(blockedReason ? { blockedReason } : {}),
    warnings,
  };
}

function requireTenant(tenantId: string): AcsTenantContext {
  const tenant = MOCK_TENANTS.find((candidate) => candidate.tenantId === tenantId);
  if (!tenant) {
    throw new Error(`unknown tenant: ${tenantId}`);
  }

  return tenant;
}

export function isReadinessRegistryInspectionFilter(input: {
  readonly domain?: string;
  readonly status?: string;
}): boolean {
  return (input.domain === undefined || isAcsReadinessDomain(input.domain))
    && (input.status === undefined || isAcsReadinessStatus(input.status));
}

export function isPermissionStateInspectionFilter(input: {
  readonly subject?: string;
  readonly domain?: string;
}): boolean {
  return (input.subject === undefined || typeof input.subject === "string")
    && (input.domain === undefined || isAcsPermissionDomain(input.domain));
}

export function isOperationalGateInspectionFilter(input: {
  readonly domain?: string;
}): boolean {
  return input.domain === undefined || isAcsOperationalGateDomain(input.domain);
}
