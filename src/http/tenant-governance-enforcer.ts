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
  | "workforce.create"
  | "agent.configure"
  | "deployment.create"
  | "execution.start"
  | "economic.authorize"
  | "economic.reserve"
  | "economic.release"
  | "economic.remediate";

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

function recordEnforcementOutcome(input: {
  readonly context: ControlPlaneContext;
  readonly tenantId: string;
  readonly correlationId?: string;
  readonly evaluatedAt: number;
  readonly authority: AdministrativeAuthority;
  readonly authorityBasis: string;
  readonly decision: TenantGovernanceEnforcementDecision;
  readonly tenantStatus?: string;
  readonly tenantRevision?: number;
}) {
  input.context.auditService.recordEvent({
    eventType: "tenant.enforcement",
    correlationId: input.correlationId ?? "tenant-enforcement-" + input.evaluatedAt,
    tenantId: input.tenantId,
    actor: input.authority.kind === "tenant_member" ? input.authority.principalId : input.authority.principalId,
    revision: input.tenantRevision,
    decision: input.decision.allowed ? "allowed" : "denied",
    result: input.decision.allowed ? "success" : "failure",
    metadata: {
      tenantId: input.tenantId,
      operation: input.decision.operation,
      governedAction: input.decision.governedAction,
      authorityKind: input.authority.kind,
      authorityPrincipalId: input.authority.principalId,
      authorityBasis: input.authorityBasis,
      deniedLayer: input.decision.deniedLayer,
      reason: input.decision.reason,
      tenantStatus: input.tenantStatus,
      governanceDecision: input.decision.governanceDecision ? input.decision.governanceDecision.decision + ":" + input.decision.governanceDecision.basis : undefined,
      entitlementDecision: input.decision.entitlementDecision ? (input.decision.entitlementDecision.granted ? "granted" : "denied") + ":" + input.decision.entitlementDecision.entitlementKey : undefined,
      limitDecision: input.decision.limitDecision ? (input.decision.limitDecision.withinLimit ? "within_limit" : "exceeded") + ":" + input.decision.limitDecision.limitKey : undefined,
      evaluatedAt: input.evaluatedAt,
    },
  });
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
      const deniedLayer: TenantGovernanceEnforcementLayer = authorityDecision.reason.includes("tenant state blocks governance mutation") ? "tenant_state" : "authority";
      const decision: TenantGovernanceEnforcementDecision = {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer,
        reason: authorityDecision.reason,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        authorityDecision,
        evaluatedAt,
      };
      recordEnforcementOutcome({
        context: input.context,
        tenantId,
        correlationId: input.correlationId,
        evaluatedAt,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        decision,
        tenantStatus: tenant.status,
        tenantRevision: tenant.revision,
      });
      return decision;
    }

    const governanceDecision = input.context.tenantGovernanceService.evaluateGovernedAction({
      tenantId,
      action: input.requirement.governedAction,
      at: evaluatedAt,
      correlationId: input.correlationId,
      actor: input.actor ?? resolveActorId(input.auth),
    });

    if (governanceDecision.decision !== "allow") {
      const deniedLayer: TenantGovernanceEnforcementLayer =
        governanceDecision.basis === "tenant_state_archived" || governanceDecision.basis === "tenant_state_suspended"
          ? "tenant_state"
          : "governance";
      const decision: TenantGovernanceEnforcementDecision = {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer,
        reason: governanceDecision.reason,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        authorityDecision,
        governanceDecision,
        evaluatedAt,
      };
      recordEnforcementOutcome({
        context: input.context,
        tenantId,
        correlationId: input.correlationId,
        evaluatedAt,
        authority,
        authorityBasis: authorityDecision.authorityBasis,
        decision,
        tenantStatus: tenant.status,
        tenantRevision: tenant.revision,
      });
      return decision;
    }

    let entitlementDecision: TenantEntitlementDecisionReceipt | undefined;
    if (input.requirement.entitlementKey) {
      entitlementDecision = input.context.tenantGovernanceService.evaluateEntitlement({
        tenantId,
        entitlementKey: input.requirement.entitlementKey,
        at: evaluatedAt,
      });
      if (!entitlementDecision.granted) {
        const decision: TenantGovernanceEnforcementDecision = {
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
        recordEnforcementOutcome({
          context: input.context,
          tenantId,
          correlationId: input.correlationId,
          evaluatedAt,
          authority,
          authorityBasis: authorityDecision.authorityBasis,
          decision,
          tenantStatus: tenant.status,
          tenantRevision: tenant.revision,
        });
        return decision;
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
        const decision: TenantGovernanceEnforcementDecision = {
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
        recordEnforcementOutcome({
          context: input.context,
          tenantId,
          correlationId: input.correlationId,
          evaluatedAt,
          authority,
          authorityBasis: authorityDecision.authorityBasis,
          decision,
          tenantStatus: tenant.status,
          tenantRevision: tenant.revision,
        });
        return decision;
      }
    }

    const decision = {
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
    recordEnforcementOutcome({
      context: input.context,
      tenantId,
      correlationId: input.correlationId,
      evaluatedAt,
      authority,
      authorityBasis: authorityDecision.authorityBasis,
      decision,
      tenantStatus: tenant.status,
      tenantRevision: tenant.revision,
    });
    return decision;
  } catch (error) {
    const authority = resolveAuthority(input.auth, tenantId);
    if (error instanceof TenantNotFoundError) {
      const decision: TenantGovernanceEnforcementDecision = {
        tenantId,
        operation: input.operation,
        governedAction: input.requirement.governedAction,
        allowed: false,
        deniedLayer: "invalid_request",
        reason: error.message,
        authority,
        authorityBasis: "unknown",
        authorityDecision: {
          allowed: false,
          reason: error.message,
          authorityBasis: "none",
        },
        evaluatedAt,
      };
      recordEnforcementOutcome({
        context: input.context,
        tenantId,
        correlationId: input.correlationId,
        evaluatedAt,
        authority,
        authorityBasis: "unknown",
        decision,
      });
      return decision;
    }

    const decision: TenantGovernanceEnforcementDecision = {
      tenantId,
      operation: input.operation,
      governedAction: input.requirement.governedAction,
      allowed: false,
      deniedLayer: "infrastructure",
      reason: error instanceof Error ? error.message : "tenant governance enforcement failed",
      authority,
      authorityBasis: "unknown",
      authorityDecision: {
        allowed: false,
        reason: error instanceof Error ? error.message : "tenant governance enforcement failed",
        authorityBasis: "none",
      },
      evaluatedAt,
    };
    recordEnforcementOutcome({
      context: input.context,
      tenantId,
      correlationId: input.correlationId,
      evaluatedAt,
      authority,
      authorityBasis: "unknown",
      decision,
    });
    return decision;
  }
}

function resolveAuthority(auth: AcsAuthContext | undefined, tenantId: string): AdministrativeAuthority {
  if (!auth?.authenticated || !auth.trusted || !auth.actorId) {
    throw new Error("trusted authenticated actor is required for tenant governance enforcement");
  }

  if (auth.platformAdmin) {
    return { kind: "platform_admin", principalId: auth.actorId };
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
  if (!auth?.authenticated || !auth.trusted || !auth.actorId) {
    throw new Error("trusted authenticated actor is required");
  }
  return auth.actorId;
}
