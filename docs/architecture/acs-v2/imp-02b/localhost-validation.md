# IMP-02B Localhost Validation

**Date recorded:** 2026-09-10
**Environment:** `/opt/Axodus/ACS`, standalone frontend under
`.design/app-standalone`.

## Automated checkpoint

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | `pnpm --dir .design/app-standalone typecheck` exited 0 |
| Lint | PASS | `pnpm --dir .design/app-standalone lint` exited 0 |
| Build | PASS | `pnpm --dir .design/app-standalone build` exited 0; existing stream-externalization and large-chunk warnings only |
| Focused frontend suite | PASS | `pnpm --dir .design/app-standalone test`: 8 passed, 0 failed |
| Relevant Product API integration | PASS | `node --test tests/s20-http-integration.test.mjs` exited 0 |
| Full repository suite | PARTIAL | `npm test`: 106 passed, 8 failed in EPIC-15.5 distributed-runtime, observability, operational UX, and production-gate tests outside this frontend diff |
| `git diff --check` | PASS | No whitespace errors before staging |

## Required local flow

Use disposable local Agent data only:

1. Open `/agents/new` and confirm Identity is the initial visible section.
2. Complete a minimum valid Agent identity and review optional functional and
   technical sections.
3. Create the Agent and confirm navigation to Agent Overview.
4. Open Configuration, modify a valid field, save, and confirm a new revision.
5. Reload the Agent and confirm persisted state/context.
6. Open Validate and confirm existing composition/readiness inspection.
7. Check missing required identity fields, duplicate Agent ID, and stale
   revision conflict where practical.

## Runtime result

The Product API ran at `127.0.0.1:8788` and the standalone frontend ran at
`127.0.0.1:3000`.

- `/agents/new` initially exposed Identity while technical composition and
  Advanced remained collapsed.
- Submitting without an Agent ID displayed `Agent ID is required`.
- A disposable Agent `imp02b-local-20260910` was created with the name
  `IMP-02B Local Validation Agent`, then navigated to Agent Overview.
- Updating its name through Configuration created revision `r2`; the Overview
  rendered the persisted name and revision after navigation.
- `/agents/imp02b-local-20260910/validate` rendered the existing READY
  composition/readiness result.
- Recreating the same Agent preserved the server error
  `agent-definition already registered: imp02b-local-20260910`.
- Two edit views loaded at `r2` were used to exercise stale revision handling:
  one save created `r3`, and the stale view showed the safe reload action
  instead of overwriting the canonical revision.

No blocking navigation or frontend runtime error was observed. No secrets are
recorded in this document. PostgreSQL revalidation was not required because no
backend mutation, persistence, CAS, or idempotency implementation changed.

## Full-suite failures

The following `npm test` failures remain outside the IMP-02B frontend diff and
keep this package at `PARTIAL` pending their separate investigation:

- `s48-epic-15-5-distributed-rate-limiting-http-edge`
- `s50-epic-15-5-remote-worker-dispatch`
- `s51-epic-15-5-distributed-runtime-acceptance`
- `s52-epic-15-5-structured-telemetry`
- `s54-epic-15-5-observability-incident-acceptance`
- `s55-epic-15-5-operational-ux-contract`
- `s56-epic-15-5-production-deployment-gate`
- `s57-epic-15-5-production-target-process-acceptance`
