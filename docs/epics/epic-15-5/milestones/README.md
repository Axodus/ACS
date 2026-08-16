# EPIC-15.5 Milestones

This index is the normative consumption order for implementation. A milestone may start design work before a dependency closes, but it may not claim readiness or expose a production path until its entry gates pass.

| Milestone | Status | Findings primarily owned | Entry gate | Exit evidence |
| --- | --- | --- | --- | --- |
| A — System-Wide Gap Discovery & Readiness Baseline | **PASS** | all discovery | EPIC-15 closure | verified inventory, baseline, journeys, stories and plan |
| B — Durable Platform State & Production Adapters | **IN PROGRESS — B01/B02 PASS** | 001, 002, 007, 009, 019 plus resolved 008 | A baseline; B1–B3 for remaining production adapters | admin/audit plus secret/economic restart complete; shared state and operational aggregates remain |
| C — Production Identity, Security & Edge Controls | **PASS WITH CAVEATS — C01/C02 PASS** | resolved 003/013; partial 010 | C1/C2 application decisions closed | trusted identity and hardened edge complete; live topology acceptance remains |
| D — Distributed Runtime & Execution Readiness | PLANNED | 004, 005, 017 | B state + C identity + D1 | remote dispatch, durable jobs, crash/retry/cancel recovery |
| E — Observability & Operational Diagnostics | PLANNED | 011, 012 | durable correlation + D runtime + E1 | external telemetry, actionable diagnostics, readiness probe |
| F — End-to-End Product UX Operationalization | PLANNED | 014–018, 021–024 | B–E supported contracts | authenticated operator journey and browser evidence |
| G — Production Deployment Readiness & Governance Gate | BLOCKED BY B–F | 006 | all B–F exits + G1 | production target, rollout/rollback and fail-closed gate |
| H — Full-System Acceptance & Gap Closure | BLOCKED BY G | 020 and residuals | G exit | full regression, security, restart, replica, browser and closure report |

## Milestone A — PASS

A01 established 24 findings: 8 BLOCKER, 4 CRITICAL, 9 HIGH, 2 MEDIUM and 1 LOW. No major implementation was performed. The current readiness classification is Development Ready, Integration Ready PARTIAL, Operational Ready BLOCKED and Production Ready BLOCKED.

## Milestone B — Durable Platform State & Production Adapters

Recommended sprint order:

1. **B01 — Durable Control Plane State & HTTP Contract Compatibility — PASS**
2. **B02 — Production Secrets & Economic State Adapters — PASS**
3. **B03 — Durable Agent, Deployment, Runtime and Job Records — PLANNED**
4. **B04 — Shared-State/Multi-Instance Hardening — PLANNED**

B01 delivered single-node restart durability for Tenant, Membership/Ownership, Governance/Entitlements/Limits and administrative audit. It resolved `ACS-ORG-008` and made existing runtime start/stop handlers reachable. `ACS-ORG-001` and `ACS-ORG-009` remain partial because the adapter is a local atomic snapshot, not shared multi-instance production storage. See [B01-durable-control-plane-state-http-contract.md](./B01-durable-control-plane-state-http-contract.md).

B02 delivered Vault KV v2 secret-material integration, durable metadata/credential references, fail-closed production selection, durable economic/settlement stores, idempotency and crash reconciliation. `ACS-ORG-002` and `ACS-ORG-007` are partial because live managed-service, external/shared settlement and multi-instance evidence remain open. See [B02-production-secrets-economic-adapters.md](./B02-production-secrets-economic-adapters.md).

Do not create one generic repository for every domain. Preserve aggregate-specific invariants and migrate DEV fixture behavior into explicit development bootstrap.

## Milestone C — Production Identity, Security & Edge Controls

Recommended sprint order:

1. **C01 — Trusted HTTP Identity & Authorization Boundary — PASS**
2. **C02 — Distributed Rate Limiting & HTTP Edge Hardening — PASS WITH CAVEATS**

The HTTP method mismatch was resolved in B01. C01 delivered OIDC/JWT signature and claim validation, trusted principal propagation, Tenant binding, explicit signed platform authority, production fail-closed composition and real-server forged-header negatives. `ACS-ORG-003` is resolved for the active production HTTP boundary. See [C01-trusted-http-identity-authorization-boundary.md](./C01-trusted-http-identity-authorization-boundary.md).

C02 delivered fixed-window server-owned rate limiting, an atomic SQLite shared-database store, network/principal/Tenant buckets, trusted proxy resolution, explicit production CORS, body/header/timeout bounds, security headers and edge readiness. `ACS-ORG-013` is resolved. `ACS-ORG-010` remains partial only for live multi-host/global-provider proof under H/`ACS-ORG-019`. See [C02-distributed-rate-limiting-http-edge-hardening.md](./C02-distributed-rate-limiting-http-edge-hardening.md). The ACS remains non-production because runtime, observability, shared authoritative state and deployment gates remain open.

## Milestone D — Distributed Runtime & Execution Readiness

Recommended sprint order:

1. **D01 — Durable Job, Attempt and Lease State**
2. **D02 — Authenticated Remote Worker Dispatch**
3. **D03 — Runtime Recovery and Reconciliation**

Remote proof requires a second process or network boundary. A local worker implementing the same interface is insufficient.

## Milestone E — Observability & Operational Diagnostics

Recommended sprint order:

1. **E01 — External Structured Telemetry**
2. **E02 — Dependency-Aware Liveness and Readiness**

Exporter configuration is not enough: an operator must diagnose an injected failure without shell access.

## Milestone F — End-to-End Product UX Operationalization

Recommended sprint order:

1. **F01 — Canonical Authenticated Control Plane**
2. **F02 — Governed Composition & Secret References**
3. **F03 — Execution & Recovery UX**
4. **F04 — Readiness Truth & Source Hygiene**

Reuse EPIC-14 navigation, accessibility, responsive and browser acceptance patterns. Do not redesign the product or duplicate domain rules in the UI.

## Milestone G — Production Deployment Readiness & Governance Gate

Recommended sprint order:

1. **G01 — Production Prerequisite Certification**
2. **G02 — Production Target, Rollout & Rollback**

The first G change must not remove sandbox guards. The production capability is added behind an explicit gate after prerequisites are certified.

## Milestone H — Full-System Acceptance & Gap Closure

Recommended sprint order:

1. **H01 — Restart, Multi-Replica, Security & Remote Execution Certification**
2. **H02 — Browser Operational Journey Certification**
3. **H03 — Finding Closure & Readiness Report**

H is an acceptance milestone. Material defects found in H receive a scoped functional fix and regression evidence before closure; new features are deferred.

## Global milestone rules

- Update `operational-gap-inventory.md` with status and evidence in every resolving sprint.
- Never convert a finding to `CLOSED` based only on interface/unit evidence when operational proof is required.
- Preserve unrelated workspace changes and stage explicitly.
- Keep production adapters vendor-neutral at the domain boundary but concrete in runtime composition.
- Maintain sandbox/local development workflows without allowing production fallback to them.
- No push without explicit instruction.
