# ACS-BLOCKER-014 — Core Regression Remediation

**Status:** `RESOLUTION CANDIDATE`  
**Date:** 2026-09-10  
**Scope:** five isolated repository regressions only

## Original baseline

The reliable isolated baseline was `691 total; 682 passed; 5 failed; 4 skipped`.
The failures were `s27`, `s54`, `s57`, `s62`, and `s63`.

## Root-cause matrix

| Test | Root cause | Classification | Remediation |
| --- | --- | --- | --- |
| s27 | The general execution-run unsupported-operation branch ran before the defined read-only execution-run usage route. | IMPLEMENTATION DEFECT | Apply the unsupported-operation result only to non-GET execution-run requests. |
| s54 | The network limiter used the public-health cap for every non-worker route, although the documented authenticated-read network budget is higher. | IMPLEMENTATION DEFECT | Use the route policy at the network layer while retaining the public network floor and the existing per-principal limiter. |
| s57 | The test fallback `../dist` resolved from the current working directory and pointed outside the ACS build output. | TEST ISOLATION DEFECT | Resolve the default dist directory relative to the test module. |
| s62 | The canonical factory existed but was absent from the public barrel. The test also used superseded economic and direct-routing APIs. | EXPORT / INTEGRATION DEFECT; STALE TEST EXPECTATION | Export the canonical factory and update the test fixture to the current durable economic and route contracts. |
| s63 | The evidence projection found reservations only by `executionRunId`, losing the established settlement-to-reservation-to-quote linkage when the reservation did not carry that optional field. | IMPLEMENTATION DEFECT | Resolve the reservation through the settlement when needed, then derive quote and pricing provenance. |

## Architectural and security impact

No architecture change, migration, dependency, provider authority, pricing rule, settlement policy, or ownership model changed. The rate limiter remains fail-closed and retains both network and authenticated-principal controls. The usage fix only restores existing correlation in the read model; it does not create usage or cost records.

## Test corrections

`s57` now resolves its compiled fixture relative to its own file. `s62` was updated because its old constructor names, route invocation order, request shape, and mock engine omitted requirements of the established contracts. The revised test preserves durable idempotency, Product API authorization/reservation behavior, and unavailable-quote coverage.

## Disposition

Closure remains contingent on the isolated full-suite result in `remediation-evidence.md`.

The final isolated suite and PostgreSQL revalidation passed. Recommendation: `ACS-BLOCKER-014 → RESOLVED`, subject to CTO acceptance of this evidence.
