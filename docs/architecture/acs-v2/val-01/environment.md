# VAL-01 Environment Record

## Disposable environment

| Item | Value |
| --- | --- |
| PostgreSQL | 17.6 (`postgres:17.6-alpine`) |
| Provisioning | local Docker container, disposable, loopback-only port publication |
| Database | synthetic `acs_val_01`; no production records or credentials |
| Node.js | v24.20.0 |
| npm | 12.0.2 |
| Schema version | 3, `native_core_durable_lineage_events_and_outbox` |
| Branch / commit | `dev` / `327bf8b` before VAL-01 validation-only changes |
| Isolation | PostgreSQL database reset before each independent acceptance command; broad SQLite suite uses a temporary `ACS_RUNTIME_DATABASE_PATH` |

The database URL was supplied only as a process environment variable and is not recorded here. The container used PostgreSQL's local disposable `trust` mode and was reachable only through `127.0.0.1`; it did not contain a password or a production connection string.

## PostgreSQL commands

```text
npm run build
ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/acs-v2-imp-01b.test.mjs
ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/s59-post-15-5-aees-sh-shared-state.test.mjs
ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/acs-v2-val-01-postgres.test.mjs
```

Each command ran against a reset disposable database. A grouped rerun without reset is invalid for VAL-01 because `claimNextOutbox` correctly selects the oldest pending row globally, which can belong to a prior synthetic test.

The focused IMP-01B and SH01–SH03 PostgreSQL tests passed. The VAL-01 test passed as a diagnostic acceptance record: it asserts the current wrapped public errors as well as the durable data outcomes, allowing the evidence to be retained while the acceptance matrix marks those public contract gates failed.

## Transaction and concurrency mechanism

The implementation used PostgreSQL `READ COMMITTED` isolation, transaction-scoped advisory locks for migrations, idempotency keys, and event streams, row locks for lineage/runtime/outbox state, `FOR UPDATE SKIP LOCKED` for outbox and job claiming, and unique indexes for lineage fingerprints, event stream sequence, idempotency, and event/outbox relations.

No isolation level was changed for VAL-01.
