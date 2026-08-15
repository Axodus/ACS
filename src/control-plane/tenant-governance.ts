import { AcsError } from "../errors.js";
import type { AuditService } from "./audit-service.js";
import type { AdministrativeAuthority, PrincipalId, TenantMembership, TenantMembershipService } from "./tenant-membership.js";
import type { Tenant, TenantRepository, TenantStatus } from "./tenant-domain.js";

export type GovernanceEffect = "allow" | "deny";

export type GovernedAction =
  | "agent.create"
  | "agent.configure"
  | "deployment.create"
  | "deployment.start"
  | "tool.install"
  | "plugin.install"
  | "execution.start";

export type TenantGovernanceAdministrativeAction =
  | "governance.read"
  | "governance.mutate"
  | "entitlement.read"
  | "entitlement.mutate"
  | "limit.read"
  | "limit.mutate";

export type GovernanceAuthorityBasis =
  | "platform_admin"
  | "tenant_owner"
  | "tenant_admin"
  | "operator"
  | "auditor"
  | "none";

export type GovernanceMutationOperation = "policy.replace" | "entitlement.grant" | "entitlement.revoke" | "limit.set" | "limit.clear";

export type GovernanceDecisionBasis =
  | "system_hard_prohibition"
  | "tenant_state_suspended"
  | "tenant_state_archived"
  | "explicit_tenant_deny"
  | "explicit_tenant_allow"
  | "tenant_default"
  | "no_policy_configured_default_deny";

export type EntitlementDecisionBasis =
  | "explicit_grant"
  | "explicit_revoke"
  | "missing_default_denied"
  | "tenant_state_suspended"
  | "tenant_state_archived";

export type LimitDecisionBasis =
  | "tenant_override"
  | "system_hard_limit"
  | "tenant_and_system_limit"
  | "no_limit_configured"
  | "limit_exceeded";

export interface TenantGovernanceProvenance {
  readonly actor?: string;
  readonly reason?: string;
  readonly source?: string;
}

export interface TenantGovernanceRule {
  readonly ruleId: string;
  readonly action: GovernedAction;
  readonly effect: GovernanceEffect;
  readonly priority: number;
  readonly reason?: string;
  readonly provenance?: TenantGovernanceProvenance;
}

export interface TenantGovernancePolicy {
  readonly policyId: string;
  readonly tenantId: string;
  readonly defaultEffect: GovernanceEffect;
  readonly rules: readonly TenantGovernanceRule[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: TenantGovernanceProvenance;
}

export interface TenantEntitlement {
  readonly entitlementKey: string;
  readonly tenantId: string;
  readonly enabled: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: TenantGovernanceProvenance;
}

export interface TenantLimit {
  readonly limitKey: string;
  readonly tenantId: string;
  readonly value: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly provenance?: TenantGovernanceProvenance;
}

export interface TenantGovernanceState {
  readonly tenantId: string;
  readonly policy?: TenantGovernancePolicy;
  readonly entitlements: readonly TenantEntitlement[];
  readonly limits: readonly TenantLimit[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
}

export interface TenantGovernanceMutationEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly operation: GovernanceMutationOperation;
  readonly authorityKind: AdministrativeAuthority["kind"];
  readonly authorityPrincipalId: PrincipalId;
  readonly actor?: string;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision: number;
  readonly objectType: "policy" | "entitlement" | "limit";
  readonly key: string;
  readonly previousValue?: unknown;
  readonly nextValue: unknown;
}

export interface TenantGovernanceDecisionEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly action: GovernedAction;
  readonly decision: GovernanceEffect;
  readonly basis: GovernanceDecisionBasis;
  readonly policyId?: string;
  readonly matchedRuleId?: string;
  readonly actor?: string;
  readonly timestamp: number;
  readonly revision: number;
}

export interface TenantGovernanceDecisionReceipt {
  readonly tenantId: string;
  readonly action: GovernedAction;
  readonly decision: GovernanceEffect;
  readonly basis: GovernanceDecisionBasis;
  readonly policyId?: string;
  readonly matchedRuleId?: string;
  readonly evaluatedAt: number;
  readonly revision: number;
  readonly reason: string;
  readonly event?: TenantGovernanceDecisionEvent;
}

export interface TenantEntitlementDecisionReceipt {
  readonly tenantId: string;
  readonly entitlementKey: string;
  readonly granted: boolean;
  readonly basis: EntitlementDecisionBasis;
  readonly evaluatedAt: number;
  readonly revision: number;
  readonly reason: string;
}

export interface TenantLimitDecisionReceipt {
  readonly tenantId: string;
  readonly limitKey: string;
  readonly configuredLimit?: number;
  readonly hardSystemLimit?: number;
  readonly effectiveLimit?: number;
  readonly requestedAmount?: number;
  readonly usage?: number;
  readonly withinLimit: boolean;
  readonly basis: LimitDecisionBasis;
  readonly evaluatedAt: number;
  readonly revision: number;
  readonly reason: string;
}

export interface GovernanceMutationReceipt<TValue> {
  readonly tenantId: string;
  readonly operation: GovernanceMutationOperation;
  readonly authorityKind: AdministrativeAuthority["kind"];
  readonly authorityPrincipalId: PrincipalId;
  readonly actor?: string;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision: number;
  readonly previousValue?: TValue;
  readonly nextValue: TValue;
  readonly event: TenantGovernanceMutationEvent;
}

export interface TenantGovernanceAuthorityDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly authorityBasis: GovernanceAuthorityBasis;
}

export class TenantGovernancePolicyValidationError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_GOVERNANCE_POLICY_INVALID");
  }
}

export class InvalidGovernedActionError extends AcsError {
  constructor(action: string) {
    super("invalid governed action: " + action, "ACS_TENANT_GOVERNED_ACTION_INVALID");
  }
}

export class InvalidGovernanceEffectError extends AcsError {
  constructor(effect: string) {
    super("invalid governance effect: " + effect, "ACS_TENANT_GOVERNANCE_EFFECT_INVALID");
  }
}

export class GovernanceMutationUnauthorizedError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_GOVERNANCE_MUTATION_UNAUTHORIZED");
  }
}

export class TenantStateBlocksGovernanceMutationError extends AcsError {
  constructor(tenantId: string, state: TenantStatus, operation: GovernanceMutationOperation) {
    super("tenant " + tenantId + " in state " + state + " blocks governance mutation " + operation, "ACS_TENANT_STATE_BLOCKS_GOVERNANCE_MUTATION");
  }
}

export class CrossTenantGovernanceMutationError extends AcsError {
  constructor(authorityTenantId: string, targetTenantId: string) {
    super("cross-tenant governance mutation forbidden: " + authorityTenantId + " cannot mutate " + targetTenantId, "ACS_TENANT_CROSS_TENANT_GOVERNANCE_FORBIDDEN");
  }
}

export class ArchivedTenantGovernanceMutationError extends AcsError {
  constructor(tenantId: string, operation: GovernanceMutationOperation) {
    super("archived tenant " + tenantId + " cannot perform governance mutation " + operation, "ACS_TENANT_ARCHIVED_GOVERNANCE_MUTATION");
  }
}

export class InvalidEntitlementError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_ENTITLEMENT_INVALID");
  }
}

export class InvalidLimitError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_LIMIT_INVALID");
  }
}

export class LimitExceedsHardSystemMaximumError extends AcsError {
  constructor(limitKey: string, value: number, maximum: number) {
    super("limit " + limitKey + " value " + value + " exceeds hard system maximum " + maximum, "ACS_TENANT_LIMIT_EXCEEDS_HARD_MAXIMUM");
  }
}

export class GovernanceRuleNotFoundError extends AcsError {
  constructor(ruleId: string) {
    super("governance rule not found: " + ruleId, "ACS_TENANT_GOVERNANCE_RULE_NOT_FOUND");
  }
}

const GOVERNED_ACTIONS = new Set<GovernedAction>([
  "agent.create",
  "agent.configure",
  "deployment.create",
  "deployment.start",
  "tool.install",
  "plugin.install",
  "execution.start",
]);

const GOVERNANCE_EFFECTS = new Set<GovernanceEffect>(["allow", "deny"]);

function validateAction(action: string): GovernedAction {
  if (!GOVERNED_ACTIONS.has(action as GovernedAction)) {
    throw new InvalidGovernedActionError(action);
  }
  return action as GovernedAction;
}

function validateEffect(effect: string): GovernanceEffect {
  if (!GOVERNANCE_EFFECTS.has(effect as GovernanceEffect)) {
    throw new InvalidGovernanceEffectError(effect);
  }
  return effect as GovernanceEffect;
}

function validateNonNegativeInteger(name: string, value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new InvalidLimitError(name + " must be a non-negative integer");
  }
  return value;
}

function validateKey(name: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new InvalidEntitlementError(name + " is required");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) {
    throw new InvalidEntitlementError("invalid " + name + ": " + value);
  }
  return normalized;
}

function isTenantReadAllowed(tenant: Tenant): boolean {
  return true;
}

function isTenantMutationAllowed(tenant: Tenant): boolean {
  return tenant.status === "provisioning" || tenant.status === "active";
}

export function evaluateTenantGovernanceAuthority(input: {
  readonly action: TenantGovernanceAdministrativeAction;
  readonly authority: AdministrativeAuthority;
  readonly tenant: Tenant;
  readonly actorMembership?: TenantMembership;
}): TenantGovernanceAuthorityDecision {
  if (input.authority.kind === "platform_admin") {
    if (input.action.endsWith(".read")) {
      return { allowed: isTenantReadAllowed(input.tenant), reason: isTenantReadAllowed(input.tenant) ? "platform administrative read allowed" : "archived tenant is not readable for governance", authorityBasis: "platform_admin" };
    }
    return {
      allowed: isTenantMutationAllowed(input.tenant),
      reason: isTenantMutationAllowed(input.tenant) ? "platform administrative mutation allowed" : "tenant state blocks governance mutation",
      authorityBasis: "platform_admin",
    };
  }

  if (input.authority.tenantId !== input.tenant.tenantId) {
    return { allowed: false, reason: "cross-tenant governance mutation forbidden", authorityBasis: "none" };
  }

  const membership = input.actorMembership;
  if (!membership || membership.status !== "active") {
    return { allowed: false, reason: "active tenant membership required", authorityBasis: "none" };
  }

  if (input.action.endsWith(".read")) {
    return {
      allowed: isTenantReadAllowed(input.tenant),
      reason: isTenantReadAllowed(input.tenant) ? "tenant-scoped governance read allowed" : "archived tenant is not readable for governance",
      authorityBasis: membership.role,
    };
  }

  if (!isTenantMutationAllowed(input.tenant)) {
    return {
      allowed: false,
      reason: "tenant state blocks governance mutation",
      authorityBasis: membership.role,
    };
  }

  if (membership.role !== "tenant_owner") {
    return {
      allowed: false,
      reason: "only tenant_owner may mutate governance, entitlements, and limits",
      authorityBasis: membership.role,
    };
  }

  return {
    allowed: true,
    reason: "tenant_owner governance authority granted",
    authorityBasis: "tenant_owner",
  };
}

export interface TenantGovernanceRepository {
  get(tenantId: string): TenantGovernanceState;
  save(state: TenantGovernanceState, expectedRevision: number): TenantGovernanceState;
  list(): readonly TenantGovernanceState[];
  history(tenantId: string): readonly TenantGovernanceState[];
}

export class TenantGovernanceStateNotFoundError extends AcsError {
  constructor(tenantId: string) {
    super("tenant governance state not found: " + tenantId, "ACS_TENANT_GOVERNANCE_STATE_NOT_FOUND");
  }
}

export class InMemoryTenantGovernanceRepository implements TenantGovernanceRepository {
  readonly #states = new Map<string, TenantGovernanceState>();
  readonly #history = new Map<string, TenantGovernanceState[]>();

  get(tenantId: string): TenantGovernanceState {
    const state = this.#states.get(tenantId);
    if (!state) {
      throw new TenantGovernanceStateNotFoundError(tenantId);
    }
    return state;
  }

  save(state: TenantGovernanceState, expectedRevision: number): TenantGovernanceState {
    const current = this.#states.get(state.tenantId);
    if (current && current.revision !== expectedRevision) {
      throw new AcsError(
        "tenant governance revision conflict: expected " + expectedRevision + " but found " + current.revision,
        "ACS_TENANT_GOVERNANCE_REVISION_CONFLICT",
      );
    }

    this.#states.set(state.tenantId, state);
    const entries = this.#history.get(state.tenantId) ?? [];
    this.#history.set(state.tenantId, [...entries, state]);
    return state;
  }

  list(): readonly TenantGovernanceState[] {
    return [...this.#states.values()].sort((left, right) => left.tenantId.localeCompare(right.tenantId));
  }

  history(tenantId: string): readonly TenantGovernanceState[] {
    return [...(this.#history.get(tenantId) ?? [])];
  }
}

export interface TenantGovernanceServiceOptions {
  readonly tenantRepository: TenantRepository;
  readonly membershipService: TenantMembershipService;
  readonly repository?: TenantGovernanceRepository;
  readonly auditService?: AuditService;
  readonly hardSystemPolicy?: Readonly<Partial<Record<GovernedAction, GovernanceEffect>>>;
  readonly hardSystemLimits?: Readonly<Record<string, number>>;
}

export interface ReplaceTenantGovernancePolicyInput {
  readonly tenantId: string;
  readonly authority: AdministrativeAuthority;
  readonly policyId: string;
  readonly defaultEffect: GovernanceEffect;
  readonly rules: readonly TenantGovernanceRule[];
  readonly at: number;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly provenance?: string;
}

export interface SetTenantEntitlementInput {
  readonly tenantId: string;
  readonly authority: AdministrativeAuthority;
  readonly entitlementKey: string;
  readonly enabled: boolean;
  readonly at: number;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly provenance?: string;
}

export interface SetTenantLimitInput {
  readonly tenantId: string;
  readonly authority: AdministrativeAuthority;
  readonly limitKey: string;
  readonly value: number;
  readonly at: number;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly provenance?: string;
}

export interface EvaluateGovernedActionInput {
  readonly tenantId: string;
  readonly action: GovernedAction;
  readonly at: number;
  readonly correlationId?: string;
  readonly actor?: string;
}

export interface EvaluateTenantEntitlementInput {
  readonly tenantId: string;
  readonly entitlementKey: string;
  readonly at: number;
}

export interface EvaluateTenantLimitInput {
  readonly tenantId: string;
  readonly limitKey: string;
  readonly requestedAmount?: number;
  readonly usage?: number;
  readonly at: number;
}

function cloneRules(rules: readonly TenantGovernanceRule[]): readonly TenantGovernanceRule[] {
  return [...rules].map((rule) => ({
    ruleId: rule.ruleId.trim(),
    action: validateAction(rule.action),
    effect: validateEffect(rule.effect),
    priority: validateNonNegativeInteger("priority", rule.priority),
    ...(rule.reason ? { reason: rule.reason } : {}),
    ...(rule.provenance ? { provenance: rule.provenance } : {}),
  }));
}

function normalizePolicy(input: ReplaceTenantGovernancePolicyInput, existing?: TenantGovernancePolicy): TenantGovernancePolicy {
  validateEffect(input.defaultEffect);
  const policyId = input.policyId.trim();
  if (!policyId) {
    throw new TenantGovernancePolicyValidationError("policyId is required");
  }

  return {
    policyId,
    tenantId: input.tenantId,
    defaultEffect: input.defaultEffect,
    rules: [...cloneRules(input.rules)].sort((left, right) =>
      right.priority === left.priority
        ? left.effect === right.effect
          ? left.ruleId.localeCompare(right.ruleId)
          : left.effect === "deny"
            ? -1
            : 1
        : right.priority - left.priority,
    ),
    createdAt: existing?.createdAt ?? input.at,
    updatedAt: input.at,
    revision: (existing?.revision ?? 0) + 1,
    ...(input.actor || input.reason || input.provenance
      ? {
          provenance: {
            ...(input.actor ? { actor: input.actor } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
            ...(input.provenance ? { source: input.provenance } : {}),
          },
        }
      : {}),
  };
}

function nextStateFromTenantGovernanceSnapshot(state: TenantGovernanceState, patch: Partial<TenantGovernanceState>): TenantGovernanceState {
  return {
    ...state,
    ...patch,
    revision: state.revision + 1,
    updatedAt: patch.updatedAt ?? state.updatedAt,
  };
}

function createSnapshot(tenantId: string, at: number): TenantGovernanceState {
  return {
    tenantId,
    entitlements: [],
    limits: [],
    createdAt: at,
    updatedAt: at,
    revision: 1,
  };
}

function upsertEntitlement(items: readonly TenantEntitlement[], next: TenantEntitlement): readonly TenantEntitlement[] {
  const without = items.filter((item) => item.entitlementKey !== next.entitlementKey);
  return [...without, next].sort((left, right) => left.entitlementKey.localeCompare(right.entitlementKey));
}

function upsertLimit(items: readonly TenantLimit[], next: TenantLimit): readonly TenantLimit[] {
  const without = items.filter((item) => item.limitKey !== next.limitKey);
  return [...without, next].sort((left, right) => left.limitKey.localeCompare(right.limitKey));
}

function findEntitlement(state: TenantGovernanceState, entitlementKey: string): TenantEntitlement | undefined {
  return state.entitlements.find((item) => item.entitlementKey === entitlementKey);
}

function findLimit(state: TenantGovernanceState, limitKey: string): TenantLimit | undefined {
  return state.limits.find((item) => item.limitKey === limitKey);
}

function resolveHardSystemLimit(hardSystemLimits: Readonly<Record<string, number>> | undefined, limitKey: string): number | undefined {
  const limit = hardSystemLimits?.[limitKey];
  if (limit === undefined) return undefined;
  return validateNonNegativeInteger("hardSystemLimit", limit);
}

function resolveGovernanceDecision(
  input: {
    readonly tenant: Tenant;
    readonly action: GovernedAction;
    readonly state?: TenantGovernanceState;
    readonly hardSystemPolicy?: Readonly<Partial<Record<GovernedAction, GovernanceEffect>>>;
  },
): { readonly decision: GovernanceEffect; readonly basis: GovernanceDecisionBasis; readonly policyId?: string; readonly matchedRuleId?: string; readonly reason: string } {
  const hardSystemDecision = input.hardSystemPolicy?.[input.action];
  if (hardSystemDecision === "deny") {
    return {
      decision: "deny",
      basis: "system_hard_prohibition",
      reason: "system hard policy prohibits " + input.action,
    };
  }

  if (input.tenant.status === "suspended") {
    return {
      decision: "deny",
      basis: "tenant_state_suspended",
      reason: "tenant is suspended",
    };
  }

  if (input.tenant.status === "archived") {
    return {
      decision: "deny",
      basis: "tenant_state_archived",
      reason: "tenant is archived",
    };
  }

  const policy = input.state?.policy;
  if (!policy) {
    return {
      decision: "deny",
      basis: "no_policy_configured_default_deny",
      reason: "no governance policy configured; default decision is deny",
    };
  }

  const matchingRule = policy.rules.find((rule) => rule.action === input.action);
  if (matchingRule) {
    return {
      decision: matchingRule.effect,
      basis: matchingRule.effect === "deny" ? "explicit_tenant_deny" : "explicit_tenant_allow",
      policyId: policy.policyId,
      matchedRuleId: matchingRule.ruleId,
      reason: matchingRule.reason ?? "matched explicit tenant rule",
    };
  }

  return {
    decision: policy.defaultEffect,
    basis: "tenant_default",
    policyId: policy.policyId,
    reason: "no explicit rule matched; using tenant default effect",
  };
}

export class TenantGovernanceService {
  readonly #tenantRepository: TenantRepository;
  readonly #membershipService: TenantMembershipService;
  readonly #repository: TenantGovernanceRepository;
  readonly #auditService?: AuditService;
  readonly #hardSystemPolicy: Readonly<Partial<Record<GovernedAction, GovernanceEffect>>>;
  readonly #hardSystemLimits: Readonly<Record<string, number>>;

  constructor(options: TenantGovernanceServiceOptions) {
    this.#tenantRepository = options.tenantRepository;
    this.#membershipService = options.membershipService;
    this.#repository = options.repository ?? new InMemoryTenantGovernanceRepository();
    this.#auditService = options.auditService;
    this.#hardSystemPolicy = options.hardSystemPolicy ?? {};
    this.#hardSystemLimits = options.hardSystemLimits ?? {};
  }

  readGovernanceState(tenantId: string, authority: AdministrativeAuthority): TenantGovernanceState {
    const tenant = this.#tenantRepository.get(tenantId);
    const membership = this.#membershipOrUndefined(authority);
    const decision = evaluateTenantGovernanceAuthority({ action: "governance.read", authority, tenant, actorMembership: membership });
    if (!decision.allowed) {
      throw new GovernanceMutationUnauthorizedError(decision.reason);
    }
    return this.#repository.list().find((state) => state.tenantId === tenantId) ?? createSnapshot(tenantId, Date.now());
  }

  replacePolicy(input: ReplaceTenantGovernancePolicyInput): GovernanceMutationReceipt<TenantGovernancePolicy> {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const membership = this.#membershipOrUndefined(input.authority);
    this.#assertMutationAuthority({ tenant, authority: input.authority, membership, operation: "policy.replace" });

    const current = this.#snapshotOrDefault(tenant.tenantId, input.at);
    const policy = normalizePolicy(input, current.policy);
    const next = nextStateFromTenantGovernanceSnapshot(current, {
      policy,
      updatedAt: input.at,
      entitlements: current.entitlements,
      limits: current.limits,
    });
    this.#repository.save(next, current.revision);
    const event = this.#recordMutationEvent({
      input,
      tenantId: tenant.tenantId,
      operation: "policy.replace",
      authority: input.authority,
      objectType: "policy",
      key: policy.policyId,
      previousValue: current.policy,
      nextValue: policy,
      revision: next.revision,
    });
    return this.#receipt<TenantGovernancePolicy>({ tenantId: tenant.tenantId, operation: "policy.replace", authority: input.authority, actor: input.actor, reason: input.reason, timestamp: input.at, revision: next.revision, previousValue: current.policy, nextValue: policy, event });
  }

  grantEntitlement(input: SetTenantEntitlementInput): GovernanceMutationReceipt<TenantEntitlement> {
    return this.#mutateEntitlement(input, true);
  }

  revokeEntitlement(input: SetTenantEntitlementInput): GovernanceMutationReceipt<TenantEntitlement> {
    return this.#mutateEntitlement(input, false);
  }

  setLimit(input: SetTenantLimitInput): GovernanceMutationReceipt<TenantLimit> {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const membership = this.#membershipOrUndefined(input.authority);
    this.#assertMutationAuthority({ tenant, authority: input.authority, membership, operation: "limit.set" });

    const limitKey = validateKey("limitKey", input.limitKey);
    const value = validateNonNegativeInteger("limit value", input.value);
    const hardMaximum = resolveHardSystemLimit(this.#hardSystemLimits, limitKey);
    if (hardMaximum !== undefined && value > hardMaximum) {
      throw new LimitExceedsHardSystemMaximumError(limitKey, value, hardMaximum);
    }

    const current = this.#snapshotOrDefault(tenant.tenantId, input.at);
    const previousValue = findLimit(current, limitKey);
    const nextLimit: TenantLimit = {
      limitKey,
      tenantId: tenant.tenantId,
      value,
      createdAt: previousValue?.createdAt ?? input.at,
      updatedAt: input.at,
      revision: (previousValue?.revision ?? 0) + 1,
      ...(input.actor || input.reason || input.provenance
        ? {
            provenance: {
              ...(input.actor ? { actor: input.actor } : {}),
              ...(input.reason ? { reason: input.reason } : {}),
              ...(input.provenance ? { source: input.provenance } : {}),
            },
          }
        : {}),
    };
    const next = nextStateFromTenantGovernanceSnapshot(current, {
      limits: upsertLimit(current.limits, nextLimit),
      updatedAt: input.at,
    });
    this.#repository.save(next, current.revision);
    const event = this.#recordMutationEvent({
      input,
      tenantId: tenant.tenantId,
      operation: "limit.set",
      authority: input.authority,
      objectType: "limit",
      key: limitKey,
      previousValue,
      nextValue: nextLimit,
      revision: next.revision,
    });
    return this.#receipt<TenantLimit>({ tenantId: tenant.tenantId, operation: "limit.set", authority: input.authority, actor: input.actor, reason: input.reason, timestamp: input.at, revision: next.revision, previousValue, nextValue: nextLimit, event });
  }

  clearLimit(input: SetTenantLimitInput): GovernanceMutationReceipt<TenantLimit | undefined> {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const membership = this.#membershipOrUndefined(input.authority);
    this.#assertMutationAuthority({ tenant, authority: input.authority, membership, operation: "limit.clear" });

    const limitKey = validateKey("limitKey", input.limitKey);
    const current = this.#snapshotOrDefault(tenant.tenantId, input.at);
    const previousValue = findLimit(current, limitKey);
    if (!previousValue) {
      throw new GovernanceRuleNotFoundError(limitKey);
    }
    const next = nextStateFromTenantGovernanceSnapshot(current, {
      limits: current.limits.filter((item) => item.limitKey !== limitKey),
      updatedAt: input.at,
    });
    this.#repository.save(next, current.revision);
    const event = this.#recordMutationEvent({
      input,
      tenantId: tenant.tenantId,
      operation: "limit.clear",
      authority: input.authority,
      objectType: "limit",
      key: limitKey,
      previousValue,
      nextValue: undefined,
      revision: next.revision,
    });
    return this.#receipt<TenantLimit | undefined>({ tenantId: tenant.tenantId, operation: "limit.clear", authority: input.authority, actor: input.actor, reason: input.reason, timestamp: input.at, revision: next.revision, previousValue, nextValue: undefined, event });
  }

  evaluateGovernedAction(input: EvaluateGovernedActionInput): TenantGovernanceDecisionReceipt {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const state = this.#repository.list().find((item) => item.tenantId === tenant.tenantId);
    const resolved = resolveGovernanceDecision({ tenant, action: input.action, state, hardSystemPolicy: this.#hardSystemPolicy });
    const receipt: TenantGovernanceDecisionReceipt = {
      tenantId: tenant.tenantId,
      action: input.action,
      decision: resolved.decision,
      basis: resolved.basis,
      ...(resolved.policyId ? { policyId: resolved.policyId } : {}),
      ...(resolved.matchedRuleId ? { matchedRuleId: resolved.matchedRuleId } : {}),
      evaluatedAt: input.at,
      revision: state?.revision ?? tenant.revision,
      reason: resolved.reason,
    };
    const event = this.#auditService?.recordEvent({
      eventType: "governance.evaluated",
      correlationId: input.correlationId ?? "tenant-governance:" + tenant.tenantId + ":" + input.action + ":" + input.at,
      tenantId: tenant.tenantId,
      actor: input.actor,
      decision: resolved.decision === "allow" ? "allowed" : "denied",
      revision: receipt.revision,
      metadata: {
        action: input.action,
        basis: resolved.basis,
        ...(resolved.policyId ? { policyId: resolved.policyId } : {}),
        ...(resolved.matchedRuleId ? { matchedRuleId: resolved.matchedRuleId } : {}),
        reason: resolved.reason,
      },
    });
    return { ...receipt, ...(event ? { event: { eventId: event.eventId, correlationId: event.correlationId, tenantId: event.tenantId!, action: input.action, decision: resolved.decision, basis: resolved.basis, ...(resolved.policyId ? { policyId: resolved.policyId } : {}), ...(resolved.matchedRuleId ? { matchedRuleId: resolved.matchedRuleId } : {}), ...(input.actor ? { actor: input.actor } : {}), timestamp: event.timestamp, revision: receipt.revision } } : {}) };
  }

  evaluateEntitlement(input: EvaluateTenantEntitlementInput): TenantEntitlementDecisionReceipt {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const state = this.#repository.list().find((item) => item.tenantId === tenant.tenantId);
    const entitlementKey = validateKey("entitlementKey", input.entitlementKey);
    const entitlement = state ? findEntitlement(state, entitlementKey) : undefined;
    if (tenant.status === "suspended") {
      return {
        tenantId: tenant.tenantId,
        entitlementKey,
        granted: false,
        basis: "tenant_state_suspended",
        evaluatedAt: input.at,
        revision: state?.revision ?? tenant.revision,
        reason: "tenant is suspended",
      };
    }
    if (tenant.status === "archived") {
      return {
        tenantId: tenant.tenantId,
        entitlementKey,
        granted: false,
        basis: "tenant_state_archived",
        evaluatedAt: input.at,
        revision: state?.revision ?? tenant.revision,
        reason: "tenant is archived",
      };
    }
    if (!entitlement) {
      return {
        tenantId: tenant.tenantId,
        entitlementKey,
        granted: false,
        basis: "missing_default_denied",
        evaluatedAt: input.at,
        revision: state?.revision ?? tenant.revision,
        reason: "entitlement is not configured; default decision is denied",
      };
    }
    return {
      tenantId: tenant.tenantId,
      entitlementKey,
      granted: entitlement.enabled,
      basis: entitlement.enabled ? "explicit_grant" : "explicit_revoke",
      evaluatedAt: input.at,
      revision: state?.revision ?? tenant.revision,
      reason: entitlement.enabled ? "entitlement enabled" : "entitlement disabled",
    };
  }

  evaluateLimit(input: EvaluateTenantLimitInput): TenantLimitDecisionReceipt {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const state = this.#repository.list().find((item) => item.tenantId === tenant.tenantId);
    const limitKey = validateKey("limitKey", input.limitKey);
    const configured = state ? findLimit(state, limitKey)?.value : undefined;
    const hardMaximum = resolveHardSystemLimit(this.#hardSystemLimits, limitKey);
    const effectiveLimit = configured !== undefined && hardMaximum !== undefined ? Math.min(configured, hardMaximum) : configured ?? hardMaximum;
    const usage = input.usage;
    const requested = input.requestedAmount;
    if (requested !== undefined) {
      validateNonNegativeInteger("requestedAmount", requested);
    }
    if (usage !== undefined) {
      validateNonNegativeInteger("usage", usage);
    }
    const consumed = (usage ?? 0) + (requested ?? 0);
    const withinLimit = effectiveLimit === undefined ? true : consumed <= effectiveLimit;
    return {
      tenantId: tenant.tenantId,
      limitKey,
      ...(configured !== undefined ? { configuredLimit: configured } : {}),
      ...(hardMaximum !== undefined ? { hardSystemLimit: hardMaximum } : {}),
      ...(effectiveLimit !== undefined ? { effectiveLimit } : {}),
      ...(requested !== undefined ? { requestedAmount: requested } : {}),
      ...(usage !== undefined ? { usage } : {}),
      withinLimit,
      basis: withinLimit ? (configured !== undefined && hardMaximum !== undefined ? "tenant_and_system_limit" : configured !== undefined ? "tenant_override" : hardMaximum !== undefined ? "system_hard_limit" : "no_limit_configured") : "limit_exceeded",
      evaluatedAt: input.at,
      revision: state?.revision ?? tenant.revision,
      reason: withinLimit ? "limit check passed" : "requested amount exceeds effective limit",
    };
  }

  #membershipOrUndefined(authority: AdministrativeAuthority): TenantMembership | undefined {
    if (authority.kind !== "tenant_member") return undefined;
    try {
      return this.#membershipService.getMembership(authority.tenantId, authority.principalId);
    } catch {
      return undefined;
    }
  }

  #snapshotOrDefault(tenantId: string, at: number): TenantGovernanceState {
    try {
      return this.#repository.get(tenantId);
    } catch (error) {
      if (error instanceof TenantGovernanceStateNotFoundError) {
        return createSnapshot(tenantId, at);
      }
      throw error;
    }
  }

  #assertMutationAuthority(input: {
    readonly tenant: Tenant;
    readonly authority: AdministrativeAuthority;
    readonly membership?: TenantMembership;
    readonly operation: GovernanceMutationOperation;
  }): void {
    if (input.authority.kind === "tenant_member" && input.authority.tenantId !== input.tenant.tenantId) {
      throw new CrossTenantGovernanceMutationError(input.authority.tenantId, input.tenant.tenantId);
    }

    if (input.tenant.status === "suspended") {
      throw new TenantStateBlocksGovernanceMutationError(input.tenant.tenantId, input.tenant.status, input.operation);
    }

    if (input.tenant.status === "archived") {
      throw new ArchivedTenantGovernanceMutationError(input.tenant.tenantId, input.operation);
    }

    const action: TenantGovernanceAdministrativeAction =
      input.operation === "policy.replace"
        ? "governance.mutate"
        : input.operation === "limit.clear" || input.operation === "limit.set"
          ? "limit.mutate"
          : "entitlement.mutate";

    const decision = evaluateTenantGovernanceAuthority({
      action,
      authority: input.authority,
      tenant: input.tenant,
      actorMembership: input.membership,
    });

    if (!decision.allowed) {
      throw new GovernanceMutationUnauthorizedError(decision.reason);
    }
  }

  #mutateEntitlement(input: SetTenantEntitlementInput, enabled: boolean): GovernanceMutationReceipt<TenantEntitlement> {
    const tenant = this.#tenantRepository.get(input.tenantId);
    const membership = this.#membershipOrUndefined(input.authority);
    this.#assertMutationAuthority({ tenant, authority: input.authority, membership, operation: enabled ? "entitlement.grant" : "entitlement.revoke" });

    const entitlementKey = validateKey("entitlementKey", input.entitlementKey);
    const current = this.#snapshotOrDefault(tenant.tenantId, input.at);
    const previousValue = findEntitlement(current, entitlementKey);
    const nextEntitlement: TenantEntitlement = {
      entitlementKey,
      tenantId: tenant.tenantId,
      enabled,
      createdAt: previousValue?.createdAt ?? input.at,
      updatedAt: input.at,
      revision: (previousValue?.revision ?? 0) + 1,
      ...(input.actor || input.reason || input.provenance
        ? {
            provenance: {
              ...(input.actor ? { actor: input.actor } : {}),
              ...(input.reason ? { reason: input.reason } : {}),
              ...(input.provenance ? { source: input.provenance } : {}),
            },
          }
        : {}),
    };
    const next = nextStateFromTenantGovernanceSnapshot(current, {
      entitlements: upsertEntitlement(current.entitlements, nextEntitlement),
      updatedAt: input.at,
    });
    this.#repository.save(next, current.revision);
    const operation = enabled ? "entitlement.grant" : "entitlement.revoke";
    const event = this.#recordMutationEvent({
      input,
      tenantId: tenant.tenantId,
      operation,
      authority: input.authority,
      objectType: "entitlement",
      key: entitlementKey,
      previousValue,
      nextValue: nextEntitlement,
      revision: next.revision,
    });
    return this.#receipt<TenantEntitlement>({ tenantId: tenant.tenantId, operation, authority: input.authority, actor: input.actor, reason: input.reason, timestamp: input.at, revision: next.revision, previousValue, nextValue: nextEntitlement, event });
  }

  #receipt<TValue>(input: {
    readonly tenantId: string;
    readonly operation: GovernanceMutationOperation;
    readonly authority: AdministrativeAuthority;
    readonly actor?: string;
    readonly reason?: string;
    readonly timestamp: number;
    readonly revision: number;
    readonly previousValue?: TValue;
    readonly nextValue: TValue;
    readonly event: TenantGovernanceMutationEvent;
  }): GovernanceMutationReceipt<TValue> {
    return {
      tenantId: input.tenantId,
      operation: input.operation,
      authorityKind: input.authority.kind,
      authorityPrincipalId: input.authority.principalId,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      timestamp: input.timestamp,
      revision: input.revision,
      ...(input.previousValue !== undefined ? { previousValue: input.previousValue } : {}),
      nextValue: input.nextValue,
      event: input.event,
    };
  }

  #recordMutationEvent(input: {
    readonly input: { readonly correlationId?: string; readonly actor?: string; readonly reason?: string };
    readonly tenantId: string;
    readonly operation: GovernanceMutationOperation;
    readonly authority: AdministrativeAuthority;
    readonly objectType: "policy" | "entitlement" | "limit";
    readonly key: string;
    readonly previousValue?: unknown;
    readonly nextValue: unknown;
    readonly revision: number;
  }): TenantGovernanceMutationEvent {
    const event = this.#auditService?.recordEvent({
      eventType:
        input.operation === "policy.replace"
          ? "tenant.governance.policy_replaced"
          : input.operation === "entitlement.grant"
            ? "tenant.governance.entitlement_granted"
            : input.operation === "entitlement.revoke"
              ? "tenant.governance.entitlement_revoked"
              : input.operation === "limit.set"
                ? "tenant.governance.limit_set"
                : "tenant.governance.limit_cleared",
      correlationId: input.input.correlationId ?? "tenant-governance:" + input.tenantId + ":" + input.operation + ":" + input.revision,
      tenantId: input.tenantId,
      actor: input.input.actor,
      revision: input.revision,
      metadata: {
        authorityKind: input.authority.kind,
        authorityPrincipalId: input.authority.principalId,
        objectType: input.objectType,
        key: input.key,
        operation: input.operation,
        ...(input.input.reason ? { reason: input.input.reason } : {}),
        ...(input.previousValue !== undefined ? { previousValue: input.previousValue } : {}),
        nextValue: input.nextValue,
      },
    });
    return {
      eventId: event?.eventId ?? "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
      correlationId: event?.correlationId ?? input.input.correlationId ?? "tenant-governance:" + input.tenantId + ":" + input.operation + ":" + input.revision,
      tenantId: input.tenantId,
      operation: input.operation,
      authorityKind: input.authority.kind,
      authorityPrincipalId: input.authority.principalId,
      ...(input.input.actor ? { actor: input.input.actor } : {}),
      ...(input.input.reason ? { reason: input.input.reason } : {}),
      timestamp: event?.timestamp ?? Date.now(),
      revision: input.revision,
      objectType: input.objectType,
      key: input.key,
      ...(input.previousValue !== undefined ? { previousValue: input.previousValue } : {}),
      nextValue: input.nextValue,
    };
  }
}
