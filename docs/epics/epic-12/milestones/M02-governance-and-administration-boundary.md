# M02 - Governance And Administration Boundary

Status: PLANNING

## Mission

Decide what governance and administration belong in EPIC-12 without turning the
control plane into a production tenant administration suite by accident.

## Problem

EPIC-11 exposed governance and administration visibility, but production-grade
mutation authority, tenant administration, and policy enforcement require
explicit boundary decisions.

## Candidate Capabilities

- operator-only administration model;
- tenant-aware but non-tenant-admin model;
- limited tenant-admin model, if explicitly chosen;
- guarded configuration mutation boundaries;
- governance visibility and policy enforcement boundaries;
- audit correlation for administrative decisions.

## Dependencies

- M01 Auth/RBAC baseline;
- EPIC-12 contracts;
- Product API authority model;
- candidate inventory governance, administration, and tenant entries.

## Out Of Scope

- enterprise tenant administration suite;
- full tenant governance console;
- billing administration;
- compliance program tooling;
- broad policy engine reimplementation.

## Risks

- collapsing operator, admin, and tenant identities;
- granting mutation scope before denied states are defined;
- turning governance visibility into a generic admin backlog;
- reimplementing EPIC-10 policy or tenancy domains.

## Expected Validation

- written administration mode decision;
- allowed vs denied operations;
- read-only vs mutation boundaries;
- evidence requirements for administrative actions;
- tenant scope language that avoids unsupported readiness claims.

## Preliminary Acceptance Criteria

- Administration/Tenant boundary is explicit;
- governance visibility is separated from governance mutation;
- unsupported or deferred admin states are honest;
- no `Administration Ready` or `Tenant Governance Ready` claim is made.

## Open Questions

- Is EPIC-12 operator-only?
- Should the surface be tenant-aware without tenant-admin capability?
- Which mutations, if any, are safe to expose?
- What audit evidence is mandatory for administrative actions?

## EPIC-11 Caveat Relationship

M02 consumes EPIC-11 administration and tenant-boundary caveats. It must keep
EPIC-11 closed and treat caveats as EPIC-12 planning inputs.

## EPIC-12 Decision Relationship

M02 is blocked on Administration/Tenant boundary and depends on the M01 Auth/RBAC
baseline.
