# Acceptance report

Status: COMPLETE / ACCEPTED, subject to the blocker report at `docs/architecture/acs-v2/blockers/acs-blocker-017/README.md`.

IMP-03D compiles only the accepted current `TaskAssignmentV2`, resolves the exact admitted membership slot and historical Agent revision, and persists an immutable `RuntimeExecutionIntentV2` with its assignment-bound `TaskAttemptV2`. The transaction includes the canonical event, outbox entry, and idempotency result. Existing lease, fencing, checkpoint, evidence, usage, and cost primitives remain in use.

PostgreSQL environment: `.env.local` supplied `ACS_SH_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/acs_imp_03a`, backed by the repository PostgreSQL container. The combined focused acceptance passed in the reachable environment: 25 passed, 0 failed, 0 skipped. IMP-03A: 7 passed, 0 failed, 0 skipped. IMP-03B: 4 passed, 0 failed, 0 skipped. IMP-03C: 5 passed, 0 failed, 0 skipped. IMP-03D: 8 passed, 0 failed, 0 skipped (5 contract and 3 PostgreSQL). VAL-01: 1 passed, 0 failed, 0 skipped. The durable PostgreSQL IMP-03D and VAL-01 subset was repeated with 4 passed, 0 failed, 0 skipped.

Runtime/recovery validation passed with 13 tests, 13 passed, 0 failed, 0 skipped. The eight affected EPIC 15.5 files passed together with 23 tests, 23 passed, 0 failed, 0 skipped, and each file also passed in isolation. The previous eight failures were reproduced in the restricted sandbox as child-process `listen EPERM` errors and passed with local socket access; they were classified as a harness/child-process observability environment defect, with no product regression found.

Full repository validation on September 12, 2026: 718 total, 718 passed, 0 failed, 0 skipped. Build passed and `git diff --check` passed. No separate lint script is defined in `package.json`; typecheck is included in `npm run build`.

Deferred: Product API projections and any scheduler, supervisor, provider, cancellation, reassignment, or Attempt-level Cost policy.
