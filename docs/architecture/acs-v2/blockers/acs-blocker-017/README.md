# ACS-BLOCKER-017

## STATUS

RESOLVED / ACCEPTED

## ORIGINAL IMP-03D STATUS

PARTIAL / IMPLEMENTATION ACCEPTED / ACCEPTANCE NOT CLOSED. The implementation already contained `RuntimeExecutionIntentV2`, canonical assignment compilation, assignment-bound Attempt persistence, migration 7, stale-assignment rejection, and recovery binding validation. Closure required durable PostgreSQL evidence and causal analysis of eight EPIC 15.5 failures.

## ORIGINAL FULL-SUITE FAILURE SET

Initial full-suite result: 120 total, 112 passed, 8 failed, 0 skipped. The failing files were `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, and `s57`.

## POSTGRESQL ENVIRONMENT

The canonical `.env.local` setting was used: `ACS_SH_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/acs_imp_03a`. The local PostgreSQL container `acs-imp03a-pg` exposed `127.0.0.1:55433` to PostgreSQL 17.6. Tests created isolated schemas using the established repository convention.

## MIGRATION 7 ACCEPTANCE

Migration 7 was applied from clean initialization and through the existing v6 upgrade path. It created `acs_runtime_execution_intents` and `acs_runtime_attempts` without destructive statements. The schema includes Run, assignment, and intent foreign keys; positive generation and revision checks; uniqueness for assignment intent and intent Attempt admission; and task indexes. Scalar bindings are stored with the immutable canonical payload, including member slot, Agent revision, and Workforce revision.

## IMP-03D POSTGRESQL ACCEPTANCE

The combined focused run passed 25 tests with 0 failures and 0 skips: IMP-03A 7, IMP-03B 4, IMP-03C 5, IMP-03D 8 (5 contract and 3 PostgreSQL), and VAL-01 1. The PostgreSQL IMP-03D and VAL-01 cases were repeated separately with 4 passed, 0 failed, and 0 skipped. Durable coverage included clean initialization, v6-to-v7 upgrade coverage, compilation, exact slot and revision binding, reload reconstruction, head advance, reassignment history, idempotency, rollback, event/outbox consistency, checkpoint recovery, leases, fencing, and CAS behavior.

## CONCURRENCY / ASSIGNMENT RACE

Compilation serializes by Run/Task advisory transaction lock, reads the requested assignment and the current assignment inside the transaction, and rejects a superseded assignment with `NativeStaleAssignmentError`. It never silently switches the request to a newer assignment. The existing PostgreSQL CAS tests also passed.

## LEASE / FENCING

The implementation reuses the existing runtime lease and fencing primitives. Assignment generation remains separate from the runtime fencing token. Existing stale-writer rejection passed in PostgreSQL validation and in the full suite.

## RECOVERY / CHECKPOINT

Reload reconstructs the persisted intent and Attempt from canonical payloads. Agent and Workforce head advancement does not change historical references. Reassignment leaves the original Attempt bound to A1/member M1 and allows classification as superseded without relabeling. Existing checkpoint recovery preserves its original Attempt and fencing identity.

## EVENT / OUTBOX / FAILURE INJECTION

Intent, Attempt, assignment binding, event, outbox, and idempotency are written through the existing transaction wrapper. Rollback and failure-injection coverage leaves no partial canonical state; replay is deterministic and does not duplicate the event or outbox record.

## EPIC 15.5 FAILURE CAUSALITY MATRIX

| TEST | SUITE | FAILURE MESSAGE | EXPECTED | ACTUAL | REPRODUCIBLE | CHILD PROCESS OUTPUT | RELEVANT FILES | FIRST KNOWN CAUSAL CHANGE | RELATION TO IMP-03D | ACCEPTED INVARIANT | CLASSIFICATION | REMEDIATION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s48 | distributed rate limiting / HTTP edge | `listen EPERM: operation not permitted 127.0.0.1` | HTTP child binds and assertions execute | Sandbox child cannot bind; socket-capable run passed | Yes in restricted sandbox; no with escalation | stderr contained bind error; escalated exit 0 | `tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs` | Sandbox socket policy | None | Child failures remain visible and HTTP tests bind | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Run with local socket capability; preserve stderr and exit status |
| s50 | remote worker dispatch | `listen EPERM: operation not permitted 127.0.0.1` | Worker/control-plane children start | Sandbox bind denied; socket-capable run passed | Yes in restricted sandbox; no with escalation | stderr showed bind denial; escalated exit 0 | `tests/s50-epic-15-5-remote-worker-dispatch.test.mjs` | Sandbox socket policy | None | Child startup errors are observable | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable validation; no production fix |
| s51 | distributed runtime acceptance | `listen EPERM: operation not permitted 127.0.0.1` | Independent processes exercise recovery/fencing | Sandbox startup blocked; D03 passed with progress/evidence | Yes in restricted sandbox; no with escalation | bind error in stderr; escalated exit 0 | `tests/s51-epic-15-5-distributed-runtime-acceptance.test.mjs` | Sandbox socket policy | None | Evidence comes from independent processes | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; retain progress and stderr |
| s52 | structured telemetry | `listen EPERM: operation not permitted 127.0.0.1` | Telemetry HTTP child binds | Sandbox bind denied; 4 tests passed with socket access | Yes in restricted sandbox; no with escalation | child stderr reported bind denial; escalated exit 0 | `tests/s52-epic-15-5-structured-telemetry.test.mjs` | Sandbox socket policy | None | Telemetry failures remain bounded and visible | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; no assertion weakening |
| s54 | observability incident acceptance | `listen EPERM: operation not permitted 127.0.0.1` | Independent incident processes complete | Sandbox bind denied; E03 passed with socket access | Yes in restricted sandbox; no with escalation | bind denial in stderr; escalated exit 0 | `tests/s54-epic-15-5-observability-incident-acceptance.test.mjs` | Sandbox socket policy | None | Incident evidence preserves diagnostics | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; no product fix |
| s55 | operational UX contract | `listen EPERM: operation not permitted 127.0.0.1` | Durable UX service starts | Sandbox child bind denied; F01/F02 passed with socket access | Yes in restricted sandbox; no with escalation | bind denial in stderr; escalated exit 0 | `tests/s55-epic-15-5-operational-ux-contract.test.mjs` | Sandbox socket policy | None | Acceptance crosses the real service boundary | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; no product fix |
| s56 | production deployment gate | `listen EPERM: operation not permitted 127.0.0.1` | Deployment gate process starts and persists | Sandbox bind denied; G01/G02/G03 passed with socket access | Yes in restricted sandbox; no with escalation | bind denial in stderr; escalated exit 0 | `tests/s56-epic-15-5-production-deployment-gate.test.mjs` | Sandbox socket policy | None | Gate failures are distinguishable from startup policy | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; no product fix |
| s57 | production target process acceptance | `listen EPERM: operation not permitted 127.0.0.1` | Target deploy/health/rollback process completes | Sandbox bind denied; target test passed with socket access | Yes in restricted sandbox; no with escalation | bind denial in stderr; escalated exit 0 | `tests/s57-epic-15-5-production-target-process-acceptance.test.mjs` | Sandbox socket policy | None | Target assertions are observed across the boundary | HARNESS / CHILD PROCESS OBSERVABILITY DEFECT | Socket-capable run; no product fix |

## ROOT CAUSE SUMMARY

All eight failures had the same environmental trigger: restricted sandbox processes were prohibited from listening on `127.0.0.1`. Direct isolated and owning-suite runs with local socket capability passed, including child output and exit status. This is a harness/child-process observability environment defect, not an IMP-03D regression.

## WHAT CHANGED — PRODUCTION CODE

NONE for blocker remediation. Existing IMP-03D production changes were preserved.

## WHAT CHANGED — TESTS / FIXTURES

NONE for blocker remediation. Existing assertions and fixtures were retained.

## WHAT CHANGED — HARNESS / ISOLATION

NONE in repository code. Validation was rerun with local socket capability; no skip, retry, swallowed exception, or assertion weakening was introduced.

## WHAT CHANGED — MIGRATIONS

NONE. Migration 7 was proven additive and valid.

## CONTRACT CHANGES

NONE.

## FILES CHANGED

The existing IMP-03D implementation and documentation remain in the worktree. Blocker remediation added or updated only this report, `docs/architecture/acs-v2/imp-03d/acceptance-report.md`, and `docs/architecture/acs-v2/imp-03d/postgresql-validation.md`.

## IMP-03A VALIDATION

7 passed, 0 failed, 0 skipped.

## IMP-03B VALIDATION

4 passed, 0 failed, 0 skipped.

## IMP-03C VALIDATION

5 passed, 0 failed, 0 skipped.

## IMP-03D VALIDATION

8 passed, 0 failed, 0 skipped (5 contract, 3 PostgreSQL).

## VAL-01 VALIDATION

1 passed, 0 failed, 0 skipped.

## RUNTIME / RECOVERY VALIDATION

The runtime/recovery command passed 13 tests, 13 passed, 0 failed, 0 skipped. The eight affected EPIC 15.5 files passed individually for 23 total tests and passed together for 23 tests, with 0 failures and 0 skips. The combined focused PostgreSQL command passed 25 tests, 25 passed, 0 failed, 0 skipped; the durable PostgreSQL subset was repeated with 4 passed, 0 failed, and 0 skipped.

## EPIC 15.5 VALIDATION

The eight affected files passed individually and in the combined owning run. Combined affected run: 23 passed, 0 failed, 0 skipped.

## REPEATABILITY

PostgreSQL focused validation passed with the canonical database URL and the durable subset was repeated. EPIC 15.5 affected tests passed in isolated execution and in the combined owning run with socket access. The full suite passed in the same environment.

## BUILD / TYPECHECK / LINT / DIFF-CHECK

Build/typecheck: PASS through `npm run build` (`tsc -p tsconfig.json`). Lint: no separate lint script is defined. `git diff --check`: PASS.

## FULL REPOSITORY VALIDATION

- total: 718
- passed: 718
- failed: 0
- skipped: 0

## REGRESSIONS

None found. IMP-03A, IMP-03B, IMP-03C, IMP-03D, VAL-01, runtime/recovery, and EPIC 15.5 remain green.

## BLOCKERS

None for the authorized acceptance scope. The sandbox socket restriction remains a limitation of unprivileged reproduction, so future child-process acceptance must retain equivalent socket capability. This is an execution-environment requirement and did not require a repository harness change.

## RISKS

IMP-03D keeps member-slot, Agent revision, and Workforce revision immutable values in payload JSON plus scalar indexed fields; no new composite foreign-key topology was introduced. Recovery validates those canonical bindings and rejects corruption.

## CTO DECISIONS REQUIRED

None.

## CEO DECISIONS REQUIRED

None.

## RECOMMENDATION

IMP-03D CAN BE CLOSED
