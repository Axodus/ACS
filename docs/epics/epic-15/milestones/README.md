# EPIC-15 Milestones Index

This directory contains the implementation-oriented sequence for the future tenant administration track. The current sprint is normative planning only.

Milestone A01 is now implemented and documented in detail in A01-tenant-domain-lifecycle.md.

## Read order

1. Tenant Domain and Lifecycle
2. Membership and Administrative Authority
3. Governance, Limits and Entitlements
4. Administrative API and Control Plane
5. Auditability, Isolation Hardening and Acceptance

## Milestone A — Tenant Domain and Lifecycle

Focus:

- canonical tenant aggregate;
- status model;
- lifecycle transitions;
- ownership and provenance.

Exit criteria:

- tenant lifecycle is explicit;
- terminal-state policy is explicit;
- ownership is not ambiguous.

Status:

- implemented in Sprint A01;
- archive-only terminal state;
- hard delete deferred.

## Milestone B — Membership and Administrative Authority

Focus:

- membership source of truth;
- tenant owner, tenant admin, auditor and platform-admin roles;
- privilege escalation boundaries;
- platform-scoped versus tenant-scoped authority.

Exit criteria:

- authority is minimal and scoped;
- operator is not conflated with admin;
- membership semantics are implementation-ready.

Status:

- implemented in Sprint B01;
- canonical membership, role semantics, bootstrap owner, scoped authority and audit-ready receipts are in place;
- hard delete and generic RBAC remain out of scope.

## Milestone C — Governance, Limits and Entitlements

Focus:

- policy references;
- tenant guardrails for agents, deployments and execution;
- quota and entitlement contracts;
- usage and economic boundaries.

Exit criteria:

- limits are separated from system caps;
- economic enforcement boundary is explicit;
- policy references are implementation-ready.

## Milestone D — Administrative API and Control Plane

Focus:

- commands and queries;
- read models;
- error semantics;
- future UI surface plan.

Exit criteria:

- API boundary is tenant-scoped and platform-scoped where required;
- future surface shape is actionable;
- unsupported actions are explicit.

## Milestone E — Auditability, Isolation Hardening and Acceptance

Focus:

- administrative event contract;
- audit trail expectations;
- isolation invariants;
- implementation acceptance evidence.

Exit criteria:

- audit-worthy events are enumerated;
- isolation invariants are testable;
- DONE can be evaluated without reinterpretation.

## Milestone dependency shape

~~~text
A Tenant Domain and Lifecycle
  -> B Membership and Administrative Authority
  -> C Governance, Limits and Entitlements
  -> D Administrative API and Control Plane
  -> E Auditability, Isolation Hardening and Acceptance
~~~

## Rule

Do not start implementation from this directory until the normative docs are settled and the open decisions are explicitly reviewed.
