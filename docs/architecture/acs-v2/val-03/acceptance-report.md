# VAL-03 acceptance report

## STATUS

`INDEPENDENT TRANSVERSAL GATE`

## DOCUMENTATION DISPOSITION

`RECONCILED — 2026-09-12`

## Executive validation summary

The canonical Workforce chain passed through Product API, runtime, persistence,
historical bindings, recovery, and host recomposition. The Application creation
path now uses the canonical tenant-scoped Agent inventory accepted by
`ACS-BLOCKER-020`, so the former selector mismatch is no longer an active VAL-03
failure.

`ACS-BLOCKER-019` repaired the two implementation regressions found by the first
VAL-03 pass. The archived-lifecycle discrepancy was an A-class test expectation:
the accepted Product API contract returns HTTP 400 with
`ACS_NATIVE_WORKFORCE_REFERENCE_INVALID`, not HTTP 422. No lifecycle production
behavior changed.

`ACS-BLOCKER-020` then resolved the canonical Agent inventory mismatch. The
Application can discover the Native Core Agent required by Workforce creation,
and `ACS-V2-IMP-03F-FIX-03` was accepted after the resulting integrated
validation. The former `VAL-03-DEFECT-003` classification is therefore closed
as a resolved blocker finding, not an open Application defect.

## PostgreSQL acceptance

Container `acs-imp03a-pg` ran PostgreSQL 17.6 and published `127.0.0.1:55433 → 5432/tcp` for database `acs_imp_03a`. Each VAL-03 run created and removed a `val03_<timestamp>_<pid>` schema. Credentials are omitted. No migration was added.

## Latest accepted evidence

The latest accepted evidence is recorded by `ACS-BLOCKER-020` and
`ACS-V2-IMP-03F-FIX-03`:

```text
full repository:       732 passed, 0 failed, 0 skipped
Product API build:     PASS
IMP-03F application:    13 tests passed, 0 failed, 0 skipped
browser matrix:        88 checks, 0 failures
git diff --check:       PASS
```

These results establish the current accepted Workforce application state. They
are cross-referenced here; this file remains the independent VAL-03 gate record
and does not change its closure authority.

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

## Historical pre-remediation validation

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

## Resolved application finding

`VAL-03-DEFECT-003` was a D-class implementation regression in the earlier
Application/Product API composition. `ACS-BLOCKER-020` corrected the read boundary
so canonical Native Core Agents are discoverable through the existing Product API
shape, while Workforce creation continues to validate through Native Core.

The finding is resolved and accepted. No alternate frontend authority, synthetic
Agent, direct database access, or weakened Workforce validation was introduced.

## Accepted application validation

```text
typecheck:       PASS
tests:           13 pass, 0 fail, 0 skip
lint:            0 errors, 10 existing Fast Refresh warnings
build:           PASS
static browser:  88 checks, 0 failures; expected Product API caveats in preview
integrated UI:   accepted after canonical Agent inventory remediation
```

## Host / container cleanup

The test closed both temporary HTTP hosts, terminated both temporary Vite processes, closed Chromium, and dropped its isolated schema in `finally`. It did not stop the user's persistent `acs-imp03a-pg` container or local development process.

## Contract closure boundary

This report reconciles the resolved blocker evidence and keeps VAL-03 as an
independent transversal gate. Formal closure of VAL-03 and the Workforce v1
contract requires an explicit final closure decision based on the complete
transversal acceptance record; it is not inferred solely from this documentation
reconciliation.
