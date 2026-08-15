# EPIC-15 Contracts

## 1. Tenant aggregate contract

~~~text
type TenantStatus = provisioning | active | suspended | archived
~~~

Tenant is the administrative aggregate. Its canonical id is stable, its lifecycle is explicit, and hard delete remains deferred.

## 2. Membership contract

~~~text
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
~~~

Membership is ACS-canonical for tenant administration. Authentication may remain external. `platform_admin` is an explicit authority basis, not a membership role.

## 3. Authority contract

~~~text
type TenantAdministrativeAction =
  | tenant.read
  | membership.read
  | membership.add
  | membership.change_role
  | membership.suspend
  | membership.reactivate
  | membership.remove
  | ownership.transfer
~~~

Authority semantics are explicit and tenant-scoped unless platform scope is explicitly declared.

## 4. Governance policy contract

~~~text
interface GovernancePolicyRef {
  policyId: string
  revision?: number
  scope: tenant | platform
  appliesTo: string[]
}
~~~

Policies may reference agents, deployments, tools, plugins, capabilities, execution, resource usage, economics, and administrative actions. No generic policy engine is implied.

## 5. Limits and entitlements contract

~~~text
interface TenantLimits {
  hardSystemLimits?: Record<string, number>
  tenantQuotas?: Record<string, number>
  economicLimits?: Record<string, number>
}

interface TenantEntitlements {
  enabledCapabilities: string[]
  allowedActions: string[]
  governancePolicyRefs: GovernancePolicyRef[]
}
~~~

Hard system limits remain platform/runtime concerns. Economic limits are modeled here only as contracts; enforcement is deferred to the economics and billing boundary.

## 6. Command and mutation contract

Tenant mutations must be explicit and scoped:

- create tenant;
- activate tenant;
- suspend tenant;
- reactivate tenant;
- archive tenant;
- bootstrap owner;
- add member;
- change role;
- suspend member;
- reactivate member;
- remove member;
- transfer ownership.

Every command MUST carry actor identity, tenant scope or platform scope, correlation id, reason when relevant, and a governed timestamp.

## 7. Read model contract

Minimum read models:

- TenantListItem
- TenantDetailView
- TenantMembershipView
- TenantGovernanceView
- TenantLimitsView
- TenantUsageView
- TenantAuditTrailView

## 8. Audit event contract

Administrative events SHOULD include:

- eventType;
- eventId;
- tenantId;
- principalId;
- actor;
- authorityKind;
- correlationId;
- decision;
- previous state summary;
- next state summary;
- reason;
- timestamp;
- revision.

## 9. Error semantics

Tenant administration errors SHOULD distinguish:

- tenant_not_found
- tenant_scope_required
- cross_tenant_forbidden
- authority_denied
- membership_conflict
- membership_inactive
- tenant_state_conflict
- policy_restricted
- quota_exceeded
- unsupported_action
- deferred_boundary

## 10. Authorization semantics

- platform_admin is explicit platform scope and may bootstrap the first owner;
- tenant_owner and tenant_admin are tenant-scoped roles;
- tenant_owner has stronger tenant-control authority than tenant_admin;
- operator and auditor are read-only for administrative mutations;
- agent role or runtime role does not imply administrative authority.

## 11. Open decisions

The following are resolved for the current sprint baseline:

- membership source of truth: ACS-canonical administrative membership with external authentication;
- deletion policy: archive-only terminal state for tenant lifecycle, no hard delete;
- quota enforcement: contracts first, enforcement deferred.
