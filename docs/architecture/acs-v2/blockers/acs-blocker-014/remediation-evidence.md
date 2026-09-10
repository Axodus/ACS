# ACS-BLOCKER-014 Remediation Evidence

**Date:** 2026-09-10

## Initial reproduction

| Test | Initial result | Classification |
| --- | --- | --- |
| s27 | `405`, expected `200`, at the execution-run usage assertion. | REPRODUCED |
| s54 | `429 rate_limit_exceeded`, expected `200`; the restricted sandbox also rejected loopback binding with `EPERM`. | REPRODUCED; ENVIRONMENT-DEPENDENT for loopback execution |
| s57 | missing `/opt/Axodus/dist/engines/production-target-server.js`; the test then timed out waiting for its child fixture. | REPRODUCED |
| s62 | `createControlPlaneContext` was not exported from `dist/index.js`. | REPRODUCED |
| s63 | usage evidence returned no `reservationId`, expected `res_usage_1`. | REPRODUCED |

## Focused before/after evidence

- `npm run build`: PASS before and after source changes.
- `node tests/s27-operational-evidence.test.mjs`: BEFORE `405 !== 200`; AFTER `1 pass, 0 fail`.
- `node tests/s54-epic-15-5-observability-incident-acceptance.test.mjs`: BEFORE `429 !== 200` outside the restricted loopback sandbox; AFTER `1 pass, 0 fail` in `70.154s`.
- `node tests/s57-epic-15-5-production-target-process-acceptance.test.mjs`: BEFORE missing module from the working-directory-relative dist path; AFTER `1 pass, 0 fail`.
- `node tests/s62-epic-16-2-economic-authorization-reservations.test.mjs`: BEFORE missing public export; AFTER `2 pass, 0 fail`.
- `node tests/s63-epic-16-3-usage-settlement.test.mjs`: BEFORE missing reservation correlation; AFTER `1 pass, 0 fail`.
- `node tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs`: AFTER `9 pass, 0 fail`, including 429, retry, CORS, fail-closed, and principal/tenant isolation coverage.

## Native Core / PostgreSQL boundary

No Native Core persistence source, migration, PostgreSQL adapter, durable usage/cost writer, idempotency implementation, or fencing implementation changed. The s63 change is limited to the operational-evidence read projection. No PostgreSQL revalidation was required by the touched paths.

## Full suite

Pending the isolated suite command recorded after this document was created.

### Final isolated suite result

```text
ACS_RUNTIME_DATABASE_PATH=<temporary>/runtime.sqlite npm run test
692 total
688 passed
0 failed
4 skipped
```

The four skips are the PostgreSQL acceptance tests that explicitly report `ACS_SH_DATABASE_URL is not configured`. They were not converted to passes or hidden.

### Final integrated target run

```text
node --test \
  tests/s27-operational-evidence.test.mjs \
  tests/s54-epic-15-5-observability-incident-acceptance.test.mjs \
  tests/s57-epic-15-5-production-target-process-acceptance.test.mjs \
  tests/s62-epic-16-2-economic-authorization-reservations.test.mjs \
  tests/s63-epic-16-3-usage-settlement.test.mjs
```

Result: `6 passed; 0 failed; 0 skipped`. The six subtests include the two s62 acceptance cases.

## PostgreSQL revalidation

A disposable ACS-only `postgres:17` container was published on a loopback-only ephemeral port and removed after validation. The synthetic `public` schema was dropped and recreated between commands.

```text
ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/acs-v2-imp-01b.test.mjs
# 3 passed, 0 failed

ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/s59-post-15-5-aees-sh-shared-state.test.mjs
# 3 passed, 0 failed

ACS_SH_DATABASE_URL=<redacted> ACS_TEST_DIST_ROOT=../dist node --test tests/acs-v2-val-01-postgres.test.mjs
# 1 passed, 0 failed
```

No migration was added or applied beyond the test-owned additive schema setup.
