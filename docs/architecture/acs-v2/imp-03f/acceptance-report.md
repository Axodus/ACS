# Acceptance Report

## Status

`COMPLETE / ACCEPTED`

## Acceptance matrix

| Criterion | Evidence | Result |
| --- | --- | --- |
| Peer-level Workforce domain and collection navigation | Global sidebar and `/workforces` | PASS |
| Entity-local Overview, Members, Revisions, Runs, Operations | Shared contextual navigation and direct routes | PASS |
| First Workforce creation | `POST /api/v1/workforces`; FIX-02 PostgreSQL acceptance | PASS |
| New immutable revision UX | `/workforces/:workforceId/revisions/new`; expected-head and idempotency Product API request | PASS |
| Lifecycle action UX | Current-status target matrix and `POST /lifecycle` | PASS |
| Workforce-scoped Runs UX | `GET /workforces/:workforceId/runs`; admitted revision links | PASS |
| Historical revision preservation | Direct revision routes and read-only revision surface | PASS |
| Product API remains the authority boundary | Typed client only; no client-side canonical store or direct repository calls | PASS |
| Canonical HTTP/PostgreSQL persistence | IMP-03E2 and FIX-02 acceptance tests | PASS |
| Full repository regression | `npm run check` with canonical PostgreSQL configuration: 731 pass, 0 fail, 0 skipped | PASS |

## Integrated application validation

On September 12, 2026, the standalone application ran through a same-origin Vite proxy to a schema-isolated canonical shared-state HTTP host backed by PostgreSQL. The browser showed:

- a canonical Workforce in the inventory;
- the selected-Workforce tree with Overview, Members, Revisions, Runs, and Operations;
- a revision successor form seeded from canonical `r3`, with expected-head `r3`, member composition, policy references, and a canonical `r4` submit action;
- lifecycle targets valid from the active head: disabled and archived;
- Run A admitted on Workforce `r2` and Run B admitted on Workforce `r3`, each linked to its admitted historical revision.

The host fixture was isolated to a temporary PostgreSQL schema and removed after validation. No provider, CAMEL, Eigent, scheduler, or runtime dependency was introduced.

## Validation

```text
pnpm typecheck && pnpm test && pnpm lint && pnpm build
13 standalone test files passed; lint: 0 errors, 10 pre-existing Fast Refresh warnings
pnpm test:browser: 88 route/viewport checks, 0 failures, static-preview Product API caveats only

set -a; . .env.local; set +a; export ACS_SHARED_DATABASE_URL="$ACS_SH_DATABASE_URL"; npm run check
731 tests passed, 0 failed, 0 cancelled, 0 skipped

git diff --check
PASS
```

This decision accepts only the Workforce application domain and its Product API integration. It does not change broader ACS production-readiness decisions.
