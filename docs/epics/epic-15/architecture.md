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
E01 formalizes a tenant-scoped administrative audit projection so those events can be queried without exposing cross-tenant history or synthetic records.

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

## 8. Enforcement boundaries

Decision production stays in the governance domain. Enforcement is a separate consumer that runs at concrete application boundaries before side effects.

~~~text
operation intent
  ↓
tenant + actor context
  ↓
administrative authority
  ↓
governance decision
  ↓
entitlement decision
  ↓
limit decision
  ↓
ALLOW → side effect
DENY  → semantic failure + audit-ready receipt
~~~

Milestone C02 integrates the first selected boundaries with a shared enforcer rather than duplicating policy logic in controllers, services, or workers. The initial enforced operations are representative control-plane mutations such as agent creation, agent configuration changes, and deployment creation. Execution and broad runtime gating remain deferred unless the boundary can consume the same contract without redesign.

## 9. Control-plane surface shape

Future control-plane navigation should expose:

- tenant list;
- tenant detail;
- lifecycle and status;
- members;
- governance;
- limits and usage;
- audit and history;
- administrative actions.

Milestone D01 adds the Product API boundary that feeds those screens. Its routes are thin adapters over the canonical domain services and read models:

- platform-scoped tenant listing and tenant creation;
- tenant-scoped tenant detail;
- lifecycle mutations;
- membership mutations and ownership transfer;
- governance policy, entitlement, and limit reads and mutations;
- decision inspection for future debugging and UI consumption.

Routes must not reimplement authority, lifecycle, precedence, or limit logic.

Milestone D02 implements the Control Plane UX as a governed client of those routes. The implemented surface is:

~~~text
/admin/tenants
/admin/tenants/:tenantId
/admin/tenants/:tenantId/members
/admin/tenants/:tenantId/governance
/admin/tenants/:tenantId/entitlements
/admin/tenants/:tenantId/limits
/admin/tenants/:tenantId/audit
~~~

The UI consumes the Product API only, keeps mutation confirmation explicit, and renders loading, empty, error, forbidden, and terminal-state semantics without duplicating domain rules.
The audit view is read-only and only renders real tenant-scoped audit entries projected from administrative events.

## 10. Boundary safety notes

- Governance decisions are tenant-scoped and must never be reused across tenants.
- Administrative authority and governance are distinct checks.
- Enforcement adapters may consume receipts, but they do not become the source of truth for policy state.
- Broad runtime, queue, and metering redesign stay outside Milestone C02.
- Administrative audit history must remain tenant-scoped, attributable, and consult real events only.
- Conflicting tenant context sources must be rejected rather than silently resolved.

## 11. Architecture constraints

- Do not make runtime or deployment ownership implicit.
- Do not collapse platform-admin and tenant-admin.
- Do not treat tenant-aware visibility as tenant administration.
- Do not move billing enforcement into tenant governance.
- Do not introduce a generic policy language, generic RBAC, or generic ABAC as a shortcut.
- Do not let the Control Plane UI import or re-evaluate control-plane domain services.
