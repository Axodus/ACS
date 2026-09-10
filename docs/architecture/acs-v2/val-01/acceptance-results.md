# VAL-01 Acceptance Results

## Status

`PASS`

Previous VAL-01 result: `FAIL` for the two public error-surface gates. IMP-01C fix validation: `PASS`. Current disposition: `PASS`.

The durable PostgreSQL state remains correct for the tested commit, rollback, reconstruction, recovery, duplicate, and concurrency paths. The public durable API now preserves the two frozen REQ-04 domain outcomes directly.

## Acceptance matrix

| Gate | Result | Test / evidence | Notes |
| --- | --- | --- | --- |
| PostgreSQL migration v3 | PASS | `acs-v2-imp-01b.test.mjs`; `acs-v2-val-01-postgres.test.mjs`; catalog inspection | Clean disposable database applied versions 1–3; second migrate returned 3. |
| Migration additive safety | PASS | v3 migration inspection; PostgreSQL catalog | v3 contains no destructive statement; legacy and native record kinds remain distinct. |
| Agent restart reconstruction | PASS | IMP-01B PostgreSQL test | Three revisions, ordering, predecessor links, fingerprints, and head survived client recreation. |
| Revision immutability | PASS | Native lineage path; legacy repository filters `record_kind = 'legacy'` | Supported legacy get/save/remove paths cannot select native v2 rows; native path appends revisions. |
| Expected-head CAS | PASS | IMP-01B PostgreSQL test; VAL-01 three repeated two-client rounds | Exactly one writer advanced each head; loser received `RevisionConflictError`; no fork observed. |
| Fingerprint integrity | PASS | IMP-01 and IMP-01B focused validation; restart reconstruction | Native validation and persisted lineage reconstruction retain and compare fingerprints. |
| Canonical Event persistence / reconstruction | PASS | IMP-01B and VAL-01 PostgreSQL tests | Event identity, stream sequence, correlation, payload, and aggregate relation survived client recreation. |
| Transaction atomicity | PASS | VAL-01 controlled throw after native lineage command in `withTransaction` | Agent/head/history, Event, outbox, and idempotency result were absent after rollback. |
| Pending outbox recovery | PASS | VAL-01 PostgreSQL test | Pending row survived client recreation, was leased, marked retryable, recreated client, reclaimed, and acknowledged. |
| At-least-once / duplicate delivery | PASS | IMP-01B and VAL-01 outbox retry/reclaim flow | Retry changes delivery state without changing canonical Event. No exactly-once external claim is made. |
| Durable idempotency effects | PASS | VAL-01 PostgreSQL test | Same key/hash returned prior result after restart; Usage/Cost count remained one. |
| Durable idempotency conflict surface | PASS | VAL-01 PostgreSQL test after IMP-01C | Different request hash reaches the caller as `NativeIdempotencyConflictError` with `ACS_NATIVE_IDEMPOTENCY_CONFLICT`; it is not a generic transaction failure. Historical VAL-01 result was FAIL. |
| Fenced checkpoint persistence | PASS | VAL-01 PostgreSQL test | Valid runtime ownership created checkpoint, Event, outbox, and durable checkpoint reconstruction. |
| Stale-worker rejection surface | PASS | VAL-01 PostgreSQL test after IMP-01C | Recovered assignment rejects the stale write at the caller as `NativeFencingError` with `ACS_NATIVE_FENCING_REJECTED`; no stale checkpoint, Event, or outbox row is created. Historical VAL-01 result was FAIL. |
| Runtime / checkpoint recovery | PASS | VAL-01 PostgreSQL test | Expired assignment requeued; next claimant received fencing token N+1; prior checkpoint remained durable. |
| Evidence durability | PASS | IMP-01B and VAL-01 PostgreSQL tests | Event- and subject-linked Evidence survived client recreation and remained distinct from Events. |
| Usage / Cost durability | PASS | IMP-01B and VAL-01 PostgreSQL tests | Native Usage and Cost survived client recreation with provider-neutral records. |
| Usage / Cost duplicate safety | PASS | VAL-01 PostgreSQL test | Repeated accounting command after restart retained one Usage and one Cost record. |
| Replay isolation | PASS | `replayEvents` implementation plus PostgreSQL replay | Replay reads `acs_native_events`; no provider, executor, tool, webhook, financial, or delivery call is present on that path. |
| Generic repository failure surface | PASS | VAL-01 deterministic injected unexpected transaction failure | An uncategorized `Error` is still surfaced as `TransactionFailedError` with `ACS_REPOSITORY_TRANSACTION_FAILED` and retained cause metadata. |
| Security boundaries | PASS | focused native validation; PostgreSQL catalog; VAL-01 fencing | Secret-like payload validation, foreign-key relations, legacy/native separation, stale-write rejection, and canonical public error codes hold. No new infrastructure detail is surfaced. |
| Projection rebuild | NOT APPLICABLE | REQ-04 | Frozen v1 exclusion; no projection framework was added. |

## PostgreSQL findings

`acs_schema_migrations` recorded versions 1, 2, and 3. PostgreSQL catalog inspection confirmed native event primary and stream sequence uniqueness, event-to-outbox and event-to-evidence foreign keys, idempotency composite primary key, native lineage fingerprint uniqueness, checkpoint assignment foreign key, and constrained outbox status values.

The database reported `READ COMMITTED`. The accepted implementation supplements that level with advisory locks, row locks, compare-and-swap predicates, and unique constraints described in [environment.md](environment.md).

## Historical failure detail and IMP-01C closure

### VAL-01-DEFECT-001 — native idempotency conflict loses public type

**Invariant:** a same scope/key with a different request hash returns a deterministic idempotency conflict.

**Previous VAL-01 observation:** `NativeIdempotencyConflictError` was the cause, but the public `state.nativeCore.advanceAgentLineage` call returned `TransactionFailedError` with code `ACS_REPOSITORY_TRANSACTION_FAILED`.

**Affected location:** `mapRepositoryError` / `withTransaction` in `src/control-plane/shared-state/postgres-shared-state.ts`.

### VAL-01-DEFECT-002 — native fencing rejection loses public type

**Invariant:** a stale worker cannot author the checkpoint, Event, or outbox for a recovered assignment.

**Previous VAL-01 observation:** the stale write made no canonical records and caused `NativeFencingError`, but the public call returned `TransactionFailedError` with code `ACS_REPOSITORY_TRANSACTION_FAILED`.

**Affected location:** the same public error mapping boundary.

**IMP-01C closure:** `mapRepositoryError` explicitly recognizes these two canonical native errors and rethrows them. The PostgreSQL caller-facing rerun verifies `ACS_NATIVE_IDEMPOTENCY_CONFLICT` and `ACS_NATIVE_FENCING_REJECTED` directly, while a controlled unknown transaction failure still produces `ACS_REPOSITORY_TRANSACTION_FAILED`.

## Regression classification

| Observation | Classification |
| --- | --- |
| VAL-01-DEFECT-001 | CLOSED by IMP-01C PostgreSQL validation |
| VAL-01-DEFECT-002 | CLOSED by IMP-01C PostgreSQL validation |
| s27, s54, s57, s62, s63 | KNOWN ACS-BLOCKER-014; not fixed or reclassified |
| s43 | KNOWN ENVIRONMENT CONDITION; broad suite uses isolated SQLite path |

## Full-suite result

The broad suite ran serially with an isolated temporary
`ACS_RUNTIME_DATABASE_PATH` and without `ACS_SH_DATABASE_URL`:

```text
ACS_RUNTIME_DATABASE_PATH=<temporary> \
  node --test --test-concurrency=1 tests/*.test.mjs

tests 691
pass 682
fail 5
skipped 4
```

The five failures were exactly the preserved `ACS-BLOCKER-014` identities:

- `s27-operational-evidence`: `405`, expected `200`.
- `s54-epic-15-5-observability-incident-acceptance`: `429`, expected `200`.
- `s57-epic-15-5-production-target-process-acceptance`: missing `/opt/Axodus/dist/engines/production-target-server.js`.
- `s62-epic-16-2-economic-authorization-reservations`: missing `createControlPlaneContext` export.
- `s63-epic-16-3-usage-settlement`: reservation correlation was `undefined`, expected `res_usage_1`.

`s43-epic-13-final-hardening` passed separately with an isolated temporary
SQLite runtime path. No new broad-suite regression attributable to VAL-01 was
observed.

## Recommendation

`ACS-V2-VAL-01`: `PROMOTE TO COMPLETE`

`ACS-V2-IMP-01B`: `PROMOTE TO COMPLETE`

`ACS-V2-IMP-01`: `PROMOTE TO COMPLETE`

The next recommended milestone remains separate review/remediation for `ACS-BLOCKER-014`. Do not begin it from this result alone.
