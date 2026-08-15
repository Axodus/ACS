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

Tenant is the administrative aggregate. It owns:

- canonical tenant identity;
- lifecycle state;
- ownership;
- membership references;
- governance policy references;
- limits and entitlements;
- audit history pointers;
- timestamps and provenance.

Ownership is a membership role, not a separate authority channel.

### Membership

Membership is the scoped relationship between a tenant and a principal. Authentication may be external, but membership truth is canonical in ACS.

### Authority

Administrative authority is separated into:

- platform scope;
- tenant scope;
- operational scope.

Agent roles remain separate from administrative roles.

### Governance

Governance attaches policy references and guardrails to a tenant. It does not become a generic policy engine.

### Limits and entitlements

Limits express ceilings. Entitlements express allowed capabilities. Usage is the observed counterpoint. Economics and billing enforcement remain deferred where they require separate product boundaries.

### Audit

Administrative mutations produce audit-worthy events with actor, scope, tenant, decision and change-set metadata.

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

## 6. Write/read boundaries

- Writes originate from tenant-scoped administrative commands.
- Reads are tenant-scoped projections or platform-scoped listings.
- Cross-tenant visibility is allowed only when explicitly platform-scoped.
- Tenant scope must never be inferred from UI state alone.

## 7. Control-plane surface shape

Future control-plane navigation should expose:

- tenant list;
- tenant detail;
- lifecycle and status;
- members;
- governance;
- limits and usage;
- audit and history;
- administrative actions.

## 8. Architecture constraints

- Do not make runtime or deployment ownership implicit.
- Do not collapse platform-admin and tenant-admin.
- Do not treat tenant-aware visibility as tenant administration.
- Do not move billing enforcement into tenant governance.
