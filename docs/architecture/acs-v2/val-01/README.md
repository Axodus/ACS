# ACS-V2-VAL-01 — PostgreSQL Durable Foundations Acceptance

**Status:** PARTIAL

**Date:** 2026-09-10

**Authority:** Axodus CTO

**Scope:** validation only; no production deployment, migration, credential, or architecture change was made.

## Result

VAL-01 established a disposable PostgreSQL 17.6 environment and exercised the current `PostgresSharedAuthoritativeState` implementation. Migration v3, lineage reconstruction, repeated expected-head CAS, canonical event/outbox durability, rollback, pending-outbox recovery, Evidence, Usage/Cost, replay, and runtime checkpoint recovery all produced PostgreSQL-backed evidence.

VAL-01 remains PARTIAL because two frozen REQ-04 public-boundary requirements fail. The native repository raises a deterministic `NativeIdempotencyConflictError` or `NativeFencingError`, but `PostgresSharedAuthoritativeState.withTransaction` wraps each as `TransactionFailedError` with code `ACS_REPOSITORY_TRANSACTION_FAILED`. The semantic error is available only as `cause`, so callers cannot distinguish idempotency conflict or stale-owner rejection from a generic transaction failure.

This report does not repair that defect. It records the minimum affected boundary: `mapRepositoryError` in `src/control-plane/shared-state/postgres-shared-state.ts` does not preserve the native idempotency and fencing errors that it receives from the transaction callback.

## Documents

| Document | Purpose |
| --- | --- |
| [Acceptance results](acceptance-results.md) | Gate-by-gate PostgreSQL result and defect evidence. |
| [Environment record](environment.md) | Disposable environment, commands, and reproducibility record. |

## Source changes

Only validation support and evidence documentation were added:

- `tests/acs-v2-val-01-postgres.test.mjs`
- this VAL-01 package
- ACS v2 index and traceability evidence updates

No production implementation, migration definition, dependency, or credential configuration changed.

## Decision boundary

`ACS-V2-IMP-01B` and `ACS-V2-IMP-01` must remain `PARTIAL — ACCEPTED` until the public error mapping preserves the frozen deterministic idempotency and stale-fencing outcomes and the corresponding PostgreSQL acceptance rerun passes.

`ACS-BLOCKER-014` remains HIGH / OPEN and is not changed by VAL-01.
