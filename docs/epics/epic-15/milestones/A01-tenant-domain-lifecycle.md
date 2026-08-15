# EPIC-15 Milestone A01 — Tenant Domain & Lifecycle

Status: complete

## Scope implemented

- canonical tenant aggregate and repository;
- explicit administrative status model;
- lifecycle mutation service;
- deterministic validation and error semantics;
- audit-ready lifecycle receipts;
- compatibility with existing tenant scope primitives through shared tenant identifiers.

## Files and modules

- src/control-plane/tenant-domain.ts
- src/index.ts
- tests/tenant-domain-lifecycle.test.mjs

## Final lifecycle

- provisioning
- active
- suspended
- archived

Terminal deletion was not implemented.

## Transition matrix

- provisioning -> active
- provisioning -> archived
- active -> suspended
- active -> archived
- suspended -> active
- suspended -> archived
- archived -> no transitions

Invalid transitions are rejected deterministically.

## Invariants

- tenant identity is immutable after creation;
- duplicate creation is rejected;
- archived tenants are terminal;
- no-op or illegal transitions fail with stable tenant lifecycle errors;
- mutations target exactly one tenant;
- lifecycle metadata remains coherent after each transition.

## Relationship to existing tenant scope

- the new domain reuses the existing string tenant identifier shape;
- tenant-context isolation helpers remain unchanged;
- no runtime or workload isolation bypass was introduced;
- tenant scope does not depend on administrative status for unrelated operations.

## Suspension semantics

- suspension is an administrative state on the Tenant aggregate;
- status is queryable and persists in the domain record;
- runtime/workload enforcement is deferred to a later governance milestone.

## Archive / delete decision

- archive is the terminal administrative lifecycle state for A01;
- hard delete is deferred and not implemented;
- no cascade deletion was added.

## Audit readiness

- lifecycle operations return receipts with tenant id, previous state, next state, operation, actor, reason and timestamp;
- optional AuditService integration records tenant lifecycle events;
- no audit storage was added.

## Deferred scope

- membership;
- administrative RBAC;
- platform admin / tenant admin roles;
- governance policies;
- quotas and entitlements enforcement;
- economics and billing;
- UI and HTTP admin surface;
- hard delete.

## Tests

- tenant creation and canonical identity;
- duplicate and invalid identity rejection;
- valid lifecycle transitions;
- invalid lifecycle transitions and terminal archive behavior;
- isolation of tenant mutations;
- audit metadata emitted on lifecycle events.

## Acceptance result

Milestone A01 is complete. The repository now has a canonical, governed, testable tenant lifecycle without introducing membership, policy enforcement, billing, UI or hard deletion.
