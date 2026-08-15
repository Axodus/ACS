# EPIC-15 Architecture

## 1. System boundary

EPIC-15 sits above the existing tenant-aware control plane and formalizes tenant administration as a governed domain.

~~~text
Control Plane UI / API
  ↓
Tenant Administration and Governance
  ↓
Existing tenant-aware control-plane projections
  ↓
Agent / Deployment / Runtime / Audit / Economics / Isolation primitives
  ↓
EPIC-10 domain truth
~~~

## 2. Organizing rule

~~~text
Fluxo > Módulo > Tela
~~~

The future surface should be organized by administrative flow, not by internal storage shape.

## 3. Conceptual domain model

### Tenant aggregate

Tenant is the administrative aggregate. It owns canonical tenant identity, lifecycle state, ownership, timestamps, and provenance.

Membership, governance, limits, and entitlements are tenant-scoped subdomains. They are not the Tenant aggregate itself.

### Membership and authority

Membership is the scoped relationship between a tenant and a principal. Authentication may be external, but membership truth is canonical in ACS.

Administrative authority is separated into platform scope and tenant scope. Agent roles remain separate from administrative roles.

Tenant membership is the source of tenant-scoped administrative authority. Platform authority is explicit and separate.

### Governance, entitlements, and limits

Governance determines whether an operation is administratively allowed. Entitlements determine whether the tenant is eligible for a capability. Limits constrain capacity.

Governance policy is a bounded allow/deny model over a fixed governed-action vocabulary. Entitlements are boolean capability grants. Limits are bounded numeric ceilings that are clamped by hard system limits.

### Audit

Administrative mutations and decision evaluations produce audit-worthy metadata with tenant id, actor, authority basis, operation, previous value, next value, reason, and timestamp.

## 4. Lifecycle model

~~~mermaid
stateDiagram-v2
  [*] --> provisioning: create
  provisioning --> active: activate
  provisioning --> archived: archive
  active --> suspended: suspend
  suspended --> active: reactivate
  active --> archived: archive
  suspended --> archived: archive
  archived --> [*]
~~~

Lifecycle transitions must be explicit. Archive is the terminal administrative state in Milestone A01; hard deletion remains deferred.

### Governance lifecycle interaction

- provisioning tenants may accept initial governance, entitlement, and limit configuration;
- active tenants evaluate governance, entitlements, and limits normally;
- suspended tenants remain readable but block tenant-scoped governance mutations;
- archived tenants are terminal for governance mutations and return conservative decision receipts.

## 5. Relationship to adjacent domains

~~~mermaid
flowchart LR
  TenantAdmin[Tenant Administration]
  Agent[Agent domain]
  Deployment[Deployment domain]
  Runtime[Runtime domain]
  Evidence[Audit / Evidence]
  Economics[Economics / Billing boundary]
  Identity[Authentication / Identity]

  TenantAdmin --> Agent
  TenantAdmin --> Deployment
  TenantAdmin --> Runtime
  TenantAdmin --> Evidence
  TenantAdmin --> Economics
  Identity --> TenantAdmin
~~~

Tenant administration may constrain or inspect these domains, but it must not recreate them.

### Principal to authority chain

~~~text
principal -> TenantMembership -> administrative role -> scoped authority
~~~

This chain is the governance boundary for tenant-scoped actions.

## 6. Write/read boundaries

- Writes originate from tenant-scoped administrative commands.
- Reads are tenant-scoped projections or platform-scoped listings.
- Cross-tenant visibility is allowed only when explicitly platform-scoped.
- Tenant scope must never be inferred from UI state alone.
- Decision evaluators are read-only consumers of governance state and do not enforce runtime behavior by themselves.

## 7. Decision precedence

Governance resolution follows a deterministic precedence:

1. hard system prohibition;
2. tenant lifecycle block;
3. explicit tenant rule;
4. tenant default;
5. no-policy default deny.

Entitlement resolution defaults to denied when absent. Limit resolution takes the minimum of configured tenant limit and hard system limit when both exist.

## 8. Control-plane surface shape

Future control-plane navigation should expose:

- tenant list;
- tenant detail;
- lifecycle and status;
- members;
- governance;
- limits and usage;
- audit and history;
- administrative actions.

## 9. Architecture constraints

- Do not make runtime or deployment ownership implicit.
- Do not collapse platform-admin and tenant-admin.
- Do not treat tenant-aware visibility as tenant administration.
- Do not move billing enforcement into tenant governance.
- Do not introduce a generic policy language, generic RBAC, or generic ABAC as a shortcut.
