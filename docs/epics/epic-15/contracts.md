# EPIC-15 Contracts

## 1. Tenant aggregate contract

~~~text
 type TenantStatus = provisioning | active | suspended | archived

interface Tenant {
  tenantId: string
  canonicalName: string
  status: TenantStatus
  ownerMembershipId?: string
  ownerPrincipalId?: string
  administrativeMetadata:
    displayName?
    description?
    provenance
    createdAt
    createdBy
    updatedAt?
    updatedBy?
  lifecycle:
    activatedAt?
    suspendedAt?
    archivedAt?
  }
~~~

## 2. Membership contract

~~~text
type AdministrativeRole = platform_admin | tenant_owner | tenant_admin | auditor

interface TenantMembership {
  membershipId: string
  tenantId: string
  principalId: string
  status: invited | active | suspended | removed
  roles: AdministrativeRole[]
  createdAt: string
  createdBy: string
  updatedAt?: string
}
~~~

Membership is ACS-canonical for administration. Authentication may remain external.

## 3. Governance policy contract

~~~text
interface GovernancePolicyRef {
  policyId: string
  revision?: number
  scope: tenant | platform
  appliesTo: string[]
}
~~~

Policies may reference agents, deployments, tools, plugins, capabilities, execution, resource usage, economics and administrative actions.

## 4. Limits and entitlements contract

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

Hard system limits belong to platform and runtime boundaries. Economic limits are surfaced here, but enforcement remains deferred to the economics and billing boundary.

## 5. Command contract

Tenant mutations must be scoped and explicit:

- create tenant;
- activate tenant;
- suspend tenant;
- reactivate tenant;
- archive tenant;
- invite member;
- admit member;
- remove member;
- promote or demote role;
- attach or detach policy;
- adjust limits and entitlements.

Every command MUST carry:

- actor identity;
- tenant scope or platform scope;
- correlation id;
- reason or justification;
- timestamp or request time;
- change intent.

## 6. Read model contract

Minimum read models:

- TenantListItem
- TenantDetailView
- TenantMembershipView
- TenantGovernanceView
- TenantLimitsView
- TenantUsageView
- TenantAuditTrailView

## 7. Audit event contract

Administrative events SHOULD include:

- eventType;
- eventId;
- tenantId;
- actorId;
- principalId when relevant;
- role or authority scope;
- correlationId;
- decision;
- before and after summary;
- reason;
- timestamp;
- source.

## 8. Error semantics

Tenant administration errors SHOULD distinguish:

- tenant_not_found
- tenant_scope_required
- cross_tenant_forbidden
- authority_denied
- membership_conflict
- tenant_state_conflict
- policy_restricted
- quota_exceeded
- unsupported_action
- deferred_boundary

## 9. Authorization semantics

- platform_admin may act across tenants only with explicit platform scope;
- tenant_admin may act only within the tenant scope granted to it;
- tenant_owner may have the narrowest tenant-control authority;
- auditor is read-only;
- operator is not automatically an admin role;
- agent role or runtime role does not imply administrative authority.

## 10. OPEN DECISIONs

### OPEN DECISION: membership source of truth

Options:

- ACS-canonical membership with external identity integration
- external IdP as source of truth with ACS projection only

Preferred direction:

- ACS-canonical membership for administrative authority; external identity for authentication.

Decision gate:

- make the authority boundary explicit before implementation starts.

### OPEN DECISION: deletion policy

Options:

- archive-only
- policy-gated deletion

Preferred direction:

- archive-only for Milestone A01; policy-gated deletion remains deferred until retention and audit requirements are explicitly closed.

Decision gate:

- do not enable deletion semantics until retention and audit requirements are explicit.

### OPEN DECISION: quota enforcement boundary

Options:

- EPIC-15 owns read/write quota enforcement
- EPIC-15 owns contracts and read models only

Preferred direction:

- EPIC-15 defines the contracts and read models; enforcement remains deferred where it depends on economics, billing or runtime guards.
