# AEES-H — Full-System Production Acceptance & Closure

**Execution date:** 2026-08-16
**Result:** **PASS WITH ENVIRONMENT LIMITATIONS**
**EPIC decision:** **CLOSED WITH AN EXPLICIT CERTIFIED-TOPOLOGY BOUNDARY**

## Executive decision

H did not add a new product layer. It re-ran the active production-like composition, exercised B–G as one system, corrected stale regression expectations and one accessibility defect, terminally classified all 24 A01 findings, and separated the certified topology from the global claim.

The ACS is operationally certified for `PRODUCTION_LIKE_SINGLE_HOST`: one active Control Plane host, independent remote worker processes, durable local authoritative stores, an independent OTLP receiver process and an independent health/rollback-capable target process. The production readiness/governance path is certified for that topology.

The ACS is **not** globally certified for live managed IdP/Vault, provider HA, networked multi-host stores, cross-host workers/Control Planes, a managed global limiter, a remote telemetry backend or a real cloud deployment target. Those limitations are terminally recorded as `ACCEPTABLE_DEFERRED`; they cannot be used as implicit global guarantees.

## Initial H discovery

The workspace began clean at `5ff6dec`. No `ACS_*`, `OIDC_*`, `JWKS_*`, `VAULT_*` or `OTEL_*` live-provider configuration was available. No provider listener was active. Docker was installed but its daemon socket was unavailable to the execution environment, and Vault CLI was absent. Therefore H used the already certified provider-equivalent/process topology and did not invent live-provider evidence.

| Capability | Pre-H proof | H target | H result |
| --- | --- | --- | --- |
| IdP/JWKS | deterministic external-key OIDC contract | live HTTPS IdP | **NOT_PROVEN** live; signature/issuer/audience/time/rotation/outage semantics **PROVEN** |
| Vault | KV v2 adapter and outage/restart tests | live/HA provider | **NOT_PROVEN** live/HA; lifecycle/isolation/CAS/failure semantics **PROVEN** |
| Rate limiter | shared SQLite across local instances | cross-host/shared service | **PROVEN_SINGLE_HOST**; cross-host **NOT_PROVEN** |
| Telemetry | independent OTLP receiver process | remote/managed backend | **EXTERNAL_PROCESS_PROVEN**; remote managed/TLS backend **NOT_PROVEN** |
| Runtime | multi-process single-host | cross-host workers | **MULTI_PROCESS_SINGLE_HOST_PROVEN**; cross-host **NOT_PROVEN** |
| Control Plane | shared runtime store/local host | multi-instance/multi-host | runtime contention/single-winner **PROVEN_SINGLE_HOST**; global aggregate sharing **NOT_PROVEN** |
| Deployment | independent production-like target process | external production target | **PRODUCTION_LIKE_SINGLE_HOST_PROVEN**; cloud/provider target **NOT_PROVEN** |
| Service identity | signed ACS worker credential | managed workload identity | signed identity **PROVEN**; managed identity **NOT_PROVEN** |

## H01 — Live provider and topology acceptance

### IdP/JWKS

The real HTTP identity boundary validates RS256 signature, issuer, audience, expiration/not-before, subject and configured platform claim; unknown `kid` triggers bounded refresh. Invalid signature, issuer, audience, expiration, missing subject, algorithm mismatch, forged actor/platform headers and unavailable keys are rejected.

H01 could not validate a live HTTPS issuer, public DNS, certificate chain or provider key rotation because no external IdP/configuration was available. Raw tokens are absent from evidence.

**Result:** contract/security behavior `PROVEN`; live provider `NOT_PROVEN`.

### Vault

The Vault KV v2 adapter covers write, describe, resolve, rotate, logical revoke, ACS restart/reload, tenant isolation, CAS conflict, provider outage and authentication failure. Production composition rejects memory/filesystem secret providers.

No live Vault, HA cluster, AppRole/workload identity or external TLS/DNS path was available. The test transport is provider-equivalent contract evidence, not a managed-provider claim.

**Result:** adapter and fail-closed behavior `PROVEN`; live/HA topology `NOT_PROVEN`.

### Shared persistence and limiter

The certified topology uses one host. Runtime jobs/workers/assignments/leases/results and rate-limit buckets are shared by independent local processes over SQLite. Transactions, CAS, fencing, concurrent claims and single-winner recovery pass. Tenant administration/audit uses an atomic durable snapshot; Agent/deployment, secret metadata, economics and settlement use durable stores.

SQLite/local snapshot is not represented as a networked shared production database. Cross-host filesystem locking, network partitions, managed failover and aggregate-wide multi-writer semantics were not tested.

**Result:** single-host durability/multi-process sharing `PROVEN`; cross-host shared authority `NOT_PROVEN`.

### OTLP and trace continuity

Control Plane and worker telemetry is exported asynchronously to an independent receiver process. Structured logs, bounded metrics and distributed spans preserve correlation across HTTP request, job, assignment, worker, execution and result/recovery. Receiver outage degrades telemetry without rolling back or duplicating domain operations; buffering is bounded and export recovers.

No remote managed collector, TLS collector endpoint or multi-host trace backend was available.

**Result:** `EXTERNAL_PROCESS_PROVEN`; remote managed backend `NOT_PROVEN`.

### Runtime, identity and target

Independent Control Plane and worker processes prove remote registration, heartbeat, capability routing, atomic claim, lease renewal, fencing, execution, result submission, worker crash recovery and Control Plane restart. Production rejects local runtime and local-worker fallback. Worker identity is a signed, audience/issuer-bound ACS service credential; it is not claimed as workload OIDC or mTLS.

The production-like target runs as an independent process and supports validate/deploy/inspect/health/stop/rollback. It is not a cloud or multi-host target.

**Result:** certified single-host process topology `PROVEN`; cross-host/managed workload identity/real target `NOT_PROVEN`.

### DNS, TLS and network failures

Provider-unavailable, refused/unreachable endpoint, timeout and exporter/target outage semantics are covered by the B–G suites and fail closed or degrade readiness according to dependency policy. H did not disable TLS verification. Live public DNS, invalid/expired certificate and hostname-mismatch scenarios were not executable without external endpoints; they remain `NOT_PROVEN` rather than inferred.

### H01 evidence

- Live topology manifest: `/tmp/acs-epic15-5-aees-h-evidence/live-topology-manifest.json`
- Provider classes and environment limitations contain no credentials.
- H01 gate: **PASS WITH ENVIRONMENT LIMITATIONS**.

## H02 — Full-system regression and terminal findings

### Regression inventory

| Layer | Result | Evidence |
| --- | --- | --- |
| Complete serial repository suite | **PASS — 569/569, 92 files** | fresh writable temporary build/test mirror |
| Concurrent B–G core | **PASS — 47/47** | durability, identity/edge, runtime, telemetry, UX contracts and deployment gate |
| Security | **PASS** | forged identity/admin, invalid JWT classes, Tenant conflicts, proxy/IP/CORS/rate-limit and secret-leak negatives |
| Cross-tenant isolation | **PASS — 0 violations** | administration, governance, secrets, economics, audit, jobs, diagnostics and deployment/rollback |
| Persistence/restart | **PASS** | admin/audit, secret metadata, economics/settlement, Agent/deployment and runtime/job state |
| Runtime/recovery | **PASS** | worker crash, CP restart, lease expiry, fencing, stale/duplicate result, orphan recovery and cancellation race |
| Observability | **PASS** | external receiver, redaction, metrics cardinality, traces, reason codes and exporter outage/recovery |
| Production deploy/rollback | **PASS** | governance/readiness deny, successful health-gated deploy, post-deploy execution, degradation and idempotent rollback |
| Browser | **PASS — 56/56 route-viewports** | four viewports, accessibility, no overflow/page/console error and real runtime mutations |

Five older tests still asserted pre-G sandbox-only/legacy health behavior. H updated them to the current Product API contract: explicit production governance denial, verified active-deployment requirement and current liveness payload. This is regression maintenance, not a weakened product guard.

The browser closure run found one actual accessibility defect: fourteen governance rule editor controls had visible context but no accessible name. Contextual `aria-label` values were added, the harness was hardened to capture non-2xx responses and loading completion, and the full matrix was rerun.

### Build/typecheck

| Command | Result |
| --- | --- |
| `npx tsc -p tsconfig.json --noEmit` | **PASS** |
| `npm run build` | **ENVIRONMENT_BLOCKER** — `TS5033/EROFS` writing repository `dist` |
| equivalent root emit to `/tmp/acs-epic15-5-h-build-AAOMxR/dist` | **PASS** |
| static app no-emit typechecks | **PASS** |
| `npm --prefix static run build` | **ENVIRONMENT_BLOCKER** — `TS5033/EROFS` writing tracked build-info path |
| equivalent Vite output to `/tmp/acs-epic15-5-h-static-ZY2k5y/dist` | **PASS** |

The failures are write restrictions of the acceptance workspace, not TypeScript or bundling failures. No compiler configuration was loosened.

### Concurrency and flake decision

The complete suite passed serially and the B–G core passed with concurrent execution. A prior transient process-acceptance symptom did not recur and no product race was reproduced. It is classified as `TEST_INFRASTRUCTURE_FLAKE`, with the process harness retained in the full regression rather than removed or silently skipped.

### Finding closure

The canonical [operational-gap-inventory.md](../operational-gap-inventory.md) records:

- `RESOLVED`: 17;
- `ACCEPTABLE_DEFERRED`: 7;
- `OPEN_BLOCKER`: 0.

The deferred findings are `ACS-ORG-001`, `002`, `009`, `010`, `018`, `019` and `021`. Each is bounded by the certified topology or explicit external-infrastructure responsibility. None is represented as globally solved.

**H02 gate:** **PASS**.

## H03 — Closure and readiness decision

### Certified topology

```yaml
name: PRODUCTION_LIKE_SINGLE_HOST
hostModel: one host, independent operating-system processes
controlPlane:
  activeInstances: 1
  contentionEvidence: 2 instances over shared runtime/limiter stores
workers:
  minimumAcceptanceProcesses: 2
  dispatch: authenticated HTTP pull
authoritativeStores:
  administrationAudit: atomic durable local snapshot
  agentDeploymentSecretsEconomicsSettlementRateLimitRuntime: SQLite/local durable adapters
identity:
  boundary: OIDC JWT RS256/JWKS contract
  liveManagedProvider: not proven
secrets:
  boundary: Vault KV v2
  liveManagedOrHAProvider: not proven
telemetry:
  exporter: OTLP HTTP/JSON
  receiver: independent process on the certified host
deploymentTarget:
  class: independent production-like process
  healthAndRollback: proven
```

### Global claim

`GLOBAL_CLAIM = NOT_CERTIFIED` for multi-host, provider HA, managed workload identity, globally shared authoritative persistence/rate limiting, remote telemetry backend, cloud deployment target, multi-region recovery and unlimited fleet scale.

### Final readiness matrix

| Level | Certified topology | Global claim |
| --- | --- | --- |
| Development Ready | **READY / CERTIFIED** | **READY** |
| Integration Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** — live provider and cross-host integration not proven |
| Operational Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** — operations are complete for the bounded topology only |
| Production Ready | **READY for `PRODUCTION_LIKE_SINGLE_HOST`** | **NOT_CERTIFIED** — no live managed-provider or multi-host claim |

### Production guarantees

- authenticated actor and signed platform-authority boundary;
- Tenant membership/governance isolation after authentication;
- fail-closed production adapter composition;
- restart-survivable authoritative state for the certified topology;
- durable jobs, assignments, leases, fencing and stale-owner rejection;
- independent authenticated worker execution and deterministic recovery;
- structured logs, metrics, distributed traces and external-process export;
- dependency-aware readiness and supported operator diagnostics;
- browser-supported Agent, Tenant, execution, recovery and operations journeys;
- explicit production readiness/governance evaluation, health verification and rollback.

### Non-guarantees

- live managed IdP or Vault availability/HA;
- provider-managed workload identity or mTLS worker identity;
- networked multi-host authoritative databases or a global limiter;
- multi-host, multi-region, multi-cloud or unlimited fleet operation;
- managed telemetry retention, alert routing or SLO platform;
- real cloud target, infrastructure autoscaling or automated provider repair;
- billing, invoicing, subscriptions, tax, payment processing or SCIM.

### H03 evidence and result

- Closure report: [epic-15-5-closure-report.md](../epic-15-5-closure-report.md)
- Root evidence manifest: `/tmp/acs-epic15-5-aees-h-evidence/manifest.json`
- Browser evidence: `/tmp/acs-epic15-5-aees-h-evidence/browser-certified/manifest.json`
- H03 gate: **PASS**.
- EPIC-15.5: **CLOSED WITH CERTIFICATION LIMITS**.

## Files and tests changed by H

H adds this milestone report and the closure report; synchronizes the README, strategic plan, readiness baseline, architecture/UX audits, stories, milestone index, browser acceptance and regression inventory; updates five stale regression expectations; improves the browser harness; and labels governance rule controls accessibly.

No production adapter, provider, distributed system or deployment target was fabricated to satisfy H. No push was performed.
