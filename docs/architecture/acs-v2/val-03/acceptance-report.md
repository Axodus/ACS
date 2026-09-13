# VAL-03 acceptance report

## STATUS

`PARTIAL`

## Executive validation summary

The canonical Workforce chain passed through Product API, runtime, persistence, historical bindings, recovery, and host recomposition. The current Application worktree introduces a new creation-form dependency on the legacy `GET /api/v1/agents` inventory. That inventory omits the canonical Native Core Agent accepted by `POST /api/v1/workforces`.

`ACS-BLOCKER-019` repaired the two implementation regressions found by the first VAL-03 pass. The remaining archived-lifecycle discrepancy was an A-class test expectation: the accepted Product API contract returns HTTP 400 with `ACS_NATIVE_WORKFORCE_REFERENCE_INVALID`, not HTTP 422. No lifecycle production behavior changed.

## PostgreSQL acceptance

Container `acs-imp03a-pg` ran PostgreSQL 17.6 and published `127.0.0.1:55433 → 5432/tcp` for database `acs_imp_03a`. Each VAL-03 run created and removed a `val03_<timestamp>_<pid>` schema. Credentials are omitted. No migration was added.

## Prior successful baseline

```text
repository before the current selector change
total:    732
passed:   732
failed:   0
skipped:  0
duration: 117498.785661 ms

focused VAL-03 PostgreSQL / HTTP / integrated browser before the selector change
passed:   1
failed:   0
skipped:  0
duration: 79807.031637 ms
```

## Current worktree validation

```text
full repository
total:    732
passed:   731
failed:   1
skipped:  0
duration: 123830.289342 ms

focused VAL-03
passed:   0
failed:   1
skipped:  0
duration: 22853.688959 ms
```

## Current application defect

`VAL-03-DEFECT-003` is a D-class implementation regression. The form replaces the accepted Agent ID input with a Product API selection, but the selected endpoint is backed by `agentService` rather than `nativeCore`. A canonical Agent created through `advanceAgentLineage` is valid for Workforce creation yet cannot be selected in the Application. This creates a first-Workforce dead end for canonical-only state.

The focused current-worktree test fails deterministically: 0 passed, 1 failed, 0 skipped in 22853.688959 ms. The failure is `GET /api/v1/agents omitted canonical Workforce-eligible Agent agent-b-val-03`.

## Prior application validation

```text
typecheck:       PASS
tests:           13 pass, 0 fail, 0 skip
lint:            0 errors, 10 existing Fast Refresh warnings
build:           PASS
static browser:  88 checks, 0 failures; expected Product API caveats in preview
integrated UI:   prior proof passed; current creation selector is blocked by DEFECT-003
```

## Host / container cleanup

The test closed both temporary HTTP hosts, terminated both temporary Vite processes, closed Chromium, and dropped its isolated schema in `finally`. It did not stop the user's persistent `acs-imp03a-pg` container or local development process.

## Contract closure recommendation

ACS-V2-VAL-03 MUST REMAIN PARTIAL

WORKFORCE CONTRACT CLOSURE IS NOT YET AUTHORIZED
