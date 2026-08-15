# EPIC-15 Contracts

## 1. Tenant aggregate contract

    type TenantStatus = provisioning | active | suspended | archived

    interface Tenant {
      tenantId: string
      name?: string
      status: TenantStatus
      createdAt: number
      updatedAt: number
      createdBy?: string
      updatedBy?: string
      archivedAt?: number
      provenance?: {
        actor?: string
        reason?: string
        source?: string
      }
    }

Tenant is the administrative aggregate. Its canonical identity is stable and immutable. Hard delete remains deferred.

## 2. Membership and authority contract

    type PrincipalId = string

    type AdministrativeRole = tenant_owner | tenant_admin | operator | auditor

    type TenantMembershipStatus = active | suspended | removed

    type AdministrativeAuthority =
      | { kind: platform_admin; principalId: PrincipalId }
      | { kind: tenant_member; tenantId: string; principalId: PrincipalId }

    interface TenantMembership {
      tenantId: string
      principalId: PrincipalId
      role: AdministrativeRole
      status: TenantMembershipStatus
      createdAt: number
      updatedAt: number
      revision: number
      createdBy?: string
      updatedBy?: string
      provenance?: {
        actor?: string
        reason?: string
        source?: string
      }
    }

Membership is ACS-canonical for tenant administration. Authentication may remain external. platform_admin is an explicit authority basis, not a membership role.

## 3. Authority contract

    type TenantAdministrativeAction =
      | governance.read
      | governance.mutate
      | entitlement.read
      | entitlement.mutate
      | limit.read
      | limit.mutate

Authority semantics are explicit and tenant-scoped unless platform scope is explicitly declared.

## 4. Governance policy contract

    type GovernedAction =
      | agent.create
      | agent.configure
      | deployment.create
      | deployment.start
      | tool.install
      | plugin.install
      | execution.start

    type GovernanceEffect = allow | deny

    interface TenantGovernanceRule {
      action: GovernedAction
      effect: GovernanceEffect
      source: system | tenant
      priority?: number
      reason?: string
      revision?: number
    }

    interface TenantGovernancePolicy {
      tenantId: string
      rules: TenantGovernanceRule[]
      defaultEffect: GovernanceEffect
      revision: number
      updatedAt: number
      updatedBy?: string
    }

Policies remain deterministic and typed. No generic policy DSL, script, or ABAC model is implied.

## 5. Limits and entitlements contract

    interface TenantEntitlement {
      tenantId: string
      key: string
      granted: boolean
      source: system | tenant
      createdAt: number
      updatedAt: number
      revision: number
      provenance?: {
        actor?: string
        reason?: string
        source?: string
      }
    }

    interface TenantLimit {
      tenantId: string
      key: string
      configuredValue?: number
      hardSystemMaximum?: number
      source: system | tenant
      createdAt: number
      updatedAt: number
      revision: number
      provenance?: {
        actor?: string
        reason?: string
        source?: string
      }
    }

Entitlements answer capability eligibility. Limits answer bounded capacity. Hard system ceilings cannot be widened by tenant configuration.

## 6. Decision and receipt contract

    interface GovernanceDecision {
      tenantId: string
      action: GovernedAction
      decision: GovernanceEffect
      basis:
        | system_hard_prohibition
        | tenant_state_suspended
        | tenant_state_archived
        | explicit_tenant_deny
        | explicit_tenant_allow
        | tenant_default
        | no_policy_configured_default_deny
      matchedRuleId?: string
      evaluatedAt: number
      revision?: number
    }

    interface EntitlementDecision {
      tenantId: string
      entitlementKey: string
      granted: boolean
      source?: string
      reason?: string
      evaluatedAt: number
      revision?: number
    }

    interface LimitDecision {
      tenantId: string
      limitKey: string
      configuredValue?: number
      hardSystemMaximum?: number
      effectiveValue?: number
      exceeded?: boolean
      evaluatedAt: number
      revision?: number
    }

Decisions are audit-ready receipts intended for later enforcement boundaries.

## 7. Command and mutation contract

    type GovernanceMutation =
      | policy.replace
      | entitlement.grant
      | entitlement.revoke
      | limit.set
      | limit.clear

Mutations require explicit tenant scope and administrative authority.

## 8. Read model contract

Read models may project:

- tenant lifecycle state;
- membership roster;
- governance policy view;
- entitlement view;
- limit view;
- decision history.

Read models must remain separate from enforcement and runtime truth.

## 9. Audit event contract

Audit-ready events or receipts should carry:

- tenantId;
- actor or authority basis;
- operation;
- previous value;
- next value;
- timestamp;
- reason when supplied;
- revision;
- decision basis where applicable.

Audit storage is deferred, but event shape is normative.

## 10. Error semantics

Stable error codes include:
- ACS_TENANT_GOVERNANCE_POLICY_INVALID
- ACS_TENANT_GOVERNED_ACTION_INVALID
- ACS_TENANT_GOVERNANCE_EFFECT_INVALID
- ACS_TENANT_GOVERNANCE_MUTATION_UNAUTHORIZED
- ACS_TENANT_STATE_BLOCKS_GOVERNANCE_MUTATION
- ACS_TENANT_CROSS_TENANT_GOVERNANCE_FORBIDDEN
- ACS_TENANT_ARCHIVED_GOVERNANCE_MUTATION
- ACS_TENANT_ENTITLEMENT_INVALID
- ACS_TENANT_LIMIT_INVALID
- ACS_TENANT_LIMIT_EXCEEDS_HARD_MAXIMUM

## 11. Control Plane UX contract

The administrative Control Plane is a client of the Product API, not an alternate source of tenant truth.

- Routes are organized around tenant list, tenant detail, membership, governance, entitlements, and limits.
- UI state must surface loading, empty, error, forbidden, and terminal states explicitly.
- UI mutation flows consume read models and receipts from the Product API and do not duplicate lifecycle, authority, precedence, or limit evaluation.
- The public view models are stable administrative summaries, details, memberships, governance views, entitlements, and limit views.
- ACS_TENANT_GOVERNANCE_RULE_NOT_FOUND
- ACS_TENANT_GOVERNANCE_STATE_NOT_FOUND
- ACS_TENANT_GOVERNANCE_REVISION_CONFLICT

## 11. Authorization semantics

- tenant_owner may mutate governance, entitlements, and limits within tenant scope.
- tenant_admin may read governance and, only where explicitly permitted, mutate selected tenant-scoped governance state.
- operator is read-only for governance.
- auditor is read-only for governance.
- platform_admin is explicit platform scope and separate from membership roles.

## 12. Enforcement contract

    type EnforcementLayer =
      | authority
      | governance
      | entitlement
      | limit
      | tenant_state
      | system_hard_limit
      | invalid_request
      | infrastructure

    interface EnforcementDecision {
      tenantId: string
      operation: string
      allowed: boolean
      deniedLayer?: EnforcementLayer
      basis?: string
      evaluatedAt: number
      governanceDecision?: GovernanceDecision
      entitlementDecision?: EntitlementDecision
      limitDecision?: LimitDecision
    }

    type EnforcedOperation =
      | agent.create
      | agent.configure
      | deployment.create

Enforcement is a consumer of canonical governance decisions. It is fail-closed for missing or inconsistent decision inputs. The first selected operations are representative control-plane mutations; execution and broader runtime gating remain deferred until their boundaries can consume the same contract safely.

## 13. Administrative Product API contract

    interface TenantAdminSummary {
      tenantId: string
      status: TenantStatus
      revision: number
      administrativeMetadata?: unknown
      ownerSummary?: { principalIds: string[]; count: number }
      membershipSummary?: { total: number; active: number; suspended: number; removed: number }
      governanceSummary?: { hasPolicy: boolean; policyId?: string; defaultEffect?: GovernanceEffect; ruleCount: number }
      entitlementSummary?: { total: number; enabled: number }
      limitSummary?: { total: number }
    }

    interface TenantAdminDetail extends TenantAdminSummary {
      memberships: TenantMembership[]
      governance: TenantGovernanceState
    }

    interface AdministrativeErrorBody {
      code: string
      message: string
      reason?: string
      details?: {
        enforcement?: {
          deniedLayer?: EnforcementLayer
        }
      }
    }

Administrative routes are thin Product API adapters. They resolve actor and tenant scope, call domain/application services, and map domain errors to HTTP semantics. They do not duplicate lifecycle, authority, governance, or limit rules.

## 14. Open decisions

- Which additional operations will be enrolled in enforcement after the initial selected set.
- Which entitlements become mandatory for the next runtime integration boundary.
- Which usage-backed limits remain deferred until metering exists.
