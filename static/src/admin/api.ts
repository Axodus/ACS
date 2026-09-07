export type AdminActorType = "system" | "tenant-admin" | "tenant-member" | "auditor";

export interface AdminAccessContext {
  readonly actorType: AdminActorType;
  readonly actorId: string;
  readonly tenantId?: string;
  readonly authenticated: boolean;
  readonly wallet?: string;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: string;
  readonly details?: unknown;
  readonly retryable?: boolean;
  readonly severity?: string;

  constructor(message: string, options: { readonly status: number; readonly code: string; readonly correlationId?: string; readonly details?: unknown; readonly retryable?: boolean; readonly severity?: string }) {
    super(message);
    this.name = "AdminApiError";
    this.status = options.status;
    this.code = options.code;
    this.correlationId = options.correlationId;
    this.details = options.details;
    this.retryable = options.retryable;
    this.severity = options.severity;
  }
}

export type TenantStatus = "provisioning" | "active" | "suspended" | "archived";
export type MembershipStatus = "active" | "suspended" | "removed";
export type AdministrativeRole = "tenant_owner" | "tenant_admin" | "operator" | "auditor";
export type GovernanceEffect = "allow" | "deny";
export type GovernedAction = "agent.create" | "agent.configure" | "deployment.create" | "deployment.start" | "tool.install" | "plugin.install" | "execution.start";

export interface TenantLifecycleTimestamps {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly activatedAt?: number;
  readonly suspendedAt?: number;
  readonly archivedAt?: number;
}

export interface TenantAdministrativeMetadata {
  readonly displayName?: string;
  readonly description?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
}

export interface TenantOwnerSummary {
  readonly principalIds: readonly string[];
  readonly count: number;
}

export interface TenantMembershipSummary {
  readonly total: number;
  readonly active: number;
  readonly suspended: number;
  readonly removed: number;
}

export interface TenantGovernanceSummary {
  readonly hasPolicy: boolean;
  readonly policyId?: string;
  readonly defaultEffect?: GovernanceEffect;
  readonly ruleCount: number;
}

export interface TenantEntitlementSummary {
  readonly total: number;
  readonly enabled: number;
}

export interface TenantLimitSummary {
  readonly total: number;
}

export interface TenantAdminSummary {
  readonly tenantId: string;
  readonly status: TenantStatus;
  readonly administrativeMetadata?: TenantAdministrativeMetadata;
  readonly lifecycle?: TenantLifecycleTimestamps;
  readonly revision: number;
  readonly ownerSummary: TenantOwnerSummary;
  readonly membershipSummary: TenantMembershipSummary;
  readonly governanceSummary: TenantGovernanceSummary;
  readonly entitlementSummary: TenantEntitlementSummary;
  readonly limitSummary: TenantLimitSummary;
}

export interface TenantMembershipView {
  readonly tenantId: string;
  readonly principalId: string;
  readonly role: AdministrativeRole;
  readonly status: MembershipStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
}

export interface TenantGovernanceRuleView {
  readonly ruleId: string;
  readonly action: GovernedAction;
  readonly effect: GovernanceEffect;
  readonly priority: number;
  readonly reason?: string;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
}

export interface TenantGovernancePolicyView {
  readonly policyId: string;
  readonly tenantId: string;
  readonly defaultEffect: GovernanceEffect;
  readonly rules: readonly TenantGovernanceRuleView[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
}

export interface TenantEntitlementView {
  readonly entitlementKey: string;
  readonly tenantId: string;
  readonly enabled: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
}

export interface TenantLimitView {
  readonly limitKey: string;
  readonly tenantId: string;
  readonly value: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: { readonly actor?: string; readonly reason?: string; readonly source?: string };
  readonly evaluation?: {
    readonly tenantId: string;
    readonly limitKey: string;
    readonly configuredLimit?: number;
    readonly hardSystemLimit?: number;
    readonly effectiveLimit?: number;
    readonly requestedAmount?: number;
    readonly usage?: number;
    readonly withinLimit: boolean;
    readonly basis: string;
    readonly evaluatedAt: number;
    readonly revision: number;
    readonly reason: string;
  };
}

export type AdministrativeAuditCategory = "tenant.lifecycle" | "tenant.membership" | "tenant.ownership" | "tenant.governance" | "tenant.entitlement" | "tenant.limit" | "tenant.enforcement" | "tenant.unknown";
export type AdministrativeAuditOutcome = "succeeded" | "denied" | "failed" | "allowed";

export interface TenantAdministrativeAuditEntry {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly category: AdministrativeAuditCategory;
  readonly eventType: string;
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly actor?: string;
  readonly authorityBasis?: string;
  readonly authorityKind?: string;
  readonly authorityPrincipalId?: string;
  readonly deniedLayer?: string;
  readonly previousState?: string;
  readonly nextState?: string;
  readonly governanceDecision?: string;
  readonly entitlementDecision?: string;
  readonly limitDecision?: string;
  readonly outcome: AdministrativeAuditOutcome;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision?: number;
  readonly summary: string;
}

export interface TenantAdministrativeAuditFilter {
  readonly category?: AdministrativeAuditCategory;
  readonly outcome?: AdministrativeAuditOutcome;
  readonly actor?: string;
  readonly correlationId?: string;
  readonly eventType?: string;
}

export interface TenantAdministrativeAuditList {
  readonly tenantId: string;
  readonly entries: readonly TenantAdministrativeAuditEntry[];
  readonly total: number;
}

export interface TenantGovernanceStateView {
  readonly tenantId: string;
  readonly policy?: TenantGovernancePolicyView | null;
  readonly entitlements: readonly TenantEntitlementView[];
  readonly limits: readonly TenantLimitView[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
}

export interface TenantAdminDetail extends TenantAdminSummary {
  readonly memberships: readonly TenantMembershipView[];
  readonly governance: TenantGovernanceStateView;
}

export interface GovernanceDecisionView {
  readonly tenantId: string;
  readonly action: GovernedAction;
  readonly decision: GovernanceEffect;
  readonly basis: string;
  readonly policyId?: string;
  readonly matchedRuleId?: string;
  readonly evaluatedAt: number;
  readonly revision: number;
  readonly reason: string;
}

export interface MutationReceipt<TValue = unknown> {
  readonly tenantId?: string;
  readonly operation?: string;
  readonly timestamp?: number;
  readonly revision?: number;
  readonly receipt?: unknown;
  readonly event?: unknown;
  readonly value?: TValue;
  readonly tenant?: TenantAdminSummary | TenantAdminDetail;
  readonly detail?: TenantAdminDetail;
  readonly membership?: TenantMembershipView;
  readonly governance?: TenantGovernanceStateView;
}

export interface TenantCreateInput {
  readonly tenantId: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly createdBy?: string;
  readonly reason?: string;
}

export interface TenantPolicyRuleInput {
  readonly ruleId: string;
  readonly action: GovernedAction;
  readonly effect: GovernanceEffect;
  readonly priority: number;
  readonly reason?: string;
}

export interface TenantGovernancePolicyInput {
  readonly policyId: string;
  readonly defaultEffect: GovernanceEffect;
  readonly rules: readonly TenantPolicyRuleInput[];
  readonly reason?: string;
}

export interface TenantMemberInput {
  readonly principalId: string;
  readonly role: AdministrativeRole;
  readonly reason?: string;
}

export interface TenantMemberRoleInput {
  readonly role: AdministrativeRole;
  readonly reason?: string;
}

export interface OwnershipTransferInput {
  readonly fromPrincipalId: string;
  readonly toPrincipalId: string;
  readonly reason?: string;
}

export interface EntitlementInput {
  readonly enabled: boolean;
  readonly reason?: string;
}

export interface LimitInput {
  readonly value: number;
  readonly reason?: string;
}

export interface EvaluationInput {
  readonly action: GovernedAction;
}

const DEFAULT_CONTEXT: AdminAccessContext = {
  actorType: "system",
  actorId: "server-resolved-session",
  authenticated: true,
};

declare global {
  interface Window {
    __ACS_AUTH__?: { readonly accessToken?: string };
  }
}

export function readAdminAccessContext(): AdminAccessContext {
  return DEFAULT_CONTEXT;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveUrl(path: string): string {
  const base = normalizeBaseUrl((import.meta.env.VITE_ACS_API_BASE_URL ?? "").trim());
  return base ? base + path : path;
}

function appendQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? path + "?" + suffix : path;
}

function correlationId(): string {
  return "admin-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function createHeaders(context: AdminAccessContext, body?: BodyInit): HeadersInit {
  const headers: Record<string, string> = {
    "x-correlation-id": correlationId(),
  };
  const accessToken = typeof window !== "undefined" ? window.__ACS_AUTH__?.accessToken : undefined;
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  if (body && !(body instanceof FormData)) headers["content-type"] = "application/json";
  return headers;
}

async function requestJson<T>(context: AdminAccessContext, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(resolveUrl(path), {
    ...init,
    credentials: "same-origin",
    headers: {
      ...createHeaders(context, init.body ?? undefined),
      ...(init.headers ?? {}),
    },
  });

  let payload: { readonly success?: boolean; readonly data?: T; readonly error?: { readonly code?: string; readonly message?: string; readonly details?: unknown; readonly retryable?: boolean; readonly severity?: string }; readonly correlationId?: string } | undefined;
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = undefined;
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message ?? response.statusText ?? "request failed";
    throw new AdminApiError(message, {
      status: response.status,
      code: payload?.error?.code ?? "internal_error",
      correlationId: payload?.correlationId,
      details: payload?.error?.details,
      retryable: payload?.error?.retryable,
      severity: payload?.error?.severity,
    });
  }

  return (payload?.data ?? ({} as T)) as T;
}

export function createAdminApi(context: AdminAccessContext) {
  return {
    listTenants: () => requestJson<readonly TenantAdminSummary[]>(context, "/api/v1/admin/tenants"),
    createTenant: (input: TenantCreateInput) => requestJson<{ readonly tenant: TenantAdminSummary; readonly receipt: unknown }>(context, "/api/v1/admin/tenants", { method: "POST", body: JSON.stringify(input) }),
    getTenant: (tenantId: string) => requestJson<TenantAdminDetail>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId)),
    listTenantAuditEntries: (tenantId: string, filter?: TenantAdministrativeAuditFilter) => requestJson<TenantAdministrativeAuditList>(context, appendQuery("/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/audit", {
      category: filter?.category,
      outcome: filter?.outcome,
      actor: filter?.actor,
      correlationId: filter?.correlationId,
      eventType: filter?.eventType,
    })),
    getTenantAuditEntry: (tenantId: string, eventId: string) => requestJson<{ readonly tenantId: string; readonly event: TenantAdministrativeAuditEntry }>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/audit/" + encodeURIComponent(eventId)),
    activateTenant: (tenantId: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/activate", { method: "POST" }),
    suspendTenant: (tenantId: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/suspend", { method: "POST" }),
    reactivateTenant: (tenantId: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/reactivate", { method: "POST" }),
    archiveTenant: (tenantId: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/archive", { method: "POST" }),
    bootstrapOwner: (tenantId: string, input: { readonly principalId: string; readonly reason?: string }) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/ownership/bootstrap", { method: "POST", body: JSON.stringify(input) }),
    transferOwnership: (tenantId: string, input: OwnershipTransferInput) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/ownership/transfer", { method: "POST", body: JSON.stringify(input) }),
    listMembers: (tenantId: string) => requestJson<readonly TenantMembershipView[]>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members"),
    addMember: (tenantId: string, input: TenantMemberInput) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members", { method: "POST", body: JSON.stringify(input) }),
    changeRole: (tenantId: string, principalId: string, input: TenantMemberRoleInput) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members/" + encodeURIComponent(principalId) + "/change-role", { method: "POST", body: JSON.stringify(input) }),
    suspendMember: (tenantId: string, principalId: string, reason?: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members/" + encodeURIComponent(principalId) + "/suspend", { method: "POST", body: JSON.stringify(reason ? { reason } : {}) }),
    reactivateMember: (tenantId: string, principalId: string, reason?: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members/" + encodeURIComponent(principalId) + "/reactivate", { method: "POST", body: JSON.stringify(reason ? { reason } : {}) }),
    removeMember: (tenantId: string, principalId: string, reason?: string) => requestJson<MutationReceipt>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/members/" + encodeURIComponent(principalId) + "/remove", { method: "POST", body: JSON.stringify(reason ? { reason } : {}) }),
    readGovernance: (tenantId: string) => requestJson<TenantGovernanceStateView>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/governance"),
    savePolicy: (tenantId: string, input: TenantGovernancePolicyInput) => requestJson<MutationReceipt<TenantGovernancePolicyView>>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/governance/policy", { method: "PUT", body: JSON.stringify(input) }),
    evaluateGovernance: (tenantId: string, input: EvaluationInput) => requestJson<GovernanceDecisionView>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/governance/evaluate", { method: "POST", body: JSON.stringify(input) }),
    listEntitlements: (tenantId: string) => requestJson<readonly TenantEntitlementView[]>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/entitlements"),
    setEntitlement: (tenantId: string, entitlementKey: string, input: EntitlementInput) => requestJson<MutationReceipt<TenantEntitlementView>>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/entitlements/" + encodeURIComponent(entitlementKey), { method: "PUT", body: JSON.stringify(input) }),
    removeEntitlement: (tenantId: string, entitlementKey: string) => requestJson<MutationReceipt<TenantEntitlementView>>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/entitlements/" + encodeURIComponent(entitlementKey), { method: "DELETE" }),
    listLimits: (tenantId: string) => requestJson<readonly TenantLimitView[]>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/limits"),
    setLimit: (tenantId: string, limitKey: string, input: LimitInput) => requestJson<MutationReceipt<TenantLimitView>>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/limits/" + encodeURIComponent(limitKey), { method: "PUT", body: JSON.stringify(input) }),
    clearLimit: (tenantId: string, limitKey: string) => requestJson<MutationReceipt<TenantLimitView>>(context, "/api/v1/admin/tenants/" + encodeURIComponent(tenantId) + "/limits/" + encodeURIComponent(limitKey), { method: "DELETE" }),
  };
}

export function formatAdminDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}
