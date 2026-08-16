# Operational Gap Inventory — Terminal EPIC-15.5 Disposition

**Closure date:** 2026-08-16
**Baseline:** `ed46412`
**Closure evidence:** AEES-H acceptance and the commit carrying this document
**Canonical status vocabulary:** `RESOLVED`, `ACCEPTABLE_DEFERRED`, `OPEN_BLOCKER`

This register preserves the 24 findings discovered by A01 and gives each one a terminal EPIC-15.5 disposition. `ACCEPTABLE_DEFERRED` is used only when the residual does not invalidate the certified topology and the global claim is explicitly limited. Historical milestone reports remain point-in-time evidence; this file is authoritative for current finding status.

## Final summary

| Status | Count |
| --- | ---: |
| RESOLVED | 17 |
| ACCEPTABLE_DEFERRED | 7 |
| OPEN_BLOCKER | 0 |

The absence of `OPEN_BLOCKER` applies only to the certified production-like single-host topology. It is not a global multi-host, multi-provider or multi-region certification.

## Terminal finding table

| Finding | A01 severity | Terminal status | H evidence and rationale | Future boundary |
| --- | --- | --- | --- | --- |
| ACS-ORG-001 — authoritative state was process-local | BLOCKER | **ACCEPTABLE_DEFERRED** | Tenant administration/audit use an atomic durable snapshot; Agent, deployment, secrets metadata, economics, settlement, rate limiting and runtime use durable stores. Restart suites pass. The certified topology is one active Control Plane host; a networked shared database for all aggregates is not proven. | Multi-host/shared-database certification outside the certified topology. |
| ACS-ORG-002 — no production secret provider | BLOCKER | **ACCEPTABLE_DEFERRED** | Vault KV v2 boundary, durable metadata, tenant isolation, rotation/revocation, outage behavior and production fail-closed selection pass. A live managed/HA Vault and provider-managed workload identity were not available in H01. | Live provider, HA and service-identity acceptance before a live-provider global claim. |
| ACS-ORG-003 — forgeable HTTP actor/platform authority | BLOCKER | **RESOLVED** | RS256/JWKS issuer/audience/time validation, signed platform mapping, forged-header negatives, cross-tenant denial and suspended/removed membership pass through the real server. | Live IdP availability is topology certification, not a reopened header-trust defect. |
| ACS-ORG-004 — same-process execution | BLOCKER | **RESOLVED** | Independent worker processes register, heartbeat, claim, execute and submit results over authenticated HTTP; production rejects local-worker fallback. | Cross-host workers remain outside the certified topology. |
| ACS-ORG-005 — non-durable jobs/assignments/leases | BLOCKER | **RESOLVED** | SQLite job/worker/assignment authority, atomic claim, leases, monotonic fencing, restart, crash recovery, stale-result rejection and duplicate-result idempotency pass. | Managed multi-host runtime storage is a future topology expansion. |
| ACS-ORG-006 — blanket sandbox-only deployment | BLOCKER | **RESOLVED** | The blanket rule was replaced by explicit production target capability, aggregate readiness, tenant governance allow, TOCTOU re-evaluation, health verification and rollback. | Only the certified production-like target is covered. |
| ACS-ORG-007 — in-memory economics/settlement | BLOCKER | **RESOLVED** | Durable economic and settlement stores preserve reservations, usage, settlements and receipts; idempotency, crash reconciliation, restart and cross-tenant isolation pass. Billing/payment processing was never an ACS requirement. | External billing, pricing, invoicing and financial-provider integration remain product-roadmap scope. |
| ACS-ORG-008 — HTTP rejected Product API PUT/DELETE | BLOCKER | **RESOLVED** | Real HTTP accepts GET/POST/PUT/PATCH/DELETE, correct handlers are reachable, unsupported methods retain 405 semantics and Tenant Administration exercises the declared methods. | None. |
| ACS-ORG-009 — audit history process-local | CRITICAL | **ACCEPTABLE_DEFERRED** | Administrative audit survives restart with actor, tenant, correlation, revision and timestamp integrity. It is sufficient for the one-host certified topology; shared append/outbox, retention and tamper-evident storage are not certified. | Shared audit/outbox and retention policy for multi-host/global claims. |
| ACS-ORG-010 — mock/process-local rate limiting | CRITICAL | **ACCEPTABLE_DEFERRED** | Production rejects disabled/memory limiting; atomic SQLite buckets are shared across independent local instances and spoofing/429/outage tests pass. Cross-host/global limiter service was not available. | Distributed external limiter before multi-host claim. |
| ACS-ORG-011 — no external telemetry/logs/traces | CRITICAL | **RESOLVED** | Structured logs, low-cardinality metrics, distributed traces, bounded OTLP export, redaction and independent receiver-process acceptance pass. | Managed retention/alerting and remote backend topology are non-guarantees. |
| ACS-ORG-012 — no dependency-aware readiness | HIGH | **RESOLVED** | Liveness/readiness are separated; required/optional dependencies, stable reason codes, timeouts, degraded/blocked policy and operator diagnostics pass. | None inside the supported workload/topology. |
| ACS-ORG-013 — incomplete HTTP edge | HIGH | **RESOLVED** | Trusted proxy resolution, CORS allowlist, body/header/time bounds, security headers, rate-limit semantics and sensitive-error controls pass real-server tests. | External WAF/DDoS/CDN remain infrastructure scope. |
| ACS-ORG-014 — fragmented Tenant Administration | HIGH | **RESOLVED** | Main Control Plane and Tenant Administration are securely federated by navigation/session context and browser acceptance. | Internal build unification is not required. |
| ACS-ORG-015 — Agent composition unavailable | HIGH | **RESOLVED** | Role/profile/capability/tool configuration is Product API-backed and browser-certified in the Agent lifecycle. | None for the supported composition contract. |
| ACS-ORG-016 — no supported secret journey | HIGH | **RESOLVED** | Write-only secret/reference configuration, status, rotation/revocation semantics and no-read-back behavior are exposed without plaintext leakage. | Provider administration itself stays external. |
| ACS-ORG-017 — incomplete execution journey | HIGH | **RESOLVED** | Start, durable job observation, worker assignment, result, failure, cancellation and recovery are exposed through supported Product API/UX paths. | None for supported workloads. |
| ACS-ORG-018 — diagnosis without governed remediation | HIGH | **ACCEPTABLE_DEFERRED** | Retry/cancel and automatic recovery are governed and operator-visible. Provisioning workers/providers and repairing external infrastructure remain explicit operator/infrastructure actions. | Infrastructure automation/operations platform. |
| ACS-ORG-019 — multi-replica/multi-host unproven | CRITICAL | **ACCEPTABLE_DEFERRED** | Multi-process single-host runtime and limiter contention are proven, including two Control Planes and two workers. Cross-host authoritative storage/network partition/failover is not proven and is excluded from the certified topology/global claim. | Dedicated multi-host acceptance with networked shared stores. |
| ACS-ORG-020 — inadequate full acceptance | HIGH | **RESOLVED** | H ran the complete 92-file serial suite (569/569), a concurrent B–G core (47/47), real process recovery, provider failure paths, production deploy/rollback and full four-viewport browser acceptance. | Re-run for every new topology/profile. |
| ACS-ORG-021 — hidden local/bootstrap prerequisites | HIGH | **ACCEPTABLE_DEFERRED** | Once the certified topology is bootstrapped, supported journeys require no shell, SQLite inspection or manual API calls. Provider/worker/target provisioning remains an explicit deployment prerequisite, not a hidden UI step. | Infrastructure-as-code/provider bootstrap. |
| ACS-ORG-022 — readiness language exceeded evidence | MEDIUM | **RESOLVED** | Product/docs now separate certified topology from global claim and list non-guarantees. | Maintain claim discipline in future releases. |
| ACS-ORG-023 — stale future-scope projections | MEDIUM | **RESOLVED** | Active navigation and projections describe delivered Tenant Administration, runtime, diagnostics and deployment capabilities. | None. |
| ACS-ORG-024 — tracked backup artifacts | LOW | **RESOLVED** | Obsolete tracked backups were removed/ignored during F and the H security/source sweep found no active duplicate production truth. | Normal repository hygiene. |

## Explicit residual decisions

### ACS-ORG-001

No authoritative state used by the certified topology is memory-only across process restart. Some durable stores are local-file/SQLite and therefore intentionally bound to one host. That limitation is terminally deferred under the topology boundary; it prevents a global multi-host claim, not operation of the certified topology.

### ACS-ORG-002

The provider boundary is production-oriented and production composition fails closed. H01 could not prove a live managed/HA Vault, external DNS/TLS path or managed service identity. Secrets are therefore acceptable only under the explicit provider-equivalent acceptance boundary; live-provider certification remains required before a global production claim.

### ACS-ORG-007

ACS economic authorization and settlement semantics are durable, idempotent and recoverable. The absence of billing, invoicing, pricing products or an external payment processor is not a blocker because those capabilities are outside the ACS operational contract.

### ACS-ORG-010

The active limiter is real and shared across local instances. It is not described as globally distributed because cross-host shared storage was not proven.

### ACS-ORG-018 / ACS-ORG-021

The Control Plane exposes diagnosis, safe retry/cancel and remediation guidance. Creating infrastructure, provisioning a provider or starting capacity outside ACS remains an explicit external responsibility rather than a hidden fallback.

### ACS-ORG-019

The proven topology is multi-process, not multi-host. No global horizontal-scaling, HA, network-partition or multi-region guarantee is made.

## Production-path no-fallback decision

Production composition is verified to reject:

- development/mock HTTP identity;
- caller-controlled platform authority;
- memory/filesystem secret material as a production provider;
- process-local runtime authority and local-worker fallback;
- disabled/memory rate limiting;
- disabled/memory-only telemetry;
- an unsupported or non-production-eligible deployment target;
- production deployment without explicit tenant governance allow.

Provider outages degrade or block readiness according to policy; they do not silently switch to a development adapter.

## Closure rule

The EPIC may be closed because all findings are terminal and there is no blocker inside the certified topology. Expanding the claim to live managed providers, multi-host shared state, HA or multi-region operation requires new evidence and must not reinterpret `ACCEPTABLE_DEFERRED` as already certified.
