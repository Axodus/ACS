import { summarizeAcsOperationalGates } from "../gates.js";
import { summarizeAcsPermissionState } from "../permissions.js";
import { summarizeAcsReadinessRegistry } from "../readiness.js";

export type GovernanceActorState =
  | "authenticated"
  | "unauthenticated"
  | "system"
  | "local_operator"
  | "simulated"
  | "unknown";

export type AccessDecisionCategory =
  | "allowed"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "deferred"
  | "not_evaluated";

export type AccessEnforcementState = "enforced" | "projected" | "planned";

export type PermissionAuthorityState =
  | "allowed"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "deferred"
  | "requires_production_auth"
  | "requires_admin_boundary"
  | "requires_tenant_boundary";

export type PermissionBaselineCategory =
  | "read_control_plane"
  | "read_agents"
  | "mutate_agents"
  | "read_composition"
  | "read_execution"
  | "mutate_execution"
  | "read_evidence"
  | "read_economics"
  | "read_system"
  | "mutate_system"
  | "admin_boundary"
  | "tenant_boundary"
  | "secret_boundary";

export interface AccessDecision {
  readonly id: string;
  readonly actor: string;
  readonly permission: string;
  readonly action: string;
  readonly entityReference: string;
  readonly decision: AccessDecisionCategory;
  readonly reason: string;
  readonly timestamp: string;
  readonly gateDependency: string;
  readonly enforcement: AccessEnforcementState;
  readonly correlationId?: string;
}

export interface PermissionBaselineItem {
  readonly category: PermissionBaselineCategory;
  readonly label: string;
  readonly readAuthority: PermissionAuthorityState;
  readonly mutationAuthority: PermissionAuthorityState;
  readonly state: "allowed" | "blocked" | "unavailable" | "deferred" | "unsupported";
  readonly reason: string;
  readonly readinessGates: readonly string[];
}

export interface AuthoritySurface {
  readonly surface: string;
  readonly label: string;
  readonly readAuthority: PermissionAuthorityState;
  readonly mutationAuthority: PermissionAuthorityState;
  readonly reason: string;
  readonly notes: readonly string[];
}

export interface GovernanceBoundaryReport {
  readonly checkedAt: string;
  readonly claim: "not_claimed";
  readonly actorBoundary: {
    readonly state: GovernanceActorState;
    readonly source: string;
    readonly displayName: string;
    readonly productionAuthClaimed: false;
    readonly caveats: readonly string[];
  };
  readonly permissionBaseline: readonly PermissionBaselineItem[];
  readonly readMutateAuthority: readonly AuthoritySurface[];
  readonly tenantBoundary: {
    readonly state:
      | "single_tenant"
      | "tenant_aware"
      | "multi_tenant_observed"
      | "tenant_admin_unavailable"
      | "unknown";
    readonly tenantAdminReady: false;
    readonly isolationIndicators: readonly string[];
    readonly caveats: readonly string[];
  };
  readonly administrationBoundary: {
    readonly administrationReady: false;
    readonly state: "read_only" | "inspection_only" | "unsupported" | "unavailable" | "deferred";
    readonly allowedActions: readonly string[];
    readonly deniedActions: readonly AccessDecision[];
    readonly unsupportedActions: readonly AccessDecision[];
    readonly deferredActions: readonly string[];
  };
  readonly accessDecisions: readonly AccessDecision[];
  readonly deniedStates: readonly AccessDecision[];
  readonly unsupportedActions: readonly AccessDecision[];
  readonly auditCorrelation: {
    readonly state: "available" | "partial" | "planned" | "unavailable";
    readonly note: string;
    readonly evidence: readonly string[];
  };
  readonly readinessGateDependencies: readonly string[];
  readonly claimDiscipline: {
    readonly productionReadyClaimAllowed: false;
    readonly billingReadyClaimAllowed: false;
    readonly administrationReadyClaimAllowed: false;
    readonly tenantGovernanceReadyClaimAllowed: false;
    readonly reason: string;
  };
  readonly caveats: readonly string[];
  readonly deferredItems: readonly string[];
  readonly sourceEvidence: readonly string[];
}

export interface GovernanceBoundarySignals {
  readonly actorState?: GovernanceActorState;
  readonly tenantState?: GovernanceBoundaryReport["tenantBoundary"]["state"];
  readonly tenantAdminReady?: false;
  readonly auditCorrelation?: GovernanceBoundaryReport["auditCorrelation"]["state"];
  readonly isolationIndicators?: readonly string[];
}

const DEFAULT_SIGNALS: Required<Pick<
  GovernanceBoundarySignals,
  "actorState" | "tenantState" | "tenantAdminReady" | "auditCorrelation" | "isolationIndicators"
>> = {
  actorState: "unauthenticated",
  tenantState: "tenant_aware",
  tenantAdminReady: false,
  auditCorrelation: "unavailable",
  isolationIndicators: [],
};

const PERMISSION_BASELINE: readonly PermissionBaselineItem[] = [
  {
    category: "read_control_plane",
    label: "Read control plane",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "allowed",
    reason: "Control plane inspection is exposed read-only by the Product API.",
    readinessGates: ["G04", "G05", "G06"],
  },
  {
    category: "read_agents",
    label: "Read agents",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "allowed",
    reason: "Agent inventory and detail views are read-only projections from the Product API.",
    readinessGates: ["G04", "G05", "G06"],
  },
  {
    category: "mutate_agents",
    label: "Mutate agents",
    readAuthority: "allowed",
    mutationAuthority: "allowed",
    state: "allowed",
    reason: "Existing agent lifecycle mutations remain governed by the Product API for the local/sandbox surface; no production mutation authority is claimed.",
    readinessGates: ["G04", "G05"],
  },
  {
    category: "read_composition",
    label: "Read composition",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "allowed",
    reason: "Composition catalogs and effective capabilities are exposed read-only.",
    readinessGates: ["G04", "G05", "G06"],
  },
  {
    category: "read_execution",
    label: "Read execution",
    readAuthority: "allowed",
    mutationAuthority: "denied",
    state: "blocked",
    reason: "Execution state is visible, but production execution authority is not unlocked by this milestone.",
    readinessGates: ["G04", "G05", "G08"],
  },
  {
    category: "mutate_execution",
    label: "Mutate execution",
    readAuthority: "allowed",
    mutationAuthority: "allowed",
    state: "allowed",
    reason: "Sandbox runtime/deployment lifecycle mutations remain Product API governed; production execution remains blocked.",
    readinessGates: ["G04", "G05", "G08"],
  },
  {
    category: "read_evidence",
    label: "Read evidence",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "allowed",
    reason: "Operational evidence and audit projections are exposed read-only.",
    readinessGates: ["G09", "G13"],
  },
  {
    category: "read_economics",
    label: "Read economics",
    readAuthority: "allowed",
    mutationAuthority: "denied",
    state: "blocked",
    reason: "Economics is operational evidence; settlement and billing mutations are not part of this boundary.",
    readinessGates: ["G12", "G13"],
  },
  {
    category: "read_system",
    label: "Read system",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "allowed",
    reason: "System guardrails, configuration, policies, readiness, and governance projections are read-only.",
    readinessGates: ["G06", "G07", "G11"],
  },
  {
    category: "mutate_system",
    label: "Mutate system",
    readAuthority: "denied",
    mutationAuthority: "denied",
    state: "blocked",
    reason: "System mutation requires production auth, RBAC baseline, and administration boundary evidence.",
    readinessGates: ["G04", "G05", "G11"],
  },
  {
    category: "admin_boundary",
    label: "Administration boundary",
    readAuthority: "allowed",
    mutationAuthority: "denied",
    state: "blocked",
    reason: "Administration visibility is read-only; production admin actions are not available in EPIC-12.",
    readinessGates: ["G11"],
  },
  {
    category: "tenant_boundary",
    label: "Tenant boundary",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    state: "unsupported",
    reason: "Tenant-aware visibility exists, but tenant administration is unavailable and deferred.",
    readinessGates: ["G11"],
  },
  {
    category: "secret_boundary",
    label: "Secrets and credentials",
    readAuthority: "denied",
    mutationAuthority: "denied",
    state: "blocked",
    reason: "Credential state is redacted and secret values are never exposed or mutated by this surface.",
    readinessGates: ["G03", "G11"],
  },
];

const AUTHORITY_SURFACES: readonly AuthoritySurface[] = [
  {
    surface: "system-readiness",
    label: "System / readiness",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Readiness is a read-only Product API projection.",
    notes: ["No readiness mutation", "No production claim"],
  },
  {
    surface: "agents",
    label: "Agents",
    readAuthority: "allowed",
    mutationAuthority: "allowed",
    reason: "Agent lifecycle mutations are governed by the Product API in the local/sandbox surface.",
    notes: ["Delete requires archive and confirmation", "No production mutation authority"],
  },
  {
    surface: "agent-lifecycle",
    label: "Agent lifecycle",
    readAuthority: "allowed",
    mutationAuthority: "allowed",
    reason: "Revision, duplicate, archive, restore, and delete are Product API governed.",
    notes: ["Revision conflicts are rejected", "Destructive actions require archive/confirmation"],
  },
  {
    surface: "composition",
    label: "Composition",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Composition mutations are not supported by this milestone.",
    notes: ["Role/profile/skill/tool/plugin mutation deferred"],
  },
  {
    surface: "execution",
    label: "Execution",
    readAuthority: "allowed",
    mutationAuthority: "allowed",
    reason: "Sandbox deployment and runtime lifecycle remain Product API governed.",
    notes: ["Live/staged deployment modes are rejected", "No production execution authority"],
  },
  {
    surface: "workers",
    label: "Workers",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Worker state is visible; fleet mutation is out of scope.",
    notes: ["No drain/autoscale/registration mutation"],
  },
  {
    surface: "evidence",
    label: "Evidence",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Evidence and audit projections are read-only.",
    notes: ["Audit correlation planned, not fabricated"],
  },
  {
    surface: "economics",
    label: "Economics",
    readAuthority: "allowed",
    mutationAuthority: "denied",
    reason: "Economics is operational evidence; billing and settlement mutations are not available.",
    notes: ["No invoices", "No payment rails", "No budgets"],
  },
  {
    surface: "configuration",
    label: "Configuration",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Configuration is inspection-only.",
    notes: ["No settings mutation"],
  },
  {
    surface: "policies",
    label: "Policies",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Policy visibility is read-only; policy mutation is deferred.",
    notes: ["No policy engine rewrite"],
  },
  {
    surface: "administration",
    label: "Administration",
    readAuthority: "allowed",
    mutationAuthority: "denied",
    reason: "Administration boundary is visible but not operable.",
    notes: ["No production admin console", "Administration Ready remains false"],
  },
  {
    surface: "tenants",
    label: "Tenants",
    readAuthority: "allowed",
    mutationAuthority: "unsupported",
    reason: "Tenant-aware visibility exists; tenant administration is unavailable.",
    notes: ["No tenant CRUD", "No tenant billing", "Tenant Governance Ready remains false"],
  },
  {
    surface: "secrets-credentials",
    label: "Secrets / credentials",
    readAuthority: "denied",
    mutationAuthority: "denied",
    reason: "Credential metadata is redacted; raw secret values are never exposed or mutated.",
    notes: ["No secrets vault", "No rotation", "No credential lifecycle management"],
  },
];

function accessDecision(input: {
  readonly id: string;
  readonly permission: string;
  readonly action: string;
  readonly entityReference: string;
  readonly decision: AccessDecisionCategory;
  readonly reason: string;
  readonly gateDependency: string;
  readonly timestamp: string;
  readonly enforcement: AccessEnforcementState;
}): AccessDecision {
  return {
    actor: "unauthenticated inspection request",
    ...input,
  };
}

export function createGovernanceBoundaryReport(
  input: GovernanceBoundarySignals = {},
): GovernanceBoundaryReport {
  const signals = { ...DEFAULT_SIGNALS, ...input };
  const checkedAt = new Date().toISOString();
  const permissionSummary = summarizeAcsPermissionState();
  const operationalGateSummary = summarizeAcsOperationalGates();
  const readinessRegistrySummary = summarizeAcsReadinessRegistry();

  const allowedRead = accessDecision({
    id: "access.system.read",
    permission: "read_system",
    action: "read",
    entityReference: "system:governance-boundary",
    decision: "allowed",
    reason: "Read-only Product API projection is available to inspection requests.",
    gateDependency: "G06",
    timestamp: checkedAt,
    enforcement: "enforced",
  });
  const mutateAgent = accessDecision({
    id: "access.agents.mutate",
    permission: "mutate_agents",
    action: "mutate",
    entityReference: "agents:*",
    decision: "allowed",
    reason: "Existing agent lifecycle mutations are Product API governed for the local/sandbox surface.",
    gateDependency: "G04/G05",
    timestamp: checkedAt,
    enforcement: "enforced",
  });
  const deniedAdmin = accessDecision({
    id: "access.administration.mutate",
    permission: "admin_boundary",
    action: "mutate",
    entityReference: "system:administration",
    decision: "denied",
    reason: "Action denied: production administration is not available in EPIC-12.",
    gateDependency: "G11",
    timestamp: checkedAt,
    enforcement: "projected",
  });
  const deniedSecrets = accessDecision({
    id: "access.secrets.read_raw",
    permission: "secret_boundary",
    action: "read_raw",
    entityReference: "credentials:*",
    decision: "denied",
    reason: "Action denied: raw secret values must never be exposed through Product API, UI, logs, audit, evidence, or diagnostics.",
    gateDependency: "G03",
    timestamp: checkedAt,
    enforcement: "projected",
  });
  const unsupportedTenantAdmin = accessDecision({
    id: "access.tenants.admin",
    permission: "tenant_boundary",
    action: "administer",
    entityReference: "tenants:*",
    decision: "unsupported",
    reason: "Action unsupported: tenant administration is not in EPIC-12 scope.",
    gateDependency: "G11",
    timestamp: checkedAt,
    enforcement: "planned",
  });
  const unsupportedPolicyMutation = accessDecision({
    id: "access.policies.mutate",
    permission: "mutate_system",
    action: "mutate",
    entityReference: "system:policies",
    decision: "unsupported",
    reason: "Action unsupported: policy mutation is deferred beyond this boundary.",
    gateDependency: "G11",
    timestamp: checkedAt,
    enforcement: "planned",
  });
  const deferredBilling = accessDecision({
    id: "access.economics.billing",
    permission: "read_economics",
    action: "bill",
    entityReference: "economics:*",
    decision: "deferred",
    reason: "Billing, invoices, payment rails, tenant billing, and financial forecasting are deferred to EPIC-13+.",
    gateDependency: "G12",
    timestamp: checkedAt,
    enforcement: "planned",
  });

  const accessDecisions = [
    allowedRead,
    mutateAgent,
    deniedAdmin,
    deniedSecrets,
    unsupportedTenantAdmin,
    unsupportedPolicyMutation,
    deferredBilling,
  ];
  const deniedStates = accessDecisions.filter((entry) => entry.decision === "denied");
  const unsupportedActions = accessDecisions.filter((entry) => entry.decision === "unsupported");

  return {
    checkedAt,
    claim: "not_claimed",
    actorBoundary: {
      state: signals.actorState,
      source: "Product API inspection request without authenticated actor headers",
      displayName: "unauthenticated inspection request",
      productionAuthClaimed: false,
      caveats: [
        "This actor boundary does not constitute production authentication.",
        "No login, OAuth/OIDC, enterprise IAM, or production auth provider is claimed.",
      ],
    },
    permissionBaseline: PERMISSION_BASELINE,
    readMutateAuthority: AUTHORITY_SURFACES,
    tenantBoundary: {
      state: signals.tenantState,
      tenantAdminReady: false,
      isolationIndicators: [...signals.isolationIndicators],
      caveats: [
        "Tenant-aware visibility exists, but tenant administration is not available in EPIC-12.",
        "Declared worker isolation is a projection and does not prove production multi-tenant isolation.",
      ],
    },
    administrationBoundary: {
      administrationReady: false,
      state: "inspection_only",
      allowedActions: [
        "view administration boundary",
        "view configuration visibility",
        "view policy visibility",
        "view tenant visibility",
        "view readiness gates",
      ],
      deniedActions: [deniedAdmin, deniedSecrets],
      unsupportedActions: [unsupportedTenantAdmin, unsupportedPolicyMutation],
      deferredActions: [
        "production administration console",
        "enterprise tenant administration",
        "tenant user management",
        "tenant policy management",
        "RBAC administration",
        "secrets vault administration",
      ],
    },
    accessDecisions,
    deniedStates,
    unsupportedActions,
    auditCorrelation: {
      state: signals.auditCorrelation,
      note: "Audit events already carry actor, decision, correlationId, and tenantId fields, but governance-boundary decisions are not written to the audit trail in this sprint.",
      evidence: [
        "src/control-plane/audit-service.ts",
        "src/control-plane/governance-boundary.ts",
      ],
    },
    readinessGateDependencies: ["G03", "G04", "G05", "G06", "G07", "G08", "G11", "G12", "G13"],
    claimDiscipline: {
      productionReadyClaimAllowed: false,
      billingReadyClaimAllowed: false,
      administrationReadyClaimAllowed: false,
      tenantGovernanceReadyClaimAllowed: false,
      reason: "Production, billing, administration, and tenant governance readiness remain not claimed until EPIC-12 gates provide evidence.",
    },
    caveats: [
      "No production authentication is configured; this boundary is inspection-only.",
      "Permission model is representational and read-only in this phase.",
      `Permission model: ${permissionSummary.totalEntries} entries, ${permissionSummary.blockedEntries} blocked.`,
      `Operational gates: ${operationalGateSummary.totalGates} gates; mutation authority remains unavailable.`,
      `Readiness registry: ${readinessRegistrySummary.totalEntries} entries; production enforcement remains unavailable.`,
      "Browser visual acceptance remains pending for M03.",
    ],
    deferredItems: [
      "production admin console",
      "enterprise tenant administration",
      "tenant billing",
      "policy mutation",
      "secrets vault administration",
      "billing, invoices, and payment rails",
    ],
    sourceEvidence: [
      "src/control-plane/governance-boundary.ts",
      "src/permissions.ts",
      "src/gates.ts",
      "src/readiness.ts",
      "src/control-plane/audit-service.ts",
      "src/control-plane/product-api-client.ts",
      "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
      "docs/epics/epic-12/milestones/M02-governance-and-administration-boundary.md",
      "tests/s30-governance-boundary.test.mjs",
    ],
  };
}
