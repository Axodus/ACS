# SH02 — Shared Production Database Adapters & State Migration

**Result:** `PASS`

## Backend decision

PostgreSQL 17.6 was selected after dependency/environment discovery found no existing network database adapter. It supplies:

- network connections and independent pools;
- concurrent writers;
- transactions and row locking;
- conditional revision updates;
- partial unique indexes;
- `FOR UPDATE SKIP LOCKED`;
- database-owned sequences and timestamps;
- restart/reconnect semantics.

Driver: `pg` 8.16.3 with `@types/pg` 8.15.5. No subprocess `psql`, SQLite-over-NFS, state copying, filesystem lock or write-behind authority is used.

## Schema and migrations

`SHARED_STATE_SCHEMA_VERSION=1`. Ordered migrations live in `src/control-plane/shared-state/migrations.ts` and are serialized with a PostgreSQL advisory transaction lock. Startup/readiness verifies the schema version.

Dedicated tables preserve aggregate constraints:

- Tenant, membership and their histories;
- governance state/history;
- ordered audit events;
- Agent current/history;
- deployment current/history;
- secret metadata only;
- economic records with tenant-scoped idempotency;
- jobs, workers, assignments, runtime events and fencing counters;
- HTTP rate-limit buckets.

JSONB stores canonical aggregate payloads while explicit key, revision, status, lease and idempotency columns retain database constraints. This is not a generic key/value authority table.

## Transaction and consistency model

- default PostgreSQL `READ COMMITTED` isolation;
- row-level locks for worker/assignment ownership;
- `FOR UPDATE SKIP LOCKED` for claim/recovery contention;
- conditional `UPDATE ... WHERE revision = expected` for Agent/deployment/Tenant/CAS;
- partial unique active-assignment index;
- monotonic per-job fencing token allocated in the database;
- unique economic idempotency index plus structurally idempotent duplicate handling;
- `BIGSERIAL` ordering for audit/runtime event streams.

`READ COMMITTED` was selected because row locks, CAS predicates and uniqueness constraints establish the required single-winner properties without imposing broad serializable retries. Generic transaction retry is not enabled.

## Composition and configuration

Local historical profile:

```text
JSON / SQLite
single-host authority
```

Shared profile:

```text
ACS_STATE_BACKEND=shared
ACS_SHARED_DATABASE_URL=postgresql://acs_user:<redacted>@db.example/acs
ACS_SHARED_DATABASE_POOL_SIZE=10
ACS_SHARED_DATABASE_CONNECTION_TIMEOUT_MS=5000
ACS_SHARED_DATABASE_STATEMENT_TIMEOUT_MS=10000
ACS_SHARED_DATABASE_TLS=true
```

The shared composition has `localAuthorityFallback: false`. Missing backend/URL, unreachable DB, read-only state or schema mismatch blocks startup/readiness. It never falls back to JSON/SQLite.

## Health and operational integration

Health reports only non-sensitive fields:

```text
configured
reachable
writable
schemaCurrent
schemaVersion
latencyMs
lastErrorAt
reasonCode
```

Reason codes:

- `SHARED_STATE_UNAVAILABLE`;
- `SHARED_STATE_SCHEMA_MISMATCH`;
- `SHARED_STATE_READ_ONLY`.

These codes integrate with the existing operational diagnostics dependency registry. The G evaluator gains an optional `SHARED_MULTI_INSTANCE` topology check and blocks unless shared authority is reachable, writable and schema-compatible. The existing `PRODUCTION_LIKE_SINGLE_HOST` decision is unchanged.

## Data migration/cutover

The certification used an isolated empty shared database, so no product dataset was imported and no local file was deleted. Result: `NOT_REQUIRED_FOR_ISOLATED_ACCEPTANCE`.

The safe cutover boundary is explicit: validate local source, stop writers, transform preserving IDs/revisions/timestamps, verify row counts/history/idempotency, select the shared profile, and retain local files for rollback/manual verification. Automatic destructive migration is intentionally absent. A real environment cutover requires a source-specific import plan; mixed local/shared authority is prohibited.

## Adapter results

| State | Shared adapter result |
| --- | --- |
| Tenant/admin/governance/audit | `PASS` |
| Agent | `PASS` |
| deployment/rollback | `PASS` |
| secret metadata | `PASS`; no material stored |
| economics/settlement | `PASS`; duplicate commit stable |
| runtime/jobs/workers/leases | `PASS`; DB-authoritative fencing |
| rate limiting | `PASS` for shared PostgreSQL bucket in SH topology |

## Gate

SH02 is `PASS`: schema, adapters, network pool, DB-backed constraints, fail-closed composition and restart/reconnect behavior are implemented. Physical database HA is not claimed.
