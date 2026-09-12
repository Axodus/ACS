# VAL-03 acceptance report

## STATUS

`BLOCKED`

## Executive validation summary

The accepted Workforce chain was exercised with real shared PostgreSQL, canonical Native Core, real Product API HTTP host, and a schema-isolated fixture. Workforce creation, idempotency, draft rejection semantics, activation, immutable revision creation, stale-head rejection, Run admission, current-head resolution, pinned membership, proposal, Decision, and Assignment generation 1 all worked.

Runtime compilation then failed on a canonical event-stream CAS conflict before Attempt A. No production implementation was changed.

## Defects discovered

| ID | Class | Finding | Effect |
| --- | --- | --- | --- |
| VAL-03-DEFECT-001 | D — implementation regression | `compileTaskExecution` asks for a Run stream sequence but emits an Agent-scoped event whenever the assigned Agent is present. | Blocks runtime compilation, Attempt, reassignment, recovery, integrated browser closure, and contract closure. |
| VAL-03-DEFECT-002 | D — implementation regression | `NativeRunAdmissionError` is wrapped by the PostgreSQL shared-state adapter as `TransactionFailedError`; native code survives only as `cause`. | Draft admission is rejected atomically but the typed public native error is not preserved. |

## PostgreSQL acceptance

Container `acs-imp03a-pg`, PostgreSQL 17.6, published on `127.0.0.1:55433`, database `acs_imp_03a`. The test created and removed an isolated schema. No migration, persistent fixture, provider dependency, CAMEL dependency, or Eigent dependency was introduced.

## Product API and application

The real HTTP host proved reached Workforce mutations and reads. The local application showed a connected Create Workforce flow and correct unselected local navigation. Standalone application validation passed; the static browser matrix reported 88 checks with zero failures and expected no-API caveats.

## Full repository validation

```text
total:    732
passed:   731
failed:   1
skipped:  0
duration: 107633.223347 ms
```

The sole failure is `tests/acs-v2-val-03-postgres.test.mjs` at the first runtime compilation. Previously accepted IMP-03A through IMP-03F and VAL-01 tests remained green in this run.

## Static validation

```text
build:                 PASS
application typecheck: PASS
application tests:     13 pass, 0 fail, 0 skip
application lint:      0 errors, 10 pre-existing warnings
application build:     PASS
browser matrix:        88 PASS_WITH_CAVEAT, 0 failure
git diff --check:      PASS
```

## Host / container cleanup

The VAL-03 test closed its HTTP context and dropped its temporary schema in `finally`. No user host or persistent container was stopped. The user's existing local application and `acs-imp03a-pg` container were left running.

## Contract closure recommendation

ACS-V2-VAL-03 IS BLOCKED

WORKFORCE CONTRACT CLOSURE IS REJECTED PENDING REMEDIATION
