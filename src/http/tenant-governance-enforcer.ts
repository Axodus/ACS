import type { AcsAuthContext } from "./auth.js";
import type { ControlPlaneContext } from "./control-plane-context.js";
import { TenantNotFoundError } from "../control-plane/tenant-domain.js";
import {
  evaluateTenantGovernanceAuthority,
  type GovernedAction,
  type TenantEntitlementDecisionReceipt,
  type TenantGovernanceDecisionReceipt,
  type TenantLimitDecisionReceipt,
} from "../control-plane/tenant-governance.js";
import type { TenantMembership } from "../control-plane/tenant-membership.js";
import type { AdministrativeAuthority } from "../control-plane/tenant-membership.js";

export type TenantGovernanceEnforcementLayer =
  | "authority"
  | "governance"
  | "entitlement"
  | "limit"
  | "tenant_state"
  | "system_hard_limit"
  | "invalid_request"
  | "infrastructure";

export type TenantGovernanceEnforcementOperation =
  | "agent.create"
  | "agent.configure"
  | "deployment.create";

export interface TenantGovernanceEnforcementRequirement {
  readonly governedAction: GovernedAction;
  readonly entitlementKey?: string;
  readonly limitKey?: string;
  readonly requestedAmount?: number;
  readonly usage?: number;
}

export interface TenantGovernanceEnforcementInput {
  readonly context: ControlPlaneContext;
  readonly operation: TenantGovernanceEnforcementOperation;
  readonly requirement: TenantGovernanceEnforcementRequirement;
  readonly auth?: AcsAuthContext;
  readonly correlationId?: string;
  readonly at?: number;
  readonly actor?: string;
}

export interface TenantGovernanceEnforcementDecision {
  readonly tenantId: string;
  readonly operation: TenantGovernanceEnforcementOperation;
  readonly governedAction: GovernedAction;
  readonly allowed: boolean;
  readonly deniedLayer?: TenantGovernanceEnforcementLayer;
  readonly reason: string;
  readonly authority: AdministrativeAuthority;
  readonly authorityBasis: string;
  readonly authorityDecision: ReturnType<typeof evaluateTenantGovernanceAuthority>;
  readonly governanceDecision?: TenantGovernanceDecisionReceipt;
  readonly entitlementDecision?: TenantEntitlementDecisionReceipt;
  readonly limitDecision?: TenantLimitDecisionReceipt;
  readonly evaluatedAt: number;
}

export function enforceTenantGovernanceMutation(input: TenantGovernanceEnforcementInput): TenantGovernanceEnforcementDecision {
  const evaluatedAt = input.at ?? Date.now();
  const tenantId = input.context.isolation.scope.tenantId;

  try {
    const tenant = input.context.tenantService.getTenant(tenantId);
    const authority = resolveAuthority(input.auth, tenantId);
    const actorMembership = resolveActorMembership(input.context, authority);
    const authorityDecision = evaluateTenantGovernanceAuthority({
      action: "governance.mutate",
      authority,
      tenant,
      actorMembership,
    });

    if (!authorityDecision.allowed) {
      return {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer: authorityDecision.reason.includes("tenant state blocks governance mutation") ? "tenant_state" : "authority",
        reason: authorityDecision.reason,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        authorityDecision,
        evaluatedAt,
      };
    }

    const governanceDecision = input.context.tenantGovernanceService.evaluateGovernedAction({
      tenantId,
      action: input.requirement.governedAction,
      at: evaluatedAt,
      correlationId: input.correlationId,
      actor: input.actor ?? resolveActorId(input.auth),
    });

    if (governanceDecision.decision !== "allow") {
      return {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer: governanceDecision.basis === "tenant_state_archived" || governanceDecision.basis === "tenant_state_suspended"
          ? "tenant_state"
          : "governance",
        reason: governanceDecision.reason,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        authorityDecision,
        governanceDecision,
        evaluatedAt,
      };
    }

    let entitlementDecision: TenantEntitlementDecisionReceipt | undefined;
    if (input.requirement.entitlementKey) {
      entitlementDecision = input.context.tenantGovernanceService.evaluateEntitlement({
        tenantId,
        entitlementKey: input.requirement.entitlementKey,
        at: evaluatedAt,
      });
      if (!entitlementDecision.granted) {
        return {
          tenantId,
          operation: input.operation,
          governedAction: input.requirement.governedAction,
          allowed: false,
          deniedLayer: "entitlement",
          reason: entitlementDecision.reason,
          authority,
          authorityBasis: authorityDecision.authorityBasis,
          authorityDecision,
          governanceDecision,
          entitlementDecision,
          evaluatedAt,
        };
      }
    }

    let limitDecision: TenantLimitDecisionReceipt | undefined;
    if (input.requirement.limitKey) {
      limitDecision = input.context.tenantGovernanceService.evaluateLimit({
        tenantId,
        limitKey: input.requirement.limitKey,
        requestedAmount: input.requirement.requestedAmount,
        usage: input.requirement.usage,
        at: evaluatedAt,
      });
      if (!limitDecision.withinLimit) {
        const deniedLayer: TenantGovernanceEnforcementLayer =
          limitDecision.hardSystemLimit !== undefined
          && (limitDecision.configuredLimit === undefined || limitDecision.hardSystemLimit <= limitDecision.configuredLimit)
            ? "system_hard_limit"
            : "limit";
        return {
          tenantId,
          operation: input.operation,
          governedAction: input.requirement.governedAction,
          allowed: false,
          deniedLayer,
          reason: limitDecision.reason,
          authority,
          authorityBasis: authorityDecision.authorityBasis,
          authorityDecision,
          governanceDecision,
          entitlementDecision,
          limitDecision,
          evaluatedAt,
        };
      }
    }

    return {
      tenantId,
      operation: input.operation,
      governedAction: input.requirement.governedAction,
      allowed: true,
      reason: "tenant governance enforcement passed",
      authority,
      authorityBasis: authorityDecision.authorityBasis,
      authorityDecision,
      ...(governanceDecision ? { governanceDecision } : {}),
      ...(entitlementDecision ? { entitlementDecision } : {}),
      ...(limitDecision ? { limitDecision } : {}),
      evaluatedAt,
    };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer: "invalid_request",
        reason: error.message,
        authority: { kind: "platform_admin", principalId: "system" },
        authorityBasis: "unknown",
        authorityDecision: {
          allowed: false,
          reason: error.message,
          authorityBasis: "none",
        },
        evaluatedAt,
      };
    }

    return {
      tenantId,
      operation: input.operation,
      governedAction: input.requirement.governedAction,
      allowed: false,
      deniedLayer: "infrastructure",
      reason: error instanceof Error ? error.message : "tenant governance enforcement failed",
      authority: { kind: "platform_admin", principalId: "system" },
      authorityBasis: "unknown",
      authorityDecision: {
        allowed: false,
        reason: error instanceof Error ? error.message : "tenant governance enforcement failed",
        authorityBasis: "none",
      },
      evaluatedAt,
    };
  }
}

function resolveAuthority(auth: AcsAuthContext | undefined, tenantId: string): AdministrativeAuthority {
  if (!auth || auth.mode === "disabled") {
    return { kind: "platform_admin", principalId: "system" };
  }

  if (auth.actorType === "system" || auth.actorType === "governance") {
    return { kind: "platform_admin", principalId: auth.actorId ?? "system" };
  }

  const principalId = resolveActorId(auth);
  const tenantScope = auth.tenantId ?? tenantId;
  return {
    kind: "tenant_member",
    principalId,
    tenantId: tenantScope,
  };
}

function resolveActorMembership(context: ControlPlaneContext, authority: AdministrativeAuthority): TenantMembership | undefined {
  if (authority.kind !== "tenant_member") {
    return undefined;
  }
  try {
    return context.tenantMembershipService.getMembership(authority.tenantId, authority.principalId);
  } catch {
    return undefined;
  }
}

function resolveActorId(auth: AcsAuthContext | undefined): string {
  if (!auth?.actorId) {
    return "system";
  }
  return auth.actorId;
}
