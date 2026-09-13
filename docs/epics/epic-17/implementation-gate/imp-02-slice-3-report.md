# EPIC-17-IMP-02 — Slice 3 Implementation Report

## STATUS

`AUTHORIZED / GO` — implementation prepared; final closure audit remains pending.

This slice is limited to resolution provenance, Product API read projection,
provider/model historical observations and conformance evidence using the
existing Runtime and persistence semantics.

## IMPLEMENTED BOUNDARY

- Each effective-configuration class now carries bounded deterministic
  provenance: considered, selected, authority, attenuated, rejected,
  unavailable and exact observation fingerprints.
- Provider/model selection requires an exact immutable observation identified by
  `provider_id/model_id`; missing evidence is `unavailable` and never falls
  back to the current registry.
- Provider/model evidence records availability only. It cannot grant authority,
  permission, credential access or execution authorization.
- The existing `RuntimeExecutionIntentV2` JSON payload retains the snapshot,
  resource observations and provenance correlation.
- Product API adds read-only intent snapshot detail and run configuration-history
  projections with Tenant filtering and typed unavailable/not-found errors.
- No Product API mutation or parallel configuration authority was introduced.

## EXPLICITLY DEFERRED

MCP endpoint, configuration, Connection and Credential semantics remain
`DEFERRED BY ARCHITECTURE` to REQ-05. The slice preserves the distinction
between an REQ-04 governed MCP definition and future REQ-05 connection/runtime
ownership.

No new database, table, migration, configuration aggregate, revision stream,
Runtime redesign, Assignment redesign or admission architecture was added.

## VALIDATION TARGET

The final closure audit must record, with exact evidence:

1. Build and focused Slice 3 tests.
2. Product API snapshot/history projection and Tenant isolation.
3. Provider/model fail-closed historical reconstruction.
4. Retry/recovery/re-admission reuse of the admitted snapshot and successor
   snapshot creation for a new admission.
5. PostgreSQL acceptance in a Docker-capable environment.
6. Full listener-capable regression with each failure classified as A —
   Slice 3, B — independent regression, C — environment/harness, or D —
   indeterminate; final closure requires A=0 and D=0.

The implementation report does not declare the milestone closed.
