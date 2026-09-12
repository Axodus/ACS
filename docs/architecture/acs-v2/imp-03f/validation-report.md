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
