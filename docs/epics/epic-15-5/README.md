# EPIC-15.5 — ACS Operational Readiness & Gap Elimination

**Status:** AEES-E / Milestone E **PASS WITH TOPOLOGY CAVEATS** on 2026-08-16; Milestone B residual work remains open

**Readiness conclusion:** ACS is **Development Ready**, more completely **Integration Ready** for Tenant Administration, and **not Operational Ready or Production Ready**.

## Mission

EPIC-15.5 changes the acceptance question from “does a contract or surface exist?” to “can an operator run the platform safely through supported paths?”. Its target journey is:

```text
authenticate
→ administer tenants
→ create and configure agents
→ assign capabilities, tools and secrets
→ validate readiness
→ deploy
→ execute
→ observe and diagnose
→ recover
→ inspect audit and economics
```

The current repository contains substantial domain, API, governance and UX foundations. A01 found that the active composition still relies on caller-supplied mock identity, process-local authoritative state, local-only execution, development secret and settlement adapters, and incomplete operator journeys. Those facts prevent an operational or production claim.

## A01 outcome

A01 verified **24 consolidated findings**:

| Severity | Count |
| --- | ---: |
| BLOCKER | 8 |
| CRITICAL | 4 |
| HIGH | 9 |
| MEDIUM | 2 |
| LOW | 1 |

The canonical source is [operational-gap-inventory.md](./operational-gap-inventory.md). Findings are evidence-backed and deduplicated by root cause. In-memory test doubles, local development adapters and the sandbox gate are not defects by themselves; the gap is their use as the only or active operational path without a certified production alternative.

## B01 outcome

B01 added an aggregate-specific durable administrative adapter for Tenant, Membership/Ownership, Governance/Entitlements/Limits and the shared administrative audit stream. The shipped HTTP server selects this adapter by default, while programmatic tests may still opt into explicit in-memory repositories. Restart tests prove preservation of revisions, timestamps, ownership, governance configuration and audit correlation.

The adapter is a single-node atomic filesystem snapshot. It is **not** a shared production database and has no cross-process locking, migrations, retention or multi-writer proof. Therefore `ACS-ORG-001` and `ACS-ORG-009` are only **PARTIALLY_RESOLVED**.

B01 also resolved `ACS-ORG-008`: the real HTTP entry handler and CORS preflight accept `GET`, `POST`, `PUT`, `PATCH` and `DELETE`; Tenant Administration `PUT`/`DELETE` operations execute through the real server; and runtime `start`/`stop` handlers are reachable before unsupported-operation guards. Production identity and broader edge hardening were subsequently completed as bounded application contracts in C01/C02.

## B02 outcome

B02 added a Vault KV v2 `SecretProvider`, a durable SQLite catalog for non-secret metadata and credential references, and fail-closed production adapter selection. Secret values remain external to ACS persistence and administrative read models; tenant-scoped lifecycle, rotation, revocation, health and no-leak tests pass.

Economics now uses explicit `EconomicStateStore` and `SettlementProvider` boundaries. SQLite adapters preserve quotes, reservations, usage, settlements and receipts through restart, enforce idempotency and reconcile the crash window between provider confirmation and local projection commit.

`ACS-ORG-002` and `ACS-ORG-007` are **PARTIALLY_RESOLVED**, not closed: live Vault/HA/service-identity proof, shared multi-instance storage and an external settlement service remain unproven. Operational and Production Readiness remain blocked.

## C01 outcome

C01 replaced the active production header-trust path with an explicit `HttpIdentityValidator` boundary and a production-oriented OIDC/JWT implementation. The server validates RS256 signature, trusted JWKS key, issuer, audience, expiration/not-before and subject before constructing the principal. Unknown `kid` triggers a bounded JWKS refresh for key rotation.

`platform_admin` now comes only from one explicitly configured signed claim/value. Actor, platform and Tenant headers are ignored by the OIDC adapter; Tenant membership and governance remain separate downstream decisions. Production composition rejects the development adapter and incomplete OIDC configuration. Real HTTP tests prove forged actor/platform headers, invalid tokens, cross-Tenant access and suspended/removed membership cannot bypass the boundary.

`ACS-ORG-003` is **RESOLVED** for the active HTTP production composition. Identity is **PARTIAL**, not globally production-certified, because live IdP/JWKS deployment evidence and broader edge/service identity work remain open. Operational and Production Readiness remain blocked.

## C02 outcome

C02 replaced the server's caller-selected mock rate-limit path with a canonical fixed-window `RateLimiter`. `createAcsHttpServer` selects an atomic SQLite store; independent instances using the same database share counters, while the memory adapter remains DEV/test-only and is rejected by production composition. Network, principal and Tenant+principal buckets are derived server-side and persisted only as hashes.

The HTTP edge now has explicit trusted-proxy resolution, production CORS allowlists, bounded JSON bodies, header/request/keep-alive controls, API security headers and consistent `413`, `429`, `Retry-After` and backend-outage semantics. C01 identity remains downstream of network protection and upstream of tenant authority/governance.

`ACS-ORG-013` is **RESOLVED** for the active server boundary. `ACS-ORG-010` is **PARTIALLY_RESOLVED** because shared SQLite connections/instances are proven on one database, while a live multi-host/global rate-limit service and reverse-proxy topology remain unproven. Security/Edge is **PARTIAL** and Operational/Production Readiness remain blocked.

## AEES-D outcome

AEES-D connected Product API runtime intent to `SqliteDurableRuntimeState`, an authenticated HTTP worker-pull protocol and independent OpenClaw worker processes. Jobs, assignments, registrations, heartbeats, leases, fencing tokens, results, cancellation and recovery events are durable. Atomic claims and revision checks prevent simultaneous valid owners; a reassigned job advances its fencing token and rejects the stale worker.

The process acceptance started two Control Planes and two workers over one shared SQLite database. It proved independent execution, worker crash/requeue/reassignment, stale-result rejection, duplicate-result idempotency, cancellation ordering, Control Plane restart, no-worker backpressure and competing recovery coordinators.

`ACS-ORG-004` and `ACS-ORG-005` are **RESOLVED** for the active production runtime boundary. The runtime subset of `ACS-ORG-001` is resolved. `ACS-ORG-019` is **PARTIALLY_RESOLVED** because local multi-process/shared-database correctness is proven while multi-host topology remains unproven. Runtime is ready for the certified single-host remote topology; global Operational and Production Readiness remain blocked by E/F/G/H.

## AEES-E outcome

AEES-E added structured HTTP/runtime/worker logs, low-cardinality metrics, distributed trace propagation and a bounded OTLP HTTP/JSON exporter. Production composition rejects disabled/memory telemetry. An independent receiver process proved evidence survives outside the diagnosed Control Plane/worker processes, while exporter outage degrades diagnostics without corrupting authoritative state.

`GET /api/v1/health` is now liveness, `GET /api/v1/ready` is aggregate dependency-aware readiness, and authorized operational/telemetry/job diagnostic routes expose stable reason codes and recommended actions without Tenant leakage. Worker crash, stale result, Vault/rate-limiter outages, no eligible worker, retry exhaustion, Control Plane restart and exporter outage/recovery were diagnosed without direct SQLite or filesystem-log inspection.

`ACS-ORG-011` and `ACS-ORG-012` are **RESOLVED** for the active boundary. Observability is ready for the certified local multi-process topology; multi-host collector/storage, managed retention/alerts and complete operator UX remain caveats/deferred scope. Operational and Production Readiness remain blocked by B/F/G/H.

## Principles

- **Evidence before claims.** Contracts and unit tests do not prove operational readiness.
- **Durable truth before scale.** Authoritative state must survive restart and be shareable across replicas.
- **Trusted identity before authority.** Tenant governance is only safe when the incoming principal is authenticated.
- **Remote proof before distributed claims.** A worker interface or local worker is not remote dispatch.
- **Recovery is part of operation.** Detection without a supported remediation path is incomplete.
- **One readiness vocabulary.** Development, integration, operational and production readiness are distinct gates.
- **No premature feature work.** A01 documents and sequences gaps; it does not replace adapters or remove safety gates.

## Scope and non-goals

A01 covers repository-wide discovery, state and adapter inventory, identity/edge review, runtime and deployment flow, economics, audit, observability, Control Plane journeys, recovery and test evidence.

A01 does not implement OIDC, a durable database, managed secrets, a broker, remote workers, exporters, billing, metering, production deployment, or new UX. Billing, SCIM, generic IAM, arbitrary policy languages and a generic observability platform remain outside the baseline unless a future milestone proves they are required for an approved operational journey.

## Document map and reading order

1. [production-readiness-baseline.md](./production-readiness-baseline.md) — current readiness by dimension, state and adapter inventories.
2. [operational-gap-inventory.md](./operational-gap-inventory.md) — canonical findings and evidence.
3. [architecture-gap-review.md](./architecture-gap-review.md) — contract versus implementation versus production proof.
4. [ux-operational-audit.md](./ux-operational-audit.md) — supported, partial and blocked operator journeys.
5. [EPIC-15.5_Strategic_Operational_Plan.md](./EPIC-15.5_Strategic_Operational_Plan.md) — sequencing, gates and definition of done.
6. [stories.md](./stories.md) — implementation-ready stories.
7. [milestones/README.md](./milestones/README.md) — milestone consumption order and exit evidence.
8. [milestones/B01-durable-control-plane-state-http-contract.md](./milestones/B01-durable-control-plane-state-http-contract.md) — implemented persistence and HTTP compatibility evidence.
9. [milestones/B02-production-secrets-economic-adapters.md](./milestones/B02-production-secrets-economic-adapters.md) — secrets/economics adapters, restart and reconciliation evidence.
10. [milestones/C01-trusted-http-identity-authorization-boundary.md](./milestones/C01-trusted-http-identity-authorization-boundary.md) — OIDC validation, trusted principal propagation and forged-header evidence.
11. [milestones/C02-distributed-rate-limiting-http-edge-hardening.md](./milestones/C02-distributed-rate-limiting-http-edge-hardening.md) — limiter, proxy, CORS, request-bound and edge-readiness evidence.
12. [milestones/AEES-D-distributed-runtime-recovery-certification.md](./milestones/AEES-D-distributed-runtime-recovery-certification.md) — D01 durable ownership, D02 remote dispatch and D03 process/failure evidence.
13. [milestones/AEES-E-observability-operational-diagnostics-certification.md](./milestones/AEES-E-observability-operational-diagnostics-certification.md) — E01 telemetry/export, E02 dependency diagnostics and E03 incident evidence.
14. [AGENTS.md](./AGENTS.md) — local execution rules.

## Milestone map

| Milestone | Outcome |
| --- | --- |
| A | Verified system-wide baseline and executable backlog |
| B | **IN PROGRESS:** single-node durable administration, Vault boundary and durable economics delivered; remaining operational state/shared topology open |
| C | **PASS WITH CAVEATS:** trusted HTTP identity and hardened edge delivered; live IdP/proxy/multi-host limiter acceptance remains |
| D | **PASS WITH TOPOLOGY CAVEATS:** durable jobs, authenticated remote dispatch and crash/restart recovery delivered; multi-host proof remains H |
| E | **PASS WITH TOPOLOGY CAVEATS:** external-process telemetry, distributed correlation and dependency-aware diagnostics delivered; multi-host/managed backend proof remains H |
| F | Complete supported operator journeys and remediation UX |
| G | Certified production deployment gate and target path |
| H | Restart, multi-replica, security, browser and recovery certification |

## EPIC exit criteria

EPIC-15.5 can close only when the operational journey is supported without code edits, direct storage manipulation, forged identity, process-local authoritative truth, restart as remediation or hidden backend-only steps. Production readiness additionally requires trusted identity, durable shared state, managed secrets, remote execution proof, external diagnostics, safe deployment/recovery and reproducible acceptance evidence.

## Baseline relationship

EPIC-15.5 does not reopen the stabilized domain and UX decisions of EPIC-10, EPIC-11, EPIC-12, EPIC-14 or EPIC-15. It distinguishes their valid contract/surface acceptance from production operation. EPIC-15 tenant isolation and governance remain invariants; EPIC-14 browser acceptance remains valid for the certified UI build; neither substitutes for durable state, trusted identity or distributed runtime proof.
