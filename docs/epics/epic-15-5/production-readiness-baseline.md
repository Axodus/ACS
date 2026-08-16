# Production Readiness Baseline

**Assessment date:** 2026-08-16

**Source revision:** `ed46412` plus B01/B02/C01/C02/AEES-D implementation evidence

**Overall classification:** **Development Ready / Integration Ready PARTIAL / Operational Ready BLOCKED / Production Ready BLOCKED**

This baseline evaluates the active composition, not only interfaces or milestone acceptance. `NOT PROVEN` is used when architecture or tests exist but no operational evidence demonstrates the required topology.

## Dimension baseline

| Dimension | Status | Evidence-based conclusion | Blocking findings |
| --- | --- | --- | --- |
| Identity | PARTIAL | Production OIDC/JWT validation and trusted principal/platform mapping pass deterministic and real-HTTP tests; live IdP/JWKS deployment evidence remains. | live-provider acceptance |
| Security | PARTIAL | Tenant rules, redaction, Vault, trusted HTTP identity and bounded edge controls exist; live managed-service identity and deployed multi-host edge topology are not production-certified. | ACS-ORG-002, 010, 019 |
| HTTP edge | PARTIAL | Server-owned network/principal/Tenant buckets, explicit production CORS, proxy trust, request bounds, timeouts and security headers pass deterministic and real-HTTP tests. SQLite proves shared counters on one database; multi-host topology remains unproven. | ACS-ORG-010, 019 |
| Secrets | PARTIAL | Vault KV v2 plus durable metadata/reference catalog is selectable and production fallback fails closed; live provider/HA/service-identity and shared catalog proof remain. | ACS-ORG-002, 016, 019 |
| Persistence | PARTIAL | Tenant Administration, audit, secret metadata/references, economics and runtime ownership survive restart. Runtime is shared by local processes; Agents/deployments and global multi-host state remain unproven. | ACS-ORG-001, 009, 019 |
| Runtime | READY FOR CERTIFIED TOPOLOGY | Durable jobs, workers, assignments, leases, fencing, results, cancellation and automatic recovery pass restart/crash acceptance. Operator remediation and multi-host infrastructure remain outside this bounded status. | ACS-ORG-017, 019 |
| Distributed execution | PARTIAL | Two independent Control Planes and two worker processes execute through authenticated HTTP pull and one durable authority. Multi-host/network-partition and workload-identity deployment are not proven. | ACS-ORG-019, 020 |
| Deployment | BLOCKED | Sandbox deployment works; staged/live are intentionally rejected. | ACS-ORG-006 |
| Observability | BLOCKED | Evidence projections exist; no external exporter, HTTP telemetry, raw logs or traces. | ACS-ORG-009, 011, 012 |
| Economics | PARTIAL | Durable SQLite economic/settlement adapters, idempotency and reconciliation pass; shared/external provider and production financial policy remain unproven. | ACS-ORG-007, 019 |
| Audit | PARTIAL | Canonical events and Tenant history now survive restart on the selected single-node store; replica sharing, retention/tamper controls and transactional outbox semantics remain unproven. | ACS-ORG-009 |
| Product API | PARTIAL | HTTP method compatibility, trusted identity, edge guards and durable runtime start/read/cancel are active; composition and complete execution/remediation journeys remain. | ACS-ORG-015, 017, 023 |
| Control Plane | PARTIAL | Main operational UX and Tenant Administration are browser-certified separately. | ACS-ORG-014–018 |
| UX journeys | BLOCKED | No complete authenticate-to-recover operator journey exists. | ACS-ORG-014–018, 021 |
| Recovery | PARTIAL | Automatic lease/worker/orphan recovery and durable cancellation pass process acceptance; operator remediation UX and multi-host/provider failure coverage remain. | ACS-ORG-018, 019 |
| Testing | PARTIAL | Unit/route/browser coverage now includes real runtime restart, worker crash, two-process ownership, stale/duplicate result and cancellation tests. Full-system/live-provider/multi-host acceptance remains. | ACS-ORG-020 |

## Production-state inventory

| Component | State held | Current mechanism | Durable? | Shared across replicas? | Survives restart? | Production adapter? | Classification / severity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant | identity, lifecycle, revisions/history | `TenantRepository` backed by atomic administrative snapshot in the HTTP server | Single-node | No | Yes | No shared production adapter | `AUTHORITATIVE_DURABLE` for one node / multi-instance NOT PROVEN |
| Membership | role, status, ownership history | `TenantMembershipRepository` backed by the same atomic snapshot | Single-node | No | Yes | No shared production adapter | `AUTHORITATIVE_DURABLE` for one node; ownership batch is atomic per snapshot |
| Tenant governance | policies, entitlements, limits, revisions | `TenantGovernanceRepository` backed by the same atomic snapshot | Single-node | No | Yes | No shared production adapter | `AUTHORITATIVE_DURABLE` for one node / multi-instance NOT PROVEN |
| Agents | definitions, revisions, lifecycle metadata | service/repository maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Composition resources | roles, profiles, skills, tools, capabilities | registry maps and seeded values | No | No | Re-seeded only | No | Registry/authoritative mix / HIGH |
| Credential connections | secret references and connection metadata | `CredentialConnectionStore`; SQLite catalog in HTTP composition | Single-node | No | Yes | Single-node adapter | Durable references; multi-instance NOT PROVEN |
| Secrets | raw secret values | Vault KV v2 when selected; memory/filesystem only in explicit DEV | Provider-managed | Provider-managed | Yes through reference | Production-oriented provider boundary | PARTIAL pending live/HA proof |
| Deployments | request, target, status | `DeploymentService` map | No | No | No | No | Authoritative operational state / BLOCKER |
| Runtime instances/jobs | lifecycle/status/workload/result/cancel | `SqliteDurableRuntimeState` through `RuntimeLifecycleService` remote mode | Single-node durable | shared database/local processes | Yes | Production-oriented bounded adapter | Runtime subset READY; multi-host NOT PROVEN |
| Execution results/events | result/evidence/usage/error/recovery projection | SQLite job and runtime event rows | Single-node durable | shared database/local processes | Yes | Production-oriented bounded adapter | Durable/idempotent; workload side effects remain at-least-once |
| Workers | registration, identity, capabilities, heartbeat, status | SQLite durable registry populated by authenticated remote workers | Single-node durable | shared database/local processes | Yes | Signed service-identity boundary | PARTIAL pending workload OIDC/mTLS and multi-host proof |
| Assignments/leases | dispatch intent, ownership epoch and lease | SQLite assignment table plus CAS/fencing | Single-node durable | shared database/local processes | Yes | Durable remote dispatcher authority | READY for certified topology |
| Administrative audit | correlated events | `AuditService` over durable `AuditEventStore` in the HTTP server | Single-node | No | Yes | No shared append service | Durable functional projection / CRITICAL residuals |
| Legacy workflow receipts | execution receipts | local JSONL | Local-durable | No | Yes on same volume | No shared store | Acceptable DEV evidence, not production source |
| Legacy telemetry | events | memory or local JSONL | Local-durable when JSONL | No | Same volume only | No exporter | Acceptable DEV evidence, not operations |
| Economics | quotes, reservations, usage, settlements, receipts | `EconomicStateStore`; SQLite in HTTP composition | Single-node | No | Yes | Production-oriented single-node adapter | PARTIAL / multi-instance NOT PROVEN |
| Settlement | provider-confirmed settlement records | `SettlementProvider`; SQLite in HTTP composition | Single-node | No | Yes | Production-oriented single-node adapter | PARTIAL / external provider not certified |
| Rate limiting | fixed-window network/principal/Tenant counters | `SqliteRateLimitStore` in HTTP composition; memory only explicit DEV/test | Single-node | Shared database connections | Yes | Production-oriented bounded adapter | PARTIAL / multi-host NOT PROVEN |
| Readiness | computed report | on-demand projection with context adapter signals and secret health | Computed | Per process | Recomputed | No full live composite gate | PARTIAL / HIGH |
| Tool/plugin installation | catalog/projections | seeded registries; mutation unsupported | No operational install state | No | Re-seeded | No | BACKEND_ONLY/PARTIAL / HIGH |

### State classifications

- **Acceptable ephemeral:** request correlation objects, derived read models and non-authoritative caches that can be rebuilt from durable truth.
- **Test implementation:** in-memory stores explicitly injected by tests.
- **Development implementation:** local JSONL, local filesystem and local workers selected only in a named development profile.
- **Authoritative production state:** tenant, agent, deployment, runtime, job, audit and economic records. These require durable shared adapters before production.

`createAcsHttpServer` now selects durable administrative, secret-catalog, economic, HTTP rate-limit and remote-runtime adapters explicitly. Direct `createControlPlaneContext` callers remain development/local unless the corresponding durable options/paths are supplied. `adapterProfile: "production"` rejects insecure secret/economic/rate-limit/runtime adapters, non-production user/worker identity and wildcard/missing CORS configuration instead of silently selecting development fallbacks.

## Production-adapter inventory

| Capability | Contract/interface | Current active adapter | Production adapter exists? | Default? | Operationally validated? | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant repository | `TenantRepository` | atomic filesystem adapter in HTTP composition; memory by explicit context choice | Single-node adapter only | HTTP: yes | Restart/serialization tests | ACS-ORG-001 PARTIAL |
| Membership repository | `TenantMembershipRepository` with atomic `saveMany` | atomic filesystem adapter in HTTP composition | Single-node adapter only | HTTP: yes | Restart/ownership/revision tests | ACS-ORG-001 PARTIAL |
| Governance repository | `TenantGovernanceRepository` | atomic filesystem adapter in HTTP composition | Single-node adapter only | HTTP: yes | Restart/policy/entitlement/limit tests | ACS-ORG-001 PARTIAL |
| Agent repository | revision repository/service | map-backed repository | No | Yes | Domain/API tests | ACS-ORG-001 |
| Deployment store | service map, no external store interface | map | No | Yes | Local integration only | ACS-ORG-001 |
| Runtime/job store | `SqliteDurableRuntimeState` / `DurableRuntimeCoordinator` | SQLite WAL runtime authority | Single-node shared-database adapter | Production remote: yes | restart, atomic claim, fencing, two-Control-Plane crash/recovery tests | ACS-ORG-005 RESOLVED / 019 PARTIAL |
| Secret store | `SecretStore` | DEV memory or selected `VaultSecretProvider` | Yes, Vault KV v2 | HTTP DEV: memory; production: explicit Vault required | Contract/restart/isolation tests; live service not run | ACS-ORG-002 PARTIAL |
| Secret metadata/credential store | `SecretMetadataStore` / `CredentialConnectionStore` | `SqliteSecretCatalog` in HTTP composition | Single-node adapter | HTTP: yes | Restart/serialization tests | ACS-ORG-002/019 PARTIAL |
| Secret storage boundary | `AcsSecretStorage` | `MockAcsSecretStorage` | No | Inspection only | Contract tests | ACS-ORG-002 |
| Economic state | `EconomicStateStore` | `SqliteEconomicStateStore` in HTTP composition | Single-node adapter | HTTP: yes | Restart/failure/tenant tests | ACS-ORG-007 PARTIAL |
| Settlement provider | `SettlementProvider` | `SqliteSettlementProvider` in HTTP composition; memory only explicit DEV | Single-node adapter | HTTP: yes | idempotency/restart/reconciliation tests | ACS-ORG-007 PARTIAL |
| Audit store | `AuditEventStore` consumed by `AuditService` | atomic filesystem adapter in HTTP composition; memory in explicit tests | Single-node adapter only | HTTP: yes | Restart/correlation tests | ACS-ORG-009 PARTIAL |
| Telemetry sink | `TelemetrySink` | memory/JSONL | No external adapter | Local runtime defaults JSONL | Local tests | ACS-ORG-011 |
| Identity validator | `HttpIdentityValidator` | `OidcJwtIdentityValidator` + `RemoteJwksProvider`; explicit DEV header adapter | Yes | Production: explicit OIDC required | signature/claims/rotation/real HTTP forged-header tests; live IdP unproven | ACS-ORG-003 RESOLVED |
| Rate limiter | `RateLimiter` / `RateLimitStore` | `SqliteRateLimitStore` in HTTP composition; memory explicit DEV/test | Single-node shared-database adapter | HTTP: yes | atomic two-instance, spoof, 429/outage and real-server tests | ACS-ORG-010 PARTIAL / 019 |
| Worker dispatcher | internal worker HTTP + durable claim | `RemoteExecutionWorker` pull protocol; local worker explicit DEV only | Production-oriented bounded adapter | Production remote: yes | signed identity, real HTTP and independent-process tests | ACS-ORG-004 RESOLVED |
| Queue/broker | durable job table/claim protocol | SQLite-backed worker pull; no external broker | Broker not required for current ownership model | Production remote: yes | queued backpressure, no-worker and recovery tests | ACS-ORG-019 PARTIAL |
| Observability exporter | inspection contract | disabled | No active implementation | Disabled | No | ACS-ORG-011 |
| Production target | engine/target contracts | local WSL sandbox target | No certified live target | Yes for DEV | Sandbox tests | ACS-ORG-006 |

## Identity and authorization trust chain

```text
untrusted HTTP request
        ↓
OIDC bearer + RS256/JWKS/issuer/audience/time validation
        ↓
AuthenticatedPrincipal from signed sub
        ↓
optional signed tenant binding + configured platform claim/value
        ↓
existing TenantMembership / AdministrativeAuthority
        ↓
governance and operation
```

The production HTTP chain now has a trusted first step. Therefore:

- **Can an untrusted HTTP client forge actor identity through `x-acs-*` headers?** No in OIDC mode; real-server negative tests pass.
- **Can an untrusted HTTP client forge `platform_admin` or global authority?** No; only the configured trusted claim/value maps to platform authority.
- **Does cross-tenant domain enforcement exist?** Yes.
- **Is a live external IdP deployment certified?** No; Identity remains PARTIAL pending environment-specific acceptance.

## Restart survivability

| Event | Current expected behavior |
| --- | --- |
| ACS process restarts | Tenant administration, audit, secret metadata/references, economics and runtime job/worker/assignment/result state recover. A second Control Plane can continue runtime recovery; Agent/deployment maps still disappear. |
| Remote worker process is lost | Registration and ownership remain durable; after heartbeat/lease expiry the job is recovered, requeued or failed by attempt policy with a new fencing epoch on reassignment. |
| One Control Plane process dies while another remains | The SQLite runtime store and recovery coordinator continue to serve/repair runtime ownership. Other administrative/Agent/deployment adapters do not yet have equivalent shared multi-process proof. |
| Local JSONL volume survives | Legacy workflow receipts/telemetry remain readable on that volume, but are not the active Product API domain source and are not replica-shared. |
| Vault-backed secret context restarts | Metadata/reference reloads from SQLite and material resolves again from the external provider for the owning Tenant. |
| Secret memory store restarts | DEV-only raw values are lost; production profile refuses this adapter. |
| Filesystem secret store is used | Values survive on one volume but remain local plaintext and unavailable to other replicas. |

## Multi-replica baseline

The runtime and rate-limit subsets now support multiple local processes over one SQLite database:

- atomic transaction/CAS protects runtime ownership;
- durable worker registrations, leases and fencing are shared;
- two ACS processes and two worker processes pass contention/recovery;
- shared rate-limit counters were previously proven by C02.

Other mutable service maps, administrative snapshots and local filesystem stores remain single-node. Multi-host database access, network partitions and managed failover are unproven. Horizontal scaling is therefore **PARTIAL**, not globally certified.

## AEES-D acceptance evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| Durable lifecycle/revision/restart | PASS | `s49`, new store instance reloads all job/worker/assignment/result/event state |
| Atomic ownership | PASS | two store instances contend; one active assignment wins |
| Lease/fencing/stale owner | PASS | expired token 1 is rejected after token 2 completes |
| Signed worker service identity | PASS | forged/invalid worker identity and capability escalation denied |
| Independent execution | PASS | two Control Planes and two worker PIDs complete real remote jobs |
| Worker crash/orphan recovery | PASS | killed worker expires; job requeues and completes on a new worker |
| Control Plane restart | PASS | replacement process reloads/reconciles shared runtime state |
| Duplicate result | PASS | stable terminal revision/effect for same idempotency key |
| Cancellation race | PASS | commit ordering produces one deterministic terminal state |
| No eligible worker/backpressure | PASS | incompatible work remains durablely queued without an assignment |
| Multi-host/network partition | NOT PROVEN | acceptance is local multi-process over one SQLite file |

## B01 acceptance evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| Tenant lifecycle/history restart | PASS | new store instance reloads lifecycle timestamps and revisions; revision continues after reload |
| Membership/ownership restart | PASS | unique owner, roles/status and atomic ownership batch survive reload |
| Governance/entitlements/limits restart | PASS | policy, default deny, values, timestamps and continuing revisions survive reload |
| Administrative audit restart | PASS | event/correlation/tenant/revision fields remain queryable after reload |
| Persistence write failure | PASS | atomic write failure throws `ACS_ADMINISTRATIVE_STATE_PERSISTENCE_FAILED` and does not update the in-process snapshot |
| Corrupt persistence input | PASS | startup fails explicitly; there is no silent fallback to memory |
| Multi-instance consistency | NOT PROVEN | local snapshot has no distributed transaction, lock or refresh mechanism |
| HTTP `GET/POST/PUT/PATCH/DELETE` entry compatibility | PASS | real `createAcsHttpHandler` integration test; zero unexpected `405` in selected declared routes |
| Runtime `start/stop` handler reachability | PASS | handlers execute before unsupported-operation guards; wrong method remains `405` |

## B02 acceptance evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| Vault create/resolve/rotate/revoke | PASS | KV v2 transport contract and catalog lifecycle tests |
| Secret Tenant isolation | PASS | forged/cross-Tenant read, rotate and revoke are denied |
| Secret value exposure | PASS | zero value occurrence in metadata, audit, errors and diagnostic request capture |
| Secret restart resolution | PASS | new catalog/provider/registry context resolves the current version |
| Production fallback safety | PASS | production profile rejects memory secret/economic adapters |
| Economic restart | PASS | quotes, reservation, usage, settlement and receipt reload from SQLite |
| Settlement idempotency | PASS | repeated key returns one stable settlement and one provider effect |
| Crash reconciliation | PASS | provider-confirmed/local-missing projection repairs once, then zero |
| Provider/persistence false success | PASS | failed provider or projection commit returns failure; no local receipt/settlement false success |
| Multi-instance/live provider | NOT PROVEN | SQLite is single-node; external Vault was exercised with a deterministic transport, not a live HA deployment |

## Readiness level model

### Level 1 — Development Ready

Criteria:

- local setup starts with documented dependencies;
- deterministic fixtures and sandbox operations work;
- unit/domain/route tests pass;
- no production claim is made.

**Current status: READY**, with the official `dist` build currently affected by the workspace `EROFS` environment caveat.

### Level 2 — Integration Ready

Criteria:

- Product API and UI complete supported flows against real application boundaries;
- external development services can be connected;
- failures are semantic and correlated;
- adapters may be non-production but are explicit.

**Current status: PARTIAL.** HTTP methods, durable adapter patterns, trusted identity/edge and remote runtime execution exist, but split Control Plane, unsupported composition, external diagnostics and incomplete operator recovery journeys remain.

### Level 3 — Operational Ready

Criteria:

- trusted identity and tenant scope;
- durable shared authoritative state;
- supported secrets lifecycle;
- remote execution and durable job recovery;
- operator-visible diagnostics and remediation;
- restart and multi-instance proof.

**Current status: BLOCKED.** Milestone D's backend runtime prerequisite is met, but B residuals and E/F operator/diagnostic gates remain.

### Level 4 — Production Ready

Criteria:

- all Operational Ready gates;
- production target and controlled rollout/rollback;
- external telemetry/alerts and dependency-aware traffic readiness;
- security, capacity and failure acceptance;
- approved production adapter configuration with no DEV fallback.

**Current status: BLOCKED.** Milestones G and H may certify it only after all prerequisites pass.

## Why current `ready` labels are insufficient

The readiness report still keeps `productionReady` false. AEES-D now derives runtime-store, remote-dispatch, durable-worker and recovery-coordinator signals from the active context rather than treating a local worker as distributed proof. Milestone E must still turn these bounded signals into dependency-aware traffic readiness and external operator diagnostics; component reachability does not imply global Operational or Production Readiness.

## Baseline decision

No production deployment guard may be removed based on this document alone. The baseline is a dependency map: durable state and trusted identity precede remote execution; remote execution and external diagnostics precede production deployment; complete UX and final acceptance close the operational claim.
