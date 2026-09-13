# EPIC-17-IMP-03A — Slice 1 Regression Causality Review

**Status:** `PARTIAL / IN PROGRESS — AWAITING CTO REVIEW`  
**Baseline:** local Slice 1 workspace, schema version 8  
**Decision rule:** a failure is `A` only if it reaches Slice 1 Connection/Channel
contracts, schema v8 migration, Integration repository, or its shared-state
composition.

## Result

| Class | Count | Disposition |
| --- | ---: | --- |
| A — caused by Slice 1 | 0 | No corrective change required. |
| B — independent real regression | 3 | Preserve as independent defects; do not repair in IMP-03A Slice 1. |
| C — environment/harness | 34 | Re-run in the declared local/listener-capable harness. |
| D — indeterminate | 0 | None. |

The original unqualified `npm run check` result was 95 pass / 37 fail. The
same suite with `ACS_ENVIRONMENT=local` was 120 pass / 12 fail. PostgreSQL
acceptance remained 14/14 with schema version 8.

## C — default topology configuration (25)

The affected tests called `createControlPlaneContext()` without a local
environment. With `ACS_ENVIRONMENT` unset, topology resolves to
`development → dispatchMode=remote`, which opens the default runtime SQLite
database before the test's Product API or domain boundary. Re-running with
`ACS_ENVIRONMENT=local` passed every entry below. No Integration code path was
reached.

| Test / surface | First failing boundary and error | Required remediation |
| --- | --- | --- |
| `acs-v2-imp-03e2` | Control Plane startup; `RuntimePersistenceError(open runtime database)` | Set local topology in the test harness. |
| `acs-v2-imp-03f-fix-02` | Control Plane startup; same error | Set local topology in the test harness. |
| `http-auth-rate-limit` | HTTP helper startup; same error | Set local topology in the test harness. |
| `http` | HTTP helper startup; same error | Set local topology in the test harness. |
| `imp-02d-agent-operational-scope` | Control Plane startup; same error | Set local topology in the test harness. |
| `imp-02d1-agent-operational-query-compatibility` | Control Plane startup; same error | Set local topology in the test harness. |
| `s20-http-integration` | Control Plane startup; same error | Set local topology in the test harness. |
| `s25-composition` | Control Plane startup; same error | Set local topology in the test harness. |
| `s27-operational-evidence` | Control Plane startup; same error | Set local topology in the test harness. |
| `s28-control-plane-hardening` | Control Plane startup; same error | Set local topology in the test harness. |
| `s29-production-readiness` | Control Plane startup; same error | Set local topology in the test harness. |
| `s30-governance-boundary` | Control Plane startup; same error | Set local topology in the test harness. |
| `s32-operational-reliability` | Control Plane startup; same error | Set local topology in the test harness. |
| `s33-observability-correlation` | Control Plane startup; same error | Set local topology in the test harness. |
| `s34-epic-15-governance-enforcement-boundaries` | Control Plane startup; same error | Set local topology in the test harness. |
| `s36-billing-boundary-financial-truth` | Control Plane startup; same error | Set local topology in the test harness. |
| `s37-pricing-quote-invoice-boundary` | Control Plane startup; same error | Set local topology in the test harness. |
| `s38-payment-rails-boundary` | Control Plane startup; same error | Set local topology in the test harness. |
| `s39-tenant-billing-boundary` | Control Plane startup; same error | Set local topology in the test harness. |
| `s40-receipts-settlement-reconciliation` | Control Plane startup; same error | Set local topology in the test harness. |
| `s41-financial-audit-compliance-risk` | Control Plane startup; same error | Set local topology in the test harness. |
| `s43-epic-13-final-hardening` | Control Plane startup; same error | Set local topology in the test harness. |
| `s44-epic-15-tenant-administration-product-api` | Scenario startup; same error | Set local topology in the test harness. |
| `s45-epic-15-5-durable-http-contract` | Control Plane startup; same error | Set local topology in the test harness. |
| `s62-epic-16-2-economic-authorization-reservations` | Control Plane startup; same error | Set local topology in the test harness. |

## C — restricted listener boundary (9)

Each entry below passed all setup before attempting `server.listen()` and then
failed with `EPERM` on `127.0.0.1` or `0.0.0.0`. No request handler, Product
API route, or Integration path was reached after that boundary.

| Test / surface | First failing boundary and error | Required remediation |
| --- | --- | --- |
| `acs-v2-imp-03e` | canonical HTTP host; `listen EPERM 127.0.0.1` | Run listener assertion in listener-capable environment. |
| `s48-epic-15-5-distributed-rate-limiting-http-edge` | HTTP edge listener; `listen EPERM 127.0.0.1` | Same. |
| `s51-epic-15-5-distributed-runtime-acceptance` | distributed runtime listener; same error | Same. |
| `s52-epic-15-5-structured-telemetry` | OTLP receiver listener; same error | Same. |
| `s54-epic-15-5-observability-incident-acceptance` | external telemetry listener; same error | Same. |
| `s55-epic-15-5-operational-ux-contract` | operational HTTP listener; same error | Same. |
| `s56-epic-15-5-production-deployment-gate` | production target listener; same error | Same. |
| `s57-epic-15-5-production-target-process-acceptance` | child target process listener; same error | Same. |
| `s77-security-telemetry-receiver-auth` | telemetry receiver listener; `listen EPERM` on loopback/external bind | Same. |

## Known independent regression debt — B (3)

These tests supply their own temporary durable paths and expect a typed
configuration rejection. Instead, the untouched legacy Control Plane startup
opens `SqliteAgentRepository` first and receives `ERR_SQLITE_ERROR: unable to
open database file`. The failure is in `control-plane-context`/durable Agent
startup, which Slice 1 did not modify; Connection, Channel, native-core
Integration exports, schema v8 and shared PostgreSQL composition are not
reached.

| Test / surface | First failing boundary and error | Required remediation |
| --- | --- | --- |
| `s46-epic-15-5-production-secrets-economic-adapters` | durable Agent SQLite startup; `ERR_SQLITE_ERROR` | Independently fix production-profile initialization ordering or fixture paths. |
| `s47-epic-15-5-trusted-http-identity` | durable Agent SQLite startup masks expected `HttpIdentityConfigurationError` | Same; restore typed identity failure precedence. |
| `s50-epic-15-5-remote-worker-dispatch` | durable Agent SQLite startup masks expected `WorkerIdentityConfigurationError` | Same; restore typed worker-configuration failure precedence. |

These three entries are tracked as non-blocking cross-cutting baseline debt.
They are outside IMP-03A Slice 2 unless they later block canonical acceptance
or a production surface.

## Slice 1 causal evidence

- The Slice 1 diff touches only Integration contracts, shared PostgreSQL
  migration/repository composition and EPIC-17 documentation.
- No failed test imported or invoked `integration.ts`,
  `advanceIntegrationConnectionLineage`,
  `advanceIntegrationChannelLineage`, or the v8 migration path before its first
  failure.
- `ACS_ENVIRONMENT=local npm run check` passed the 25 configuration-bound
  failures without changing code.
- `npm run acceptance:postgres` passed with schema version 8 and 14/14 tests.

## Acceptance conclusion

`A = 0` and `D = 0`. Slice 1 remains `IMPLEMENTATION COMPLETE / VALIDATION
PARTIAL` until CTO accepts this causal classification and the listener-capable
regression evidence is recorded.
