# EPIC-15 Strategic and Operational Plan

## Strategic intent

EPIC-15 defines tenant administration as a governed control-plane domain. The goal is not broader isolation; the goal is explicit administration over a tenant that can be inspected, reasoned about, audited and safely bounded.

## Current-state assessment

The repository already contains:

- tenant-scoped data fields on agents, deployments, runtimes, executions, receipts and audit events;
- isolation helpers that enforce same-tenant and same-workload constraints;
- read-only Product API projections for system administration and system tenants;
- governance and production-readiness reports that explicitly state tenant administration is not ready;
- UX language that shows tenant context without promising tenant-admin capability.

The gap is not tenant-awareness. The gap is a formal administrative model.

## Target state

EPIC-15 should leave the repository with a clear answer to:

- what a tenant is administratively;
- who may administer it;
- what lifecycle transitions are allowed;
- what membership means;
- how governance policies, limits and entitlements attach to it;
- what must be audited;
- what the future API and UI boundary looks like.

## Workstreams

### 1. Tenant domain

Define the tenant aggregate, lifecycle, ownership, timestamps, provenance and terminal states.

### 2. Membership and authority

Define the minimal role model and membership semantics without inventing a general RBAC system.

### 3. Governance and limits

Define governance policy references, quota and entitlement concepts and the boundary to economics and billing.

### 4. API and control-plane surface

Define read models, commands, queries, authorization boundaries and the future surface shape for tenant administration.

### 5. Auditability and isolation hardening

Define the administrative events that must exist and the isolation invariants they may not break.

## Sequencing

1. Formalize the tenant aggregate and lifecycle.
2. Formalize membership, ownership and roles.
3. Formalize governance policies, limits and entitlements.
4. Formalize commands, queries and read models.
5. Formalize audit events, errors and acceptance evidence.

## Dependencies

- EPIC-10 tenant and workload isolation primitives;
- EPIC-11 system and governance projections;
- EPIC-12 authority, readiness and claim discipline;
- EPIC-13 tenant billing responsibility boundary;
- EPIC-14 navigation and claim-language patterns.

## Risks

- accidental RBAC generalization;
- collapsing tenant scope into global admin scope;
- treating visibility as authority;
- expanding into billing or runtime enforcement too early;
- introducing a tenant console without a tenant domain contract.

## Decision gates

- tenant ownership model;
- membership canonical source;
- administrative role minimum set;
- lifecycle transitions and terminal states;
- quota and entitlement boundary to economics;
- audit event minimum set;
- future API surface scope.

## Acceptance strategy

The package is acceptable when another agent can derive a bounded implementation plan without guessing:

- which module owns tenant truth;
- which actions are allowed or denied;
- which scopes are tenant-scoped or platform-scoped;
- which items are deferred;
- which events are audit-worthy;
- which claims remain unsupported.

## Definition of DONE

EPIC-15 is done when the normative package is internally consistent, aligned with repository truth, and precise enough to start the first implementation milestone without reopening the tenant or governance boundary.

