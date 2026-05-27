import type { AcsAutomationLevel, AcsConsumptionLevel } from "./consumption-levels.js";

export type AcsServiceCapabilityCategory =
  | "trading"
  | "risk"
  | "governance"
  | "content"
  | "media"
  | "support"
  | "automation";

export interface AcsServiceCapability {
  readonly id: string;
  readonly name: string;
  readonly category: AcsServiceCapabilityCategory;
  readonly level: AcsConsumptionLevel;
  readonly requiresTenantApproval: boolean;
  readonly requiresUserLicense: boolean;
  readonly requiresGovernanceApproval: boolean;
  readonly automationAllowed: boolean;
  readonly automationLevel: AcsAutomationLevel;
  readonly coreOnly: boolean;
  readonly tenantAccessAllowed: boolean;
  readonly productAccessAllowed: boolean;
  readonly receiptsRequired: boolean;
  readonly telemetryRequired: boolean;
}

export const ACS_CAPABILITIES: readonly AcsServiceCapability[] = [
  {
    id: "core.tenant-health-monitoring",
    name: "Tenant Health Monitoring",
    category: "governance",
    level: "core",
    requiresTenantApproval: false,
    requiresUserLicense: false,
    requiresGovernanceApproval: false,
    automationAllowed: false,
    automationLevel: "assisted",
    coreOnly: true,
    tenantAccessAllowed: false,
    productAccessAllowed: false,
    receiptsRequired: true,
    telemetryRequired: true,
  },
  {
    id: "core.governance-alignment",
    name: "Governance Alignment Check",
    category: "governance",
    level: "core",
    requiresTenantApproval: false,
    requiresUserLicense: false,
    requiresGovernanceApproval: false,
    automationAllowed: false,
    automationLevel: "assisted",
    coreOnly: true,
    tenantAccessAllowed: false,
    productAccessAllowed: false,
    receiptsRequired: true,
    telemetryRequired: true,
  },
  {
    id: "service.risk-analysis",
    name: "Tenant Risk Analysis",
    category: "risk",
    level: "service",
    requiresTenantApproval: true,
    requiresUserLicense: false,
    requiresGovernanceApproval: true,
    automationAllowed: false,
    automationLevel: "manual_approval",
    coreOnly: false,
    tenantAccessAllowed: true,
    productAccessAllowed: false,
    receiptsRequired: true,
    telemetryRequired: true,
  },
  {
    id: "service.content-validation",
    name: "Tenant Content Validation",
    category: "content",
    level: "service",
    requiresTenantApproval: true,
    requiresUserLicense: false,
    requiresGovernanceApproval: false,
    automationAllowed: false,
    automationLevel: "assisted",
    coreOnly: false,
    tenantAccessAllowed: true,
    productAccessAllowed: false,
    receiptsRequired: true,
    telemetryRequired: true,
  },
  {
    id: "product.trading-ignition",
    name: "Trading Ignition",
    category: "trading",
    level: "product",
    requiresTenantApproval: false,
    requiresUserLicense: true,
    requiresGovernanceApproval: true,
    automationAllowed: false,
    automationLevel: "manual_approval",
    coreOnly: false,
    tenantAccessAllowed: true,
    productAccessAllowed: true,
    receiptsRequired: true,
    telemetryRequired: true,
  },
  {
    id: "product.course-assistant",
    name: "Course Assistant",
    category: "support",
    level: "product",
    requiresTenantApproval: false,
    requiresUserLicense: true,
    requiresGovernanceApproval: false,
    automationAllowed: false,
    automationLevel: "assisted",
    coreOnly: false,
    tenantAccessAllowed: true,
    productAccessAllowed: true,
    receiptsRequired: true,
    telemetryRequired: true,
  },
];

export class AcsCapabilityRegistry {
  readonly #capabilities = new Map<string, AcsServiceCapability>();

  constructor(capabilities: readonly AcsServiceCapability[] = ACS_CAPABILITIES) {
    for (const capability of capabilities) {
      this.register(capability);
    }
  }

  register(capability: AcsServiceCapability): void {
    this.#capabilities.set(capability.id, capability);
  }

  require(capabilityId: string): AcsServiceCapability {
    const capability = this.#capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`unknown ACS capability: ${capabilityId}`);
    }

    return capability;
  }

  list(): readonly AcsServiceCapability[] {
    return [...this.#capabilities.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  listByLevel(level: AcsConsumptionLevel): readonly AcsServiceCapability[] {
    return this.list().filter((capability) => capability.level === level);
  }
}

