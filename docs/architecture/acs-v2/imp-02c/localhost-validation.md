# IMP-02C Localhost Validation

**Status:** PASS
**Date:** 2026-09-11

## Local environment

- Product API: http://127.0.0.1:8788/api/v1
- Standalone frontend: http://127.0.0.1:3001
- Product API start: npm run http
- Frontend start: pnpm dev:local
- Persistence mode: local durable SQLite; no PostgreSQL configuration.

## Browser and Product API evidence

Disposable Agent: imp02c-api-20260911

| Step | Result | Evidence |
| --- | --- | --- |
| Create | PASS | Existing POST /agents created IMP-02C API Validation Agent at r1. |
| Save valid configuration | PASS | Existing PATCH with expectedRevision 1 saved name IMP-02C API Validation Agent r2. |
| Canonical re-fetch | PASS | Independent GET returned name ending r2, current revision 2, readiness ready, lifecycle draft. |
| Direct Overview | PASS | /agents/imp02c-api-20260911 rendered identity, draft lifecycle, CURRENT r2, READY, and Edit configuration. |
| Overview reload | PASS | Actual browser reload retained the direct URL, Agent context, canonical r2, and READY after Product API fetch. |
| Direct Configuration | PASS | Configuration route rendered the persisted r2 name, draft state, and ready composition. |
| Direct Revisions | PASS | Revisions route rendered r2 CURRENT and r1 HISTORICAL; r1 states it cannot be edited directly. |
| Revisions reload | PASS | Actual browser reload retained r2 CURRENT, r1 HISTORICAL, and Agent context. |
| Direct Validate | PASS | Validate showed composition READY, readiness READY, 0 blockers, 0 warnings. |
| Direct Advanced | PASS | Advanced showed provider/model as technical context, redacted credential-reference posture, and revision/materialization diagnostics. |
| Browser errors | PASS | No blocking route failure, context loss, or visible runtime error occurred. |

The API mutation plus independent re-fetch established the r1 to r2 durable transition. Browser validation used the persisted r2 state as authorized and did not create an unnecessary extra revision.

## Host regression

Command:

ACS_RUNTIME_DATABASE_PATH=/tmp/acs-imp-02c-runtime.sqlite node --test --test-concurrency=1 tests/*.test.mjs

Result: 692 total, 688 passed, 0 failed, 4 skipped.

The four skips were existing PostgreSQL-gated coverage because ACS_SH_DATABASE_URL was not configured. The restricted sandbox separately reproduces the known loopback/process limitations classified by VAL-02B as environment/harness, not product failures.

No credential values or production Agent data were used. PostgreSQL is not required because this IMP has no backend persistence change.
