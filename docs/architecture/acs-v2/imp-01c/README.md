# ACS-V2-IMP-01C — Typed Durable Error Surface Completion

**Status:** COMPLETE

**Date:** 2026-09-10

**Authority:** Axodus CTO

**Production authorization:** No production deployment or migration is authorized by this record.

## Defect summary

VAL-01 found that two canonical durable outcomes reached callers only through
`TransactionFailedError.cause`: native idempotency conflict and stale-fencing
rejection. The public boundary therefore exposed
`ACS_REPOSITORY_TRANSACTION_FAILED` for both contract-level outcomes.

## Root cause

`mapRepositoryError` in `postgres-shared-state.ts` is the public transaction
boundary. Its explicit pass-through list did not include
`NativeIdempotencyConflictError` or `NativeFencingError`, despite both errors
already being preserved by the native durable query layer. The transaction
boundary consequently wrapped them as generic failures.

## Implementation approach

The transaction boundary now selectively preserves only these existing native
canonical errors:

| Canonical error | Public code | Result |
| --- | --- | --- |
| `NativeIdempotencyConflictError` | `ACS_NATIVE_IDEMPOTENCY_CONFLICT` | Caller receives the typed conflict directly. |
| `NativeFencingError` | `ACS_NATIVE_FENCING_REJECTED` | Caller receives the typed stale-owner rejection directly. |

All other uncategorized errors continue through `TransactionFailedError` with
`ACS_REPOSITORY_TRANSACTION_FAILED` and existing cause metadata. No message
matching, schema change, transaction change, dependency, or broader error
taxonomy normalization was introduced.

## Tests and PostgreSQL validation

`tests/acs-v2-val-01-postgres.test.mjs` exercises the public
`PostgresSharedAuthoritativeState.nativeCore` surface. It verifies:

- different request hash under an established native idempotency key returns
  `NativeIdempotencyConflictError` and preserves the existing lineage;
- stale runtime ownership returns `NativeFencingError` and creates no stale
  checkpoint, Event, or outbox record;
- a controlled unexpected transaction exception remains
  `ACS_REPOSITORY_TRANSACTION_FAILED`.

The same disposable PostgreSQL 17.6 environment recorded for VAL-01 is used
for the required PostgreSQL reruns. See [VAL-01](../val-01/README.md) for the
gate matrix and environment record.

## Regression result

The focused and PostgreSQL validation is recorded in VAL-01. The isolated
repository suite remains expected to preserve the five open
`ACS-BLOCKER-014` cases: `s27`, `s54`, `s57`, `s62`, and `s63`. This milestone
does not alter them.

## Completion recommendation

Subject to CTO review of the command evidence in VAL-01:

- `ACS-V2-IMP-01C`: `COMPLETE`
- `ACS-V2-VAL-01`: `PROMOTE TO COMPLETE`
- `ACS-V2-IMP-01B`: `PROMOTE TO COMPLETE`
- `ACS-V2-IMP-01`: `PROMOTE TO COMPLETE`

## Traceability

`REQ-04 contract → IMP-01B implementation → VAL-01 discovered defect →
IMP-01C fix → PostgreSQL validation → acceptance evidence`.

## Boundaries

No database migration, dependency, idempotency semantic, fencing semantic,
lease semantic, outbox behavior, runtime recovery behavior, or production
authorization changed.
