# EPIC-15 Story Specifications

Each story is a planning unit for the future implementation track. The stories below are intentionally narrow and ordered.

## Story T01 — Tenant aggregate and lifecycle

- ID: T01
- Objective: define the canonical tenant aggregate, status model and lifecycle.
- Scope: identity, ownership, timestamps, provenance, terminal states.
- Dependencies: EPIC-10 isolation primitives; EPIC-12 claim discipline.
- Acceptance criteria:
  - tenant status vocabulary is explicit;
  - allowed transitions are listed;
  - ownership is represented canonically;
  - deletion policy is not assumed.
- Non-goals: tenant CRUD implementation, storage, schema migration.
- Evidence expected: architecture and contract sections that a coder can use without guessing.

## Story T02 — Membership and administrative authority

- ID: T02
- Objective: define membership, roles and scoped authority.
- Scope: owner, tenant admin, platform admin, auditor, operator separation.
- Dependencies: T01, identity assumptions, governance boundary.
- Acceptance criteria:
  - membership source of truth is explicit;
  - roles are minimal and scoped;
  - operator is not conflated with tenant admin;
  - privilege escalation paths are addressed.
- Non-goals: full RBAC engine, IdP implementation.
- Evidence expected: role matrix and authorization semantics.

## Story T03 — Governance policies and limits

- ID: T03
- Objective: define tenant governance policy references and limit contracts.
- Scope: agent, deployment, tool, capability and execution guardrails, quotas, entitlements, usage and economic limits.
- Dependencies: T01, T02, EPIC-13 boundary.
- Acceptance criteria:
  - policy references are named;
  - hard system limits are separated from tenant quotas;
  - economic limits are explicitly bounded;
  - deferred enforcement is documented.
- Non-goals: generic policy engine, quota enforcement.
- Evidence expected: policy and limits contract and boundary review.

## Story T04 — Administrative API boundary

- ID: T04
- Objective: define tenant-scoped and platform-scoped API surfaces.
- Scope: commands, queries, read models, error semantics, authorization boundaries.
- Dependencies: T01 to T03.
- Acceptance criteria:
  - commands and queries are enumerated;
  - read models are defined;
  - error codes and denial semantics are explicit;
  - tenant scope is mandatory where needed.
- Non-goals: endpoint implementation, transport wiring.
- Evidence expected: contracts that can drive implementation.

## Story T05 — Control Plane surface plan

- ID: T05
- Objective: define the future ACS UI shape for tenant administration.
- Scope: tenant list, detail, members, governance, limits, usage, audit, actions.
- Dependencies: T04, EPIC-14 IA patterns.
- Acceptance criteria:
  - surface is organized by flow;
  - read/write boundaries are visible;
  - unsupported actions are explicit;
  - tenant context is preserved.
- Non-goals: page implementation, visual redesign.
- Evidence expected: architecture and milestone sequencing.

## Story T06 — Auditability and isolation hardening

- ID: T06
- Objective: define the audit events and invariants for tenant administration.
- Scope: creation, lifecycle, membership, role, policy, limit and privileged actions.
- Dependencies: T01 to T05.
- Acceptance criteria:
  - audit-worthy events are listed;
  - event fields are specified;
  - isolation invariants are explicit;
  - cross-tenant mutation is forbidden without scope.
- Non-goals: audit storage, tracing platform, analytics.
- Evidence expected: audit contract and boundary review.

## Story T07 — Acceptance package and implementation order

- ID: T07
- Objective: package the implementation order and exit criteria for later work.
- Scope: milestone ordering, risks, decision gates, DONE definition.
- Dependencies: T01 to T06.
- Acceptance criteria:
  - milestone order is clear;
  - open decisions are labeled;
  - deferred items are separated;
  - another agent can start implementation from the docs alone.
- Non-goals: executing the implementation.
- Evidence expected: milestone README and strategic plan.

