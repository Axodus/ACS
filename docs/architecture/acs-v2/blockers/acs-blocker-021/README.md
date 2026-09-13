# ACS-BLOCKER-021 — PostgreSQL Acceptance Environment Reliability

## STATUS

`PARTIAL / BLOCKED` pending host-capable Docker execution.

## Root cause

The repository had no canonical PostgreSQL acceptance owner or lifecycle entry
point. Earlier successful milestones depended on an ignored `.env.local` value
(`ACS_SH_DATABASE_URL`) pointing to a manually managed PostgreSQL 17.6
container at `127.0.0.1:55433`. The container, port and database lifecycle were
external to the repository. When that container disappeared, the configured
endpoint became unreachable; when the variable was absent, PostgreSQL tests
were skipped solely because configuration was absent.

The current code also classified connection, authentication, database,
permission and migration failures through the same `SHARED_STATE_UNAVAILABLE`
health result. This concealed the failing stage and made recovery depend on
manual environment state.

## Evidence

- `.env.local` currently contains `ACS_SH_DATABASE_URL` for `127.0.0.1:55433/acs_imp_03a`.
- No PostgreSQL listener exists on ports `5432`, `5433` or `55433` in the current WSL environment.
- `pg_isready` reports no response on all three ports.
- Docker CLI and Compose are installed, but the Docker daemon socket is not accessible in the current execution context.
- PostgreSQL acceptance tests gate only on the presence of `ACS_SH_DATABASE_URL`; this is a configuration gate, not a readiness gate.
- Historical validation documents record successful PostgreSQL 17.6 runs against the same manually managed endpoint and isolated schemas.

## What changed

`scripts/acs-postgres-acceptance.mjs` is now the canonical acceptance entry
point. It owns an ephemeral PostgreSQL 17.6 container for each run, waits for
authenticated `SELECT 1`, performs a disposable write probe, applies the
existing ACS migrations through `PostgresSharedAuthoritativeState`, runs the
existing PostgreSQL suites with `ACS_SH_DATABASE_URL`, rejects skipped required
tests, emits redacted stage diagnostics, and removes the container in a
`finally` block.

No application schema, repository boundary, transaction semantics,
events/outbox behavior, idempotency, leases or fencing contract was changed.

## Canonical procedure

```text
npm run acceptance:postgres
```

The command builds the current TypeScript sources and then executes the
following flow:

```text
Docker discovery
  -> ephemeral postgres:17.6-alpine container
  -> authenticated query and database selection
  -> disposable TEMP-table write probe
  -> existing ACS migrations to current schema version
  -> PostgreSQL acceptance suites
  -> fail if any required suite is skipped
  -> deterministic container cleanup
```

The default database is `acs_acceptance`, user `postgres`, and an in-process
ephemeral password. Docker assigns an ephemeral host port by default, so a
stale port allocation from another container cannot block a new run. A fixed
port can be requested with `ACS_PG_ACCEPTANCE_PORT`; all values can be changed
with `ACS_PG_ACCEPTANCE_*` variables, and the password is never printed.

## Ownership answers

| Responsibility | Canonical owner |
| --- | --- |
| Start PostgreSQL | `scripts/acs-postgres-acceptance.mjs` through Docker |
| Own lifecycle | The acceptance process and its ephemeral container |
| Wait for readiness | Authenticated `SELECT 1` loop with timeout |
| Validate writable | Disposable TEMP-table create/insert/select |
| Initialize schema | Existing `PostgresSharedAuthoritativeState.migrate()` |
| Run migrations | Existing shared-state migration owner |
| Run acceptance | Existing PostgreSQL test files |
| Shutdown | Acceptance process `finally` cleanup |

## Acceptance criteria state

| Criterion | State |
| --- | --- |
| AC-01–AC-11 | Implemented by the canonical entry point; regression evidence pending |
| AC-12–AC-14 | Pending two host-capable executions |
| AC-15–AC-16 | Implemented and documented |
| AC-17 | Documented with current and historical evidence |
| AC-18 | Pending final diff and regression review |

## Current blocker

The current WSL execution context cannot access the Docker daemon, so the two
required clean acceptance cycles cannot yet be claimed. This is an external
execution dependency, not evidence of an IMP-01 application defect.

## Required completion report

The final report must record both complete runs, PostgreSQL version, readiness,
writable probe, migration version, pass/fail/skip counts, regression result,
security review, criteria AC-01 through AC-18, commit, and any CTO decision
required to enable host-capable Docker execution.
