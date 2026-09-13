# ACS-BLOCKER-021 — PostgreSQL Acceptance Environment Reliability

## STATUS

`RESOLVED / READY FOR CTO ACCEPTANCE`.

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

## Validation run 1

- PostgreSQL: `17.6` (`postgres:17.6-alpine`)
- Docker server: `29.1.3`
- Readiness: authenticated query passed; database `acs_acceptance` selected
- Writable: disposable TEMP-table create/insert/select passed
- Migrations: schema version `7`
- Tests: `14 passed, 0 failed, 0 cancelled, 0 skipped`
- Lifecycle: ephemeral container removed deterministically

## Validation run 2

- PostgreSQL: `17.6` (`postgres:17.6-alpine`)
- Docker server: `29.1.3`
- Readiness: authenticated query passed; database `acs_acceptance` selected
- Writable: disposable TEMP-table create/insert/select passed
- Migrations: schema version `7`
- Tests: `14 passed, 0 failed, 0 cancelled, 0 skipped`
- Lifecycle: second clean container and ephemeral port; prior run state was not reused

## Regression and security

- `npm run build`: passed
- IMP-01 focused regression: `2 passed, 0 failed, 0 skipped`
- `node --check scripts/acs-postgres-acceptance.mjs`: passed
- `git diff --check`: passed
- Generated credentials are process-local and never logged; connection output is redacted to host, port and database path.
- No production database, application schema, repository boundary, transaction semantics, events/outbox behavior, idempotency, leases or fencing contract was changed.

## Acceptance criteria state

| Criterion | State |
| --- | --- |
| AC-01–AC-11 | PASS |
| AC-12–AC-14 | PASS: two consecutive clean executions |
| AC-15–AC-16 | Implemented and documented |
| AC-17 | PASS: manual endpoint ownership and presence-only gating caused recurrence |
| AC-18 | PASS: focused diff and regression review |

## Blockers remaining

None for ACS-BLOCKER-021. The default execution context still cannot access
the host Docker socket; the canonical command therefore requires a host-capable
Docker context or equivalent CI runner. That is an execution prerequisite,
not a manual PostgreSQL recovery step and not evidence of an IMP-01 defect.

## CTO decision

Accept ACS-BLOCKER-021 as resolved and resume durable PostgreSQL acceptance for
EPIC-17-IMP-01. The pending IMP-01 suite should be run through this canonical
entry point before CTO acceptance of IMP-01.
