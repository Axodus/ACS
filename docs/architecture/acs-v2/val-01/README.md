# ACS-V2-VAL-01 — PostgreSQL Durable Foundations Acceptance

**Status:** PASS

**Date:** 2026-09-10

**Authority:** Axodus CTO

**Scope:** PostgreSQL validation and the narrowly scoped IMP-01C public error-surface repair; no production deployment, migration, credential, or architecture change was made.

## Result

VAL-01 established a disposable PostgreSQL 17.6 environment and exercised the current `PostgresSharedAuthoritativeState` implementation. Migration v3, lineage reconstruction, repeated expected-head CAS, canonical event/outbox durability, rollback, pending-outbox recovery, Evidence, Usage/Cost, replay, and runtime checkpoint recovery all produced PostgreSQL-backed evidence.

The original VAL-01 execution identified two public-boundary failures: the native repository raised a deterministic `NativeIdempotencyConflictError` or `NativeFencingError`, but `PostgresSharedAuthoritativeState.withTransaction` wrapped each as `TransactionFailedError` with code `ACS_REPOSITORY_TRANSACTION_FAILED`. The semantic error was available only as `cause`.

IMP-01C corrects that minimum boundary. `mapRepositoryError` now explicitly preserves only `NativeIdempotencyConflictError` and `NativeFencingError`; unexpected transaction failures remain `TransactionFailedError`. The PostgreSQL acceptance rerun passed with canonical caller-visible codes `ACS_NATIVE_IDEMPOTENCY_CONFLICT` and `ACS_NATIVE_FENCING_REJECTED`.

## Documents

| Document | Purpose |
| --- | --- |
| [Acceptance results](acceptance-results.md) | Gate-by-gate PostgreSQL result and defect evidence. |
| [Environment record](environment.md) | Disposable environment, commands, and reproducibility record. |

## Source changes

VAL-01 added validation support and evidence documentation. IMP-01C adds only the selective error classification, focused acceptance assertions, its completion record, and traceability updates:

- `tests/acs-v2-val-01-postgres.test.mjs`
- this VAL-01 package and the IMP-01C package
- ACS v2 index and traceability evidence updates

No migration definition, dependency, credential configuration, production deployment, or production migration changed.

## Decision boundary

The original public error-surface defects are closed by IMP-01C and the PostgreSQL acceptance rerun. Promotion remains subject to CTO review of the recorded evidence.

`ACS-BLOCKER-014` remains HIGH / OPEN and is not changed by VAL-01.
