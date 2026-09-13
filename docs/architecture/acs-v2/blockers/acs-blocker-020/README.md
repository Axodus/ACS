# ACS-BLOCKER-020

## STATUS

COMPLETE / ACCEPTED

## TITLE

Canonical Agent Inventory Alignment for Workforce Creation

## AFFECTED MILESTONE

ACS-V2-VAL-03 — Workforce End-to-End Acceptance & Contract Closure

## AUTHORIZATION

CTO remediation decision dated 2026-09-12 authorized correction of `VAL-03-DEFECT-003`.

The defect was an Application/Product API authority mismatch: `GET /api/v1/agents` read the legacy Agent service while `POST /api/v1/workforces` validated membership through Native Core lineage.

The authorized boundary preserves the Agent Select UX and keeps Workforce validation canonical. It does not authorize opaque Agent ID fallback, frontend reconciliation, synthetic Agents, weakened Workforce validation, or Agent identity changes.

## IMPLEMENTATION

The Native Core repository now exposes a tenant-filtered canonical Agent definition inventory. When Product API is connected to Native Core, `GET /api/v1/agents` projects that inventory into the existing `AgentListItem` response shape. The Application remains Product API-backed and sends the selected canonical Agent ID unchanged to `POST /api/v1/workforces`.

Clients that construct `ProductApiClient` without Native Core retain the existing legacy service behavior for compatibility with the pre-Native-Core Agent surface.

No migration was added. Workforce creation validation remains `nativeCore.getAgentLineage`, and tenant filtering is applied to canonical Agent discovery.

## REGRESSION AUDIT — 2026-09-13

The original 10 failing test files were reproduced individually inside the restricted sandbox. Each failure occurred at `Server.listen` with `EPERM` before the asserted Product API, Agent, Workforce, rate-limit, telemetry, worker, or production-target behavior executed. A loopback probe and the same suites outside the sandbox passed.

| Test | Expected | Actual in restricted sandbox | Causal relation to BLOCKER-020 | Classification | Remediation and result |
| --- | --- | --- | --- | --- | --- |
| `acs-v2-imp-03e.test.mjs` | Canonical HTTP host composes Native Core read boundary. | Loopback bind returned `EPERM`. | None; no Agent inventory route was reached. | B | Run outside sandbox: PASS. |
| `s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs` | HTTP rate-limit, CORS and body-limit contracts. | Five listener cases returned `EPERM`. | None; Agent inventory is not in the exercised paths. | B | Run outside sandbox: 9 passed, 0 failed. |
| `s50-epic-15-5-remote-worker-dispatch.test.mjs` | Remote worker dispatch over the HTTP host. | Loopback bind returned `EPERM`. | None; no Agent discovery call occurred. | B | Run outside sandbox: 3 passed, 0 failed. |
| `s51-epic-15-5-distributed-runtime-acceptance.test.mjs` | Multi-process runtime acceptance. | First listener bind returned `EPERM`. | None; no Product API Agent route occurred. | B | Run outside sandbox: PASS. |
| `s52-epic-15-5-structured-telemetry.test.mjs` | OTLP HTTP export and redaction. | Test receiver bind returned `EPERM`. | None; telemetry-only coverage. | B | Run outside sandbox: 4 passed, 0 failed. |
| `s54-epic-15-5-observability-incident-acceptance.test.mjs` | External telemetry and diagnostics across processes. | First listener bind returned `EPERM`. | None; observability-only coverage. | B | Run outside sandbox: PASS. |
| `s55-epic-15-5-operational-ux-contract.test.mjs` | Credential lifecycle and durable job cancellation. | Host bind returned `EPERM`. | None; no Agent inventory assertion. | B | Run outside sandbox: PASS. |
| `s56-epic-15-5-production-deployment-gate.test.mjs` | Production readiness and rollback gate. | Two listener cases returned `EPERM`. | None; deployment-only coverage. | B | Run outside sandbox: 3 passed, 0 failed. |
| `s57-epic-15-5-production-target-process-acceptance.test.mjs` | Independent production-target process. | Child target exited after loopback bind `EPERM`. | None; no Product API Agent route occurred. | B | Run outside sandbox: PASS. |
| `s77-security-telemetry-receiver-auth.test.mjs` | Loopback and external telemetry receiver authentication. | Loopback and external binds returned `EPERM`. | None; receiver-only coverage. | B | Run outside sandbox: 3 passed, 0 failed. |

No failure was class C, D, E, or F. The restricted sandbox result is unsuitable for the repository's loopback and independent-process acceptance tests; the host-capable execution result is the relevant regression evidence.

## AGENT DOMAIN COMPATIBILITY AUDIT

- Native Agent creation through `advanceAgentLineage` remains the canonical creation and lineage path used by VAL-03.
- Product API discovery, detail, revision history, and lifecycle reads now select Native Core when it is present, preserve the tenant boundary, and retain the canonical Agent ID and current revision across all four reads.
- Native Agent read projection is intentionally read-only. It does not synthesize composition, credentials, model strategy, lifecycle metadata, or writable actions that Native Core has not exposed through this Product API slice.
- Existing legacy Product API Agent CRUD tests continue to run through Product API clients without Native Core. This compatibility fallback is not used by the canonical shared-host Workforce flow.
- The VAL-03 browser contract had two A-class stale accessible-name expectations after the accepted form UX changed: `Responsibilities (comma separated)` became `Responsibilities`, and the submit button's accessible name is `Create draft r1`. The test now targets the current accessible contract; no product behavior changed.

## VALIDATION EVIDENCE

- TypeScript build: PASS.
- `tests/s20-http-integration.test.mjs`: PASS, 1 passed, 0 failed, 0 skipped.
- `tests/acs-v2-val-03-postgres.test.mjs`: PASS, 1 passed, 0 failed, 0 skipped. The scenario creates Native Core Agents in PostgreSQL; reads the same Agent through Product API list, detail, revisions, and lifecycle; verifies that a foreign-tenant Agent is neither listed nor readable; selects the tenant-scoped Agent in the Application; and creates a Workforce accepted by `getAgentLineage`.
- `git diff --check`: PASS.
- Restricted-sandbox `npm test`: 119 passed, 10 failed, 0 skipped. All 10 failures are class B environment failures documented above.
- Host-capable `npm test` without PostgreSQL configuration: 718 passed, 0 failed, 14 PostgreSQL-gated skips.
- Host-capable `npm test` with the repository's local PostgreSQL configuration: final PASS, 732 passed, 0 failed, 0 skipped in 125956.569435 ms. It includes the corrected VAL-03 browser scenario, cross-tenant inventory isolation, and all PostgreSQL-gated tests.
- No lint script is defined in `package.json`; `npm run build` is the repository typecheck/build gate.

## ACCEPTANCE STATE

The canonical Native Core Agent is discoverable through Product API list, detail, revision, and lifecycle reads; selectable in the Workforce Application; and accepted by `POST /api/v1/workforces` through the unchanged `getAgentLineage` validation. Tenant filtering, canonical identity, and reload/history preservation are covered by the real PostgreSQL VAL-03 scenario. With the full repository gate at 732 passed, 0 failed, and 0 skipped, `ACS-BLOCKER-020` is complete and accepted. `VAL-03-DEFECT-003` is functionally and regression-gate resolved; Workforce v1 formal closure remains a separate decision record.
