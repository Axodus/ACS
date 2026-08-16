# EPIC-15.5 Milestones

This index is the normative consumption order for implementation. A milestone may start design work before a dependency closes, but it may not claim readiness or expose a production path until its entry gates pass.

| Milestone | Status | Findings primarily owned | Entry gate | Exit evidence |
| --- | --- | --- | --- | --- |
| A — System-Wide Gap Discovery & Readiness Baseline | **PASS** | all discovery | EPIC-15 closure | verified inventory, baseline, journeys, stories and plan |
| B — Durable Platform State & Production Adapters | **IN PROGRESS — B01/B02 PASS** | 001, 002, 007, 009, 019 plus resolved 008 | A baseline; B1–B3 for remaining production adapters | admin/audit plus secret/economic restart complete; shared state and operational aggregates remain |
| C — Production Identity, Security & Edge Controls | **PASS WITH CAVEATS — C01/C02 PASS** | resolved 003/013; partial 010 | C1/C2 application decisions closed | trusted identity and hardened edge complete; live topology acceptance remains |
| D — Distributed Runtime & Execution Readiness | **PASS WITH TOPOLOGY CAVEATS — AEES-D PASS** | resolved 004/005; partial 001/017/019/020 | B state + C identity + D1 | durable ownership, authenticated remote dispatch and crash/restart recovery proven across processes |
| E — Observability & Operational Diagnostics | **PASS WITH TOPOLOGY CAVEATS — AEES-E PASS** | resolved 011/012; partial 019/020 | durable correlation + D runtime + E1 | external-process OTLP telemetry, actionable diagnostics and dependency-aware readiness proven |
| F — End-to-End Product UX Operationalization | **PASS WITH TOPOLOGY/ENVIRONMENT CAVEATS — AEES-F PASS** | resolved 014–017/022–024; partial 018/021 | B–E supported contracts | authenticated operator journey and browser evidence |
| G — Production Deployment Readiness & Governance Gate | BLOCKED BY B RESIDUALS/F CAVEATS | 006 | all B–F exits + G1 | production target, rollout/rollback and fail-closed gate |
| H — Full-System Acceptance & Gap Closure | BLOCKED BY G | 020 and residuals | G exit | full regression, security, restart, replica, browser and closure report |

## Milestone A — PASS

A01 established 24 findings: 8 BLOCKER, 4 CRITICAL, 9 HIGH, 2 MEDIUM and 1 LOW. No major implementation was performed. The current readiness classification is Development Ready, Integration Ready PARTIAL, Operational Ready BLOCKED and Production Ready BLOCKED.

## Milestone B — Durable Platform State & Production Adapters

Recommended sprint order:

1. **B01 — Durable Control Plane State & HTTP Contract Compatibility — PASS**
2. **B02 — Production Secrets & Economic State Adapters — PASS**
3. **B03 — Durable Agent, Deployment, Runtime and Job Records — PARTIAL: runtime/job subset delivered by AEES-D**
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

1. **D01 — Durable Job, Attempt and Lease State — PASS**
2. **D02 — Authenticated Remote Worker Dispatch — PASS WITH SERVICE-IDENTITY TOPOLOGY CAVEAT**
3. **D03 — Runtime Recovery and Reconciliation — PASS WITH MULTI-HOST CAVEAT**

AEES-D delivered one SQLite-backed durable job/worker/assignment/event authority, atomic claims, lease renewal/expiry, monotonic fencing, retry/cancel recovery and authenticated worker-pull HTTP. Its acceptance launched two Control Plane processes and two independent OpenClaw worker processes over the shared store, then injected worker loss, Control Plane restart, stale result, duplicate result, cancellation and no-capacity conditions.

`ACS-ORG-004` and `ACS-ORG-005` are resolved. `ACS-ORG-001` is resolved only for the runtime subset; `ACS-ORG-019` is partial because local multi-process correctness is proven but multi-host/shared managed database behavior is not. See [AEES-D-distributed-runtime-recovery-certification.md](./AEES-D-distributed-runtime-recovery-certification.md). The next milestone is E; no production deployment gate is removed.

## Milestone E — Observability & Operational Diagnostics

Recommended sprint order:

1. **E01 — External Structured Telemetry — PASS**
2. **E02 — Dependency-Aware Liveness and Readiness — PASS**
3. **E03 — Operational Incident Evidence — PASS WITH MULTI-HOST CAVEAT**

AEES-E delivered bounded structured logs, low-cardinality metrics, distributed Control Plane/worker spans, OTLP HTTP/JSON export, stable dependency reason codes and authorized job/worker/recovery diagnostics. The process acceptance used an independent receiver, Control Plane and workers, and diagnosed crash, stale ownership, dependency/no-capacity, retry exhaustion, restart and exporter outage without direct SQLite/filesystem-log inspection.

`ACS-ORG-011` and `ACS-ORG-012` are resolved for the active boundary. Multi-host collector/storage, managed retention/alert routing and a complete remediation UX remain H/F caveats. See [AEES-E-observability-operational-diagnostics-certification.md](./AEES-E-observability-operational-diagnostics-certification.md).

## Milestone F — End-to-End Product UX Operationalization

Recommended sprint order:

1. **F01 — Unified Operational Navigation & Journey Closure — PASS**
2. **F02 — Runtime, Recovery & Remediation UX — PASS WITH EXTERNAL-REMEDIATION CAVEAT**
3. **F03 — End-to-End Browser Operational Acceptance — PASS**
4. **F04 — Readiness Truth & Source Hygiene — PASS**

AEES-F securely federated the main shell and Tenant Administration, added Product API-backed Agent/model/composition and write-only secret flows, and exposed durable Executions, Workers, Operations, diagnostics and cancellation. Browser acceptance passed journeys A–G over 14 routes and four viewports: 56/56 route checks, 56 accessibility checks, zero overflow, zero page errors and zero console errors.

`ACS-ORG-014`–`017` and `022`–`024` are resolved within the supported boundary. `ACS-ORG-018`/`021` remain partial because worker/provider/infrastructure remediation is external. See [AEES-F-end-to-end-operational-ux-certification.md](./AEES-F-end-to-end-operational-ux-certification.md). Operational Ready is ready only for the certified multi-process single-host sandbox topology; Production Ready remains blocked.

## Milestone G — Production Deployment Readiness & Governance Gate

**Status:** PASS WITH TOPOLOGY AND ENVIRONMENT CAVEATS — AEES-G, 2026-08-16.

Recommended sprint order:

1. **G01 — Production Prerequisite Certification**
2. **G02 — Production Target, Rollout & Rollback**

G replaced the blanket sandbox-only decision with a stronger backend-authoritative gate: durable target/deployment state, hard/soft dependency checks, explicit `deployment.production` allow, TOCTOU re-evaluation, verified health and idempotent rollback. Sandbox remains supported. Production is READY only for the certified production-like single-host topology and PARTIAL globally. See [AEES-G-production-deployment-readiness-governance-gate.md](./AEES-G-production-deployment-readiness-governance-gate.md).

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
