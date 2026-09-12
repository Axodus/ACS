# Acceptance report

## Decision

`COMPLETE`

IMP-03E2 acceptance criteria are implemented and the focused Product API and PostgreSQL tests pass. This decision covers the increment's documented scope and does not change the repository's broader ACS readiness state.

## Acceptance matrix

| Criterion | Evidence | Result |
| --- | --- | --- |
| New immutable Workforce revision | `tests/acs-v2-imp-03e2.test.mjs`; `POST /revisions` | PASS |
| Idempotent revision retry | focused contract test | PASS |
| Stale revision CAS rejection | focused contract test | PASS |
| Canonical lifecycle transition | focused contract and PostgreSQL tests | PASS |
| Historical Run query by Workforce | focused contract and PostgreSQL tests | PASS |
| Tenant and governance boundary | route implementation and existing auth/governance tests | PASS |
| Events and outbox remain Native Core responsibilities | `advanceWorkforceLineage` command path | PASS |
| PostgreSQL persistence and index reuse | `tests/acs-v2-imp-03e2-postgres.test.mjs` | PASS |
| No migration required | schema inspection and existing migration set | PASS |

## Focused validation

```text
npm run build                                      PASS
git diff --check                                   PASS
node tests/acs-v2-imp-03e2.test.mjs                1 passed, 0 failed
node --test tests/acs-v2-imp-03e2-postgres.test.mjs 1 passed, 0 failed, 0 skipped
```

The PostgreSQL command was run with `.env.local` loaded so the test used the configured canonical local database.

## Full repository validation

```text
set -a; . .env.local; set +a; export ACS_SHARED_DATABASE_URL="$ACS_SH_DATABASE_URL"; npm run check
731 tests passed, 0 failed, 0 cancelled, 0 skipped
```

The suite included the IMP-03E2 focused tests and the existing ACS validation matrix.

## Open boundary

The application UI may consume these capabilities, but this increment does not claim that every IMP-03F screen has been completed or that ACS production readiness has been granted.
