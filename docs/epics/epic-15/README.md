# EPIC-15 — Tenant Administration & Governance

## Mission

Transform tenant isolation into an explicit, auditable, governed administrative domain inside the ACS Control Plane.

## Current status

~~~text
Status: CLOSED / PASS
Tenant administration readiness: A01, B01, C01, C02, D01, D02, E01, and E02 complete
Functional implementation: canonical tenant domain, lifecycle, membership, administrative authority, governance decisions, limits, entitlements, selected enforcement boundaries, the administrative Product API, the Control Plane UX, and administrative audit/isolation hardening are in place
Final acceptance and closure: complete
Browser acceptance: passed
Readiness classification: PASS
~~~

## Problem

ACS already carries tenant scope across several runtime and control-plane projections, but tenant administration is still treated as future scope or boundary visibility. EPIC-15 must define the administrative domain without reimplementing isolation, billing, or runtime enforcement.

## Objectives

- define the tenant administrative aggregate and lifecycle;
- define membership and ownership semantics;
- define the minimum administrative authority model;
- define governance policies, limits, entitlements and guardrails;
- define auditability contracts for tenant actions;
- define the future control-plane surface and API boundaries;
- preserve explicit tenant scope and cross-tenant safety.

## Non-goals

- no schema migrations or storage changes;
- no runtime, deployment, or worker changes;
- no policy engine, RBAC engine, or billing engine implementation;
- no quota enforcement or audit storage implementation.

## Principles

- Governance before convenience.
- Explicit tenancy.
- Isolation is an invariant.
- Reuse before reimplementation.
- Minimal authority.
- Auditable mutation.
- API/UI separation.
- No premature generalization.

## Relationship to prior EPICs

- EPIC-10 established tenant and workload isolation primitives and runtime truth.
- EPIC-11 exposed a tenant-aware operational surface, but not tenant administration.
- EPIC-12 kept administration and tenant governance out of readiness claims.
- EPIC-13 owns billing and tenant billing responsibility, not tenant administration.
- EPIC-14 established the Control Plane UX and navigation contract used here.

## Document map

- EPIC-15 Strategic and Operational Plan
- Architecture
- Contracts
- Boundary Review
- Stories
- Milestones
- AGENTS.md
- Browser Acceptance
- Regression Inventory
- EPIC-15 Closure Report

## Recommended reading order

1. AGENTS.md
2. EPIC-15 Strategic and Operational Plan
3. Architecture
4. Contracts
5. Boundary Review
6. Stories
7. Milestones

## Milestones

1. Tenant Domain & Lifecycle
2. Membership & Administrative Authority
3. Governance, Limits & Entitlements
4. Governance Enforcement Boundaries
5. Administrative API & Control Plane
6. Auditability, Isolation Hardening & Acceptance

## Global completion criteria

- tenant domain boundaries are explicit;
- lifecycle and membership contracts are settled;
- administrative authority is minimal and scoped;
- governance, limits and entitlements have bounded contracts;
- selected enforcement boundaries consume canonical governance decisions;
- auditability requirements are defined;
- control-plane surface and API boundaries are documented;
- tenant administration Control Plane UX is implemented and browser-accepted;
- administrative audit trails and isolation hardening are implemented and tenant-scoped;
- deferred items are separated from EPIC-15 scope.

## Initial state

EPIC-15 has been fully certified and closed. The final closure report and browser acceptance evidence are authoritative for readiness, caveats, and deferred scope.

## Closure references

- [Browser Acceptance](browser-acceptance.md)
- [Regression Inventory](regression-inventory.md)
- [EPIC-15 Closure Report](epic-15-closure-report.md)
