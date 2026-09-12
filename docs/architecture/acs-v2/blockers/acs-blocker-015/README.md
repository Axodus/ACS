# ACS-BLOCKER-015 — Repository Regression & Test Isolation Remediation

**Date:** September 11, 2026  
**Status:** RESOLVED  
**Scope:** ACS v2 regression remediation after IMP-03A

## Original failure set

The reported repository baseline was **701 tests, 696 passed, 5 failed, 0
skipped**. The five failures were one VAL-01 PostgreSQL failure caused by a
pending outbox row from an earlier execution and four S09/S43 standalone
billing fixture failures.

The first local sandbox run also exposed eight socket permission failures in
S48/S50/S51/S52/S54/S55/S56/S57. An escalated rerun passed all 23 affected
tests. Those were environment failures, not repository regressions.

## Causality analysis

| Test | Failure and evidence | Classification | IMP-03A causality | Remediation |
| --- | --- | --- | --- | --- |
| VAL-01 | `claimNextOutbox` selects the oldest recoverable row globally within the active PostgreSQL schema. VAL-01 connected directly to the shared schema, so an earlier legitimate pending row could be claimed. Existing VAL-01 documentation also recorded grouped runs without reset as invalid for this reason. | Shared-state test contamination caused by incomplete test ownership/isolation. | **Not caused by IMP-03A.** Workforce uses isolated schemas in its own acceptance harness and its 7-test PostgreSQL suite stayed green. | VAL-01 now creates a unique schema, connects both test clients through `search_path`, and drops only that owned schema in teardown. Production outbox semantics are unchanged. |
| S09 fixture 1 | Billing acceptance content moved out of `App.tsx` during standalone application reorganization and is now rendered by `domains/economics/Economics.tsx`. | Stale structural expectation. | **Not caused by IMP-03A.** | Assert the route in `App.tsx` and billing content in `Economics.tsx`. |
| S09 fixture 2 | No-claim and financial state text is owned by `Economics.tsx`, not the application shell. | Stale structural expectation. | **Not caused by IMP-03A.** | Move the source assertion to `Economics.tsx` while retaining all semantic claims. |
| S43 fixture 1 | The final-hardening test searched `App.tsx` for `No financial actions`, although the accepted economics surface owns that content. | Stale source expectation. | **Not caused by IMP-03A.** | Assert the content in `Economics.tsx`. |
| S43 fixture 2 | The same stale fixture shape treated the shell as the billing content owner after commit `17a22c4`. | Stale source expectation. | **Not caused by IMP-03A.** | Preserve the route assertion in `App.tsx` and check the economics module for billing behavior text. |

No failure required a Workforce production change, outbox semantic change,
Usage/Cost change, retry, skipped test, assertion removal, or broad database
cleanup.

## Remediation

### VAL-01

`tests/acs-v2-val-01-postgres.test.mjs` now:

- creates a unique `val01_<timestamp>_<pid>` schema through an admin pool;
- adds `options=-c search_path=<owned-schema>` to both PostgreSQL clients;
- runs the complete durable acceptance flow inside that schema; and
- drops only the owned schema after both clients close.

The test still exercises restart, lineage, CAS, idempotency, event/outbox,
runtime fencing, accounting, and transaction failure behavior through two
clients. The canonical `claimNextOutbox` implementation was not changed.

### S09/S43

The fixture changes preserve the accepted application boundary: `App.tsx`
continues to own the billing route, while `Economics.tsx` owns the billing
acceptance content and no-action claims. No billing behavior or economic
contract was changed.

## Files changed by this blocker

- `tests/acs-v2-val-01-postgres.test.mjs`
- `tests/s42-billing-ux-operator-acceptance.test.mjs`
- `tests/s43-epic-13-final-hardening.test.mjs`
- `docs/architecture/acs-v2/blockers/acs-blocker-015/README.md`

The working tree also contains the previously authorized IMP-03A source,
tests, and documentation changes. Those were preserved and are not attributed
to this blocker.

## Validation evidence

Focused test results:

- S42: **4 passed, 0 failed, 0 skipped**.
- S43: **20 passed, 0 failed, 0 skipped**.
- VAL-01 clean PostgreSQL run: **1 passed, 0 failed, 0 skipped**.
- VAL-01 repeated PostgreSQL run without manual database cleanup: **1 passed,
  0 failed, 0 skipped**.
- IMP-03A focused suite: **7 passed, 0 failed, 0 skipped**.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Isolation proof used a separate schema containing a legitimate pending outbox
row. VAL-01 passed while that row remained `pending`, proving that the test
claims only its own schema state.

The final canonical command was:

```text
ACS_SH_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/acs_imp_03a \
ACS_TEST_DIST_ROOT=/opt/Axodus/ACS/dist npm test
```

Final repository result: **701 tests, 701 passed, 0 failed, 0 skipped**.

## Impact and decisions

- IMP-03A Workforce identity, immutable revision lineage, current/head
  semantics, CAS, governed-role history, lifecycle, PostgreSQL durability,
  idempotency, event/outbox atomicity, typed errors, and failure-injection
  guarantees remain unchanged and green.
- No Usage, Cost, accounting, Product API, navigation, Dashboard, or Workforce
  UI contract was changed.
- No CTO or CEO decision is required for this remediation.

## Recommendation

**IMP-03A can be closed**, subject to the separately required formal closure
record. ACS-V2-IMP-03B was not started by this blocker.
