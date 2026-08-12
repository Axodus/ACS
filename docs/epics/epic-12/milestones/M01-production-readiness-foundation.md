# M01 - Production Readiness Foundation

Status: PLANNING

## Mission

Define and sequence the minimum production-readiness blockers EPIC-12 intends
to close before any production readiness claim is allowed.

## Problem

EPIC-11 closed as a sandbox/development operational surface with formal caveats.
EPIC-12 needs a defensible baseline for identity, authority, secrets,
persistence, environments, and readiness gates.

## Candidate Capabilities

- production readiness gate definition;
- authentication boundary;
- authorization / RBAC baseline;
- secrets boundary;
- persistence readiness;
- environment separation;
- production claim discipline.

## Dependencies

- EPIC-11 closure report and caveats;
- EPIC-10 Product API and domain truth;
- EPIC-12 contracts;
- candidate inventory decisions for auth, RBAC, secrets, persistence, and
  environments.

## Out Of Scope

- real auth implementation during planning;
- real RBAC implementation during planning;
- secret manager migration;
- production deployment;
- billing readiness;
- tenant administration suite.

## Risks

- treating sandbox behavior as production evidence;
- expanding into full identity platform design;
- reimplementing Product API domain truth;
- hiding durable-state gaps behind UI language.

## Expected Validation

- documented readiness gate list;
- explicit blockers closed vs deferred;
- technical evidence required for auth, RBAC, secrets, persistence, and
  environment claims;
- no production readiness claim before gates pass.

## Preliminary Acceptance Criteria

- minimum production blockers are listed and mapped to evidence;
- `Production Ready: NO / not yet claimed` remains preserved;
- Auth/RBAC and Secrets decisions are ready for Planner closure or explicitly
  deferred with rationale;
- Persistence readiness is separated from mock, seed, sandbox, and read-only
  assumptions.

## Open Questions

- What is the minimum authenticated actor model?
- What role/permission model is sufficient for EPIC-12?
- Which state must be durable?
- Which environments must exist before any readiness claim?
- Which blockers remain deferred after EPIC-12?

## EPIC-11 Caveat Relationship

M01 consumes EPIC-11 production-readiness, auth/RBAC, secrets, and evidence
caveats. It must not relabel EPIC-11 gaps as unfinished EPIC-11 scope.

## EPIC-12 Decision Relationship

M01 is blocked on Auth/RBAC model, Secrets boundary, Persistence readiness, and
Production readiness blocker decisions.
