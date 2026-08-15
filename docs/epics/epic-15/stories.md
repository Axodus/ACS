# EPIC-15 Story Specifications

Each story is a planning unit for the EPIC-15 implementation track. The stories below are intentionally narrow and ordered.

## Story T01 — Tenant aggregate and lifecycle

- ID: T01
- Objective: establish the canonical tenant aggregate, lifecycle, and archive semantics.
- Scope: tenant identity, status transitions, timestamps, provenance, archive/deactivation behavior.
- Dependencies: EPIC-15 normative plan.
- Acceptance criteria:
  - tenant identity is canonical and immutable;
  - lifecycle transitions are explicit and deterministic;
  - hard delete remains deferred;
  - archive semantics are documented and enforced at the domain boundary.
- Non-goals: membership, governance, quotas, billing, UI.
- Evidence expected: tenant domain contract, lifecycle service, and regression tests.
- Status: implemented in Sprint A01.

## Story T02 — Membership and administrative authority

- ID: T02
- Objective: model tenant membership, owner semantics, and tenant-scoped administrative authority.
- Scope: principal identity, role semantics, bootstrap owner, cross-tenant authorization, receipts.
- Dependencies: T01.
- Acceptance criteria:
  - membership is canonical and tenant-scoped;
  - owner invariants are protected;
  - privilege escalation is blocked;
  - platform authority remains explicit and separate.
- Non-goals: authentication, invitations, generic IAM, UI.
- Evidence expected: membership contract, authority evaluator, and regression tests.
- Status: implemented in Sprint B01.

## Story T03 — Governance policy, entitlements, and limits

- ID: T03
- Objective: define governance policies, entitlements, limits, and deterministic decision evaluation.
- Scope: governed actions, governance precedence, entitlement grants/revocations, limit resolution, audit-ready decision receipts.
- Dependencies: T01, T02.
- Acceptance criteria:
  - policy, entitlement, and limit contracts are separate;
  - default behavior is explicit;
  - precedence is deterministic;
  - hard system limits cannot be widened by tenant configuration.
- Non-goals: runtime enforcement, billing, generic policy engine.
- Evidence expected: governance evaluator, decision receipts, and regression tests.
- Status: implemented in Sprint C01.

## Story T04 — Administrative read models

- ID: T04
- Objective: expose tenant administration read models for lifecycle, membership, and governance.
- Scope: list/detail projections, decision history projections, tenant-scoped administrative views.
- Dependencies: T01, T02, T03.
- Acceptance criteria:
  - read models remain separated from mutation contracts;
  - tenant scope remains explicit;
  - projections are compatible with future UI work.
- Non-goals: browser UI, mutation endpoints, runtime enforcement.
- Evidence expected: read-model contracts and query tests.
- Status: implemented in Sprint D01.

## Story T05 — Administrative mutation surface

- ID: T05
- Objective: define the future mutation surface for tenant administration.
- Scope: lifecycle mutation commands, membership mutation commands, governance mutation commands, audit receipts.
- Dependencies: T01, T02, T03.
- Acceptance criteria:
  - commands are tenant-scoped and explicit;
  - authority checks are reusable;
  - audit-ready receipts are available for every privileged mutation.
- Non-goals: HTTP routes, browser UI, storage migration.
- Evidence expected: command contract and service tests.
- Status: implemented in Sprint D01.

## Story T06 — Control Plane surface design

- ID: T06
- Objective: specify the Control Plane surface needed for tenant administration.
- Scope: navigation entry points, tenant list/detail layouts, governance read views, history views.
- Dependencies: T01 through T05.
- Acceptance criteria:
  - UI boundaries match documented contracts;
  - no runtime truth is duplicated in the UI;
  - browser acceptance is captured for the implemented routes.
- Non-goals: design redesign, production activation claims, direct domain imports.
- Evidence expected: implemented tenant administration UX, browser manifest, and screenshots.
- Status: implemented in Sprint D02.

## Story T07 — Isolation and governance hardening

- ID: T07
- Objective: verify that new tenant administration contracts do not weaken isolation or governance boundaries.
- Scope: boundary review, regression coverage, explicit deferred decisions.
- Dependencies: T01 through T06.
- Acceptance criteria:
  - tenant isolation remains intact;
  - administrative scope is explicit;
  - no generic IAM, RBAC, ABAC, or policy engine is introduced by accident.
- Non-goals: new runtime enforcement paths, broad refactors.
- Evidence expected: boundary review and regression test results.
- Status: planning artifact; implementation continues as the EPIC advances.

## Story T08 — Enforcement integration readiness

- ID: T08
- Objective: integrate a representative set of operational boundaries with canonical governance enforcement.
- Scope: decision consumption interfaces, route/application handoff points, enforcement contract mapping, selective side-effect gating.
- Dependencies: T03, T04, T07.
- Acceptance criteria:
  - consumers can read decision receipts deterministically;
  - enforcement remains separated from decision production;
  - at least one representative control-plane mutation boundary is gated before side effects;
  - no policy DSL or cross-tenant bypass is introduced.
- Non-goals: broad runtime blocking, billing, metering, or product-wide security rewrites.
- Evidence expected: shared enforcement adapter, targeted integration tests, and route-level receipts.
- Status: implemented in Sprint C02.

## Story T09 — Administrative auditability and isolation hardening

- ID: T09
- Objective: make privileged administrative actions attributable, tenant-scoped, and reconstructable from real audit history.
- Scope: canonical audit event projection, audit read routes, tenant-scoped history access, forged-context rejection, cross-tenant hardening, suspended/archived consistency.
- Dependencies: T01 through T08.
- Acceptance criteria:
  - administrative events remain tenant-scoped and correlatable;
  - audit history is read-only and sourced from real events;
  - forged tenant context is rejected;
  - cross-tenant audit reads and writes are blocked;
  - platform authority remains explicit and separate.
- Non-goals: generic observability platform, synthetic audit records, SIEM, broad runtime redesign.
- Evidence expected: audit read model, hardening tests, and browser evidence if UI audit surface is present.
- Status: implemented in Sprint E01.
