# IMP-03A acceptance report

**Date:** September 11, 2026  
**Status:** PARTIAL

## Delivered

- ACS-native Workforce identity with immutable revision lineage.
- Expected-head CAS with stale-write rejection and no direct rewind.
- Pinned Agent revision and unresolved `current_head_at_admission` selectors.
- Exact governed-role revision history and historical reconstruction.
- Frozen v1 lifecycle transitions only.
- PostgreSQL migration 4, repository contracts, idempotency, events, and
  retryable outbox integration.
- Conformance, reload, migration, concurrency, replay, and failure-injection
  coverage.
- Attempt attribution review classified **ADDITIVE COMPATIBLE**.

## Validation record

- `npm run build`: PASS.
- `git diff --check`: PASS.
- Focused IMP-03A PostgreSQL suite: **7 tests, 7 passed, 0 failed, 0 skipped**.
- Clean PostgreSQL `VAL-01` acceptance run: **1 test, 1 passed, 0 failed, 0
  skipped**.
- Full `npm test`: **701 tests, 696 passed, 5 failed, 0 skipped**.

The full-suite failures are classified as follows:

1. The shared-database `VAL-01 PostgreSQL durable acceptance` run observes an
   earlier pending outbox row left by another test. The same acceptance passes
   **1/1** on the clean isolated database `acs_val_01_clean`; this is test
   environment contamination, not a Workforce durability failure.
2. Four unrelated S09/S43 standalone billing fixture assertions fail because
   `.design/app-standalone/src/App.tsx` does not contain the expected billing
   acceptance text/routes/claims. These files are outside the IMP-03A backend
   scope and were not changed to conceal the regression.

Because the repository-wide suite is not fully green, the milestone is
reported as **PARTIAL** despite the focused IMP-03A and clean PostgreSQL
acceptance suites passing.

## Scope gates

No Run admission, WorkforceRunMembershipV2, coordination, runtime
compilation, Product API expansion, UI, provider, Eigent, CAMEL, or Cost
contract implementation was added. Any known frontend fixture failures are
reported as regressions only when reproduced by the final full suite and are
not classified as Workforce failures without evidence.
