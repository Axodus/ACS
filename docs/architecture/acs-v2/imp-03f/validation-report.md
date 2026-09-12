# Validation Report

Validation completed on September 12, 2026:

```text
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm test:browser
git diff --check
```

Results:

- `pnpm typecheck` passed.
- `pnpm test` passed: 13 test files, 13 passing, 0 failed, 0 skipped.
- `pnpm lint` passed with 10 existing Fast Refresh warnings in `Agents.tsx` and `shared.tsx`; no errors were reported.
- `pnpm build` passed. Existing chunks above 500 kB remain; no bundle refactor was performed and no pre-change baseline was captured for a defensible bundle-size delta.
- `pnpm test:browser` passed: 84 route/viewport checks. The eight Workforce direct routes were checked across four viewports (32 checks): 8 `PASS`, 24 `PASS_WITH_CAVEAT`, 0 failures, 0 horizontal-overflow failures, and 0 page errors. The caveats are expected Product API connection errors in a standalone preview without a backend; every Workforce route returned HTTP 200.
- `git diff --check` passed.

Repository-wide validation:

```text
npm run check
```

`npm run check` passed with 724 tests total: 713 passing, 0 failures, and 11 skips. Every skip reports that `ACS_SH_DATABASE_URL` is not configured, so PostgreSQL-required acceptance is not claimed.

## ACS-V2-IMP-03F-FIX-01 validation

Validation completed on September 12, 2026:

- `node --test tests/imp-03f-workforce-domain.test.mjs` passed.
- `pnpm typecheck` passed.
- `pnpm build` passed. The existing chunks above 500 kB remain.
- The running application at `http://localhost:3000` was inspected at `/workforces/workforce-browser-check/members`. A direct, artificial ID rendered `All Workforces`, then `Workforce: workforce-browser-check`, followed by Overview, Members, Revisions, Runs, and Operations. `Members` was the only active local link. This verifies route wiring only; it is not acceptance evidence for an actual Workforce selected through the application.
- The configured local API returned HTTP 404 `route not found` for `GET http://127.0.0.1:8788/api/v1/workforces`. The process serving `:8788` had `ACS_SH_DATABASE_URL` unset and no `ACS_STATE_BACKEND` value, so `nativeCore` was unavailable and Workforce routes were not registered. The collection page contains no selectable Workforce, leaving local navigation unverified in the real flow.

## ACS-V2-IMP-03F-FIX-02 validation

Validation completed on September 12, 2026:

- `npm run build` passed.
- `node --test tests/acs-v2-imp-03f-fix-02.test.mjs` passed: 1 test, 1 pass, 0 failed, 0 skipped. The test uses an injected native-core boundary and verifies empty list, canonical `draft r1` creation, event/outbox command values, retry with the same idempotency key, list readback, and direct detail readback.
- `pnpm typecheck && pnpm test && pnpm build` passed for the standalone application: 13 test files, 13 passing, 0 failed, 0 skipped.
- The running app at `http://localhost:3000/workforces/new` was inspected. The collection action opens the Create Workforce form and the create route no longer renders `Workforce: new` entity navigation.
- Earlier local-only repository results are retained above as historical evidence. They were superseded for FIX-02 acceptance by the canonical PostgreSQL run below.

## ACS-V2-IMP-03F-FIX-02 PostgreSQL/E2E acceptance

Validation completed on September 12, 2026 against the canonical PostgreSQL configuration loaded from `.env.local`; the connection value is intentionally not recorded.

- A canonical HTTP host was started with `ACS_STATE_BACKEND=shared` and `ACS_SHARED_DATABASE_URL` sourced from `ACS_SH_DATABASE_URL`.
- `node --test tests/acs-v2-imp-03f-fix-02.test.mjs tests/acs-v2-imp-03f-fix-02-postgres.test.mjs` passed: 2 tests, 2 passing, 0 failed, 0 skipped. The PostgreSQL test creates its own temporary schema, seeds an Agent through `nativeCore`, creates the first Workforce through the real HTTP Product API, retries with the same idempotency key, restarts the shared control-plane context, and verifies collection and direct-detail persistence.
- `npm run check` passed with `ACS_SH_DATABASE_URL` configured: 726 tests, 726 passing, 0 failed, 0 skipped. This includes IMP-03A through IMP-03E PostgreSQL coverage, `VAL-01 PostgreSQL durable acceptance`, the FIX-02 PostgreSQL test, and the full repository suite.
- `git diff --check` passed after the acceptance-record updates.

This proves canonical-host and PostgreSQL acceptance for initial Workforce creation. It does not claim a browser interaction against the pre-existing standalone process on port 3000, which remains configured to use the separate host on port 8788.
