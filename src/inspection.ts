import { ACS_POLICY_MATRIX, getPolicyMatrixEntry, type AcsCapabilityId } from "./acs-policy-matrix.js";
import { AcsCapabilityRegistry, type AcsServiceCapability } from "./capability-registry.js";
import type { AcsConsumptionLevel } from "./consumption-levels.js";
import { evaluateProductAccess, type AcsProductAccessContext } from "./product-access-registry.js";
import type { AcsTenantContext } from "./tenant-context.js";
import { evaluateTenantServiceAccess } from "./tenant-service-registry.js";

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
}

export interface InspectionDecision {
  readonly allowed: boolean;
  readonly blockedReason?: string;
  readonly warnings: readonly string[];
}

const MOCK_TENANTS: readonly AcsTenantContext[] = [
  {
    tenantId: "axodus-core",
    tenantType: "root",
    governanceStatus: "active",
    federationTier: "core",
    enabledServices: ["core.tenant-health-monitoring", "core.governance-alignment"],
    restrictions: [],
  },
  {
    tenantId: "dao-alpha",
    tenantType: "dao",
    governanceStatus: "active",
    federationTier: "standard",
    enabledServices: ["service.risk-analysis", "service.content-validation", "product.trading-ignition"],
    restrictions: [],
  },
  {
    tenantId: "dao-disabled",
    tenantType: "dao",
    governanceStatus: "suspended",
    federationTier: "standard",
    enabledServices: [],
    restrictions: ["acs.services.suspended"],
  },
];

function defaultProductAccess(walletAddress?: string): AcsProductAccessContext {
  return {
    ...(walletAddress ? { walletAddress } : {}),
    subscriptionActive: false,
    nftLicenseValid: walletAddress === "0xlicensed",
    marketplacePurchaseValid: false,
    governancePermission: true,
    userReadinessState: walletAddress === "0xlicensed" ? "READY" : "UNINITIALIZED",
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

export function inspectPolicyCheck(input: PolicyCheckInput) {
  const registry = new AcsCapabilityRegistry();
  const capability = registry.list().find((candidate) => candidate.id === input.capabilityId);

  if (capability) {
    return inspectCapabilityPolicyCheck(capability, input.tenantId);
  }

  const matrixEntry = getPolicyMatrixEntry(input.capabilityId as AcsCapabilityId);
  return {
    capabilityId: matrixEntry.capability,
    consumptionLevel: matrixEntry.consumableBy,
    automationLevel: matrixEntry.automationLevel,
    requiresGovernanceApproval: matrixEntry.governanceApprovalRequired,
    telemetryRequired: matrixEntry.telemetryRequired,
    receiptsRequired: matrixEntry.receiptRequired,
    ...toInspectionDecision(matrixEntry.automationLevel !== "blocked", matrixEntry.automationLevel === "blocked" ? "automation is blocked" : undefined),
  };
}

function inspectCapabilityPolicyCheck(capability: AcsServiceCapability, tenantId?: string) {
  const warnings = capability.automationLevel === "autonomous"
    ? ["autonomous execution is not enabled in the current ACS maturity stage"]
    : [];

  if (capability.level === "service" || (tenantId && capability.tenantAccessAllowed)) {
    const tenant = tenantId ? requireTenant(tenantId) : requireTenant("dao-alpha");
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
      ...toInspectionDecision(decision.allowed, decision.reason, warnings),
    };
  }

  return {
    capabilityId: capability.id,
    ...toCapabilityInspection(capability),
    ...toInspectionDecision(capability.automationLevel !== "blocked", undefined, warnings),
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
