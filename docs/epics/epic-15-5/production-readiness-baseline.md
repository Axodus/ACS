# Production Readiness Baseline

**Assessment date:** 2026-08-15

**Source revision:** `ed46412` plus B01/B02/C01 implementation evidence

**Overall classification:** **Development Ready / Integration Ready PARTIAL / Operational Ready BLOCKED / Production Ready BLOCKED**

This baseline evaluates the active composition, not only interfaces or milestone acceptance. `NOT PROVEN` is used when architecture or tests exist but no operational evidence demonstrates the required topology.

## Dimension baseline

| Dimension | Status | Evidence-based conclusion | Blocking findings |
| --- | --- | --- | --- |
| Identity | PARTIAL | Production OIDC/JWT validation and trusted principal/platform mapping pass deterministic and real-HTTP tests; live IdP/JWKS deployment evidence remains. | live-provider acceptance |
| Security | PARTIAL | Tenant rules, redaction, Vault and trusted HTTP identity exist; live managed-service identity, distributed rate limiting and edge trust are not production-certified. | ACS-ORG-002, 010, 013 |
| Secrets | PARTIAL | Vault KV v2 plus durable metadata/reference catalog is selectable and production fallback fails closed; live provider/HA/service-identity and shared catalog proof remain. | ACS-ORG-002, 016, 019 |
| Persistence | PARTIAL | Tenant Administration, audit, secret metadata/references and economics survive a single-node restart; Agents, deployments, runtime and jobs remain process-local and no shared multi-instance store is proven. | ACS-ORG-001, 009, 019 |
| Runtime | PARTIAL | Sandbox lifecycle and engine adapters work; durable run state and recovery do not. | ACS-ORG-005, 017 |
| Distributed execution | NOT PROVEN | Worker contracts exist; only same-process local execution is active. | ACS-ORG-004, 005 |
| Deployment | BLOCKED | Sandbox deployment works; staged/live are intentionally rejected. | ACS-ORG-006 |
| Observability | BLOCKED | Evidence projections exist; no external exporter, HTTP telemetry, raw logs or traces. | ACS-ORG-009, 011, 012 |
| Economics | PARTIAL | Durable SQLite economic/settlement adapters, idempotency and reconciliation pass; shared/external provider and production financial policy remain unproven. | ACS-ORG-007, 019 |
| Audit | PARTIAL | Canonical events and Tenant history now survive restart on the selected single-node store; replica sharing, retention/tamper controls and transactional outbox semantics remain unproven. | ACS-ORG-009 |
| Product API | PARTIAL | HTTP method compatibility is restored and runtime start/stop routes are reachable; unsupported composition/execution journeys and production identity still block an operational claim. | ACS-ORG-015, 017, 023 |
| Control Plane | PARTIAL | Main operational UX and Tenant Administration are browser-certified separately. | ACS-ORG-014–018 |
| UX journeys | BLOCKED | No complete authenticate-to-recover operator journey exists. | ACS-ORG-014–018, 021 |
| Recovery | BLOCKED | Diagnostics exist; durable reconcile/retry/cancel/operator remediation does not. | ACS-ORG-005, 018 |
| Testing | NOT PROVEN | Strong unit/route/browser coverage; production topology and failure modes are absent. | ACS-ORG-020 |

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
| Runtime instances | lifecycle/status | `RuntimeLifecycleService` map plus engine observation | No | No | No | No | Authoritative/projection mix / BLOCKER |
| Execution runs | request/status/result projection | runtime service map | No | No | No | No | Authoritative operational state / BLOCKER |
| Workers | registration, heartbeat, status | registry map | No | No | No | No remote control plane | Acceptable local DEV registry; production blocker |
| Assignments/leases | dispatch intent and lease | assignment-service maps | No | No | No | No durable dispatcher | Production blocker |
| Administrative audit | correlated events | `AuditService` over durable `AuditEventStore` in the HTTP server | Single-node | No | Yes | No shared append service | Durable functional projection / CRITICAL residuals |
| Legacy workflow receipts | execution receipts | local JSONL | Local-durable | No | Yes on same volume | No shared store | Acceptable DEV evidence, not production source |
| Legacy telemetry | events | memory or local JSONL | Local-durable when JSONL | No | Same volume only | No exporter | Acceptable DEV evidence, not operations |
| Economics | quotes, reservations, usage, settlements, receipts | `EconomicStateStore`; SQLite in HTTP composition | Single-node | No | Yes | Production-oriented single-node adapter | PARTIAL / multi-instance NOT PROVEN |
| Settlement | provider-confirmed settlement records | `SettlementProvider`; SQLite in HTTP composition | Single-node | No | Yes | Production-oriented single-node adapter | PARTIAL / external provider not certified |
| Rate limiting | request context only | caller-selected mock headers | No state | No | N/A | No | Contract/mock only / CRITICAL |
| Readiness | computed report | on-demand projection with context adapter signals and secret health | Computed | Per process | Recomputed | No full live composite gate | PARTIAL / HIGH |
| Tool/plugin installation | catalog/projections | seeded registries; mutation unsupported | No operational install state | No | Re-seeded | No | BACKEND_ONLY/PARTIAL / HIGH |

### State classifications

- **Acceptable ephemeral:** request correlation objects, derived read models and non-authoritative caches that can be rebuilt from durable truth.
- **Test implementation:** in-memory stores explicitly injected by tests.
- **Development implementation:** local JSONL, local filesystem and local workers selected only in a named development profile.
- **Authoritative production state:** tenant, agent, deployment, runtime, job, audit and economic records. These require durable shared adapters before production.

`createAcsHttpServer` now selects durable administrative, secret-catalog and economic adapters explicitly. Direct `createControlPlaneContext` callers remain memory-backed unless the corresponding durable options/paths are supplied. `adapterProfile: "production"` rejects insecure secret/economic adapters and non-production HTTP identity instead of silently selecting development fallbacks.

## Production-adapter inventory

| Capability | Contract/interface | Current active adapter | Production adapter exists? | Default? | Operationally validated? | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant repository | `TenantRepository` | atomic filesystem adapter in HTTP composition; memory by explicit context choice | Single-node adapter only | HTTP: yes | Restart/serialization tests | ACS-ORG-001 PARTIAL |
| Membership repository | `TenantMembershipRepository` with atomic `saveMany` | atomic filesystem adapter in HTTP composition | Single-node adapter only | HTTP: yes | Restart/ownership/revision tests | ACS-ORG-001 PARTIAL |
| Governance repository | `TenantGovernanceRepository` | atomic filesystem adapter in HTTP composition | Single-node adapter only | HTTP: yes | Restart/policy/entitlement/limit tests | ACS-ORG-001 PARTIAL |
| Agent repository | revision repository/service | map-backed repository | No | Yes | Domain/API tests | ACS-ORG-001 |
| Deployment store | service map, no external store interface | map | No | Yes | Local integration only | ACS-ORG-001 |
| Runtime/job store | service maps, no durable job adapter | maps | No | Yes | Local lifecycle tests | ACS-ORG-005 |
| Secret store | `SecretStore` | DEV memory or selected `VaultSecretProvider` | Yes, Vault KV v2 | HTTP DEV: memory; production: explicit Vault required | Contract/restart/isolation tests; live service not run | ACS-ORG-002 PARTIAL |
| Secret metadata/credential store | `SecretMetadataStore` / `CredentialConnectionStore` | `SqliteSecretCatalog` in HTTP composition | Single-node adapter | HTTP: yes | Restart/serialization tests | ACS-ORG-002/019 PARTIAL |
| Secret storage boundary | `AcsSecretStorage` | `MockAcsSecretStorage` | No | Inspection only | Contract tests | ACS-ORG-002 |
| Economic state | `EconomicStateStore` | `SqliteEconomicStateStore` in HTTP composition | Single-node adapter | HTTP: yes | Restart/failure/tenant tests | ACS-ORG-007 PARTIAL |
| Settlement provider | `SettlementProvider` | `SqliteSettlementProvider` in HTTP composition; memory only explicit DEV | Single-node adapter | HTTP: yes | idempotency/restart/reconciliation tests | ACS-ORG-007 PARTIAL |
| Audit store | `AuditEventStore` consumed by `AuditService` | atomic filesystem adapter in HTTP composition; memory in explicit tests | Single-node adapter only | HTTP: yes | Restart/correlation tests | ACS-ORG-009 PARTIAL |
| Telemetry sink | `TelemetrySink` | memory/JSONL | No external adapter | Local runtime defaults JSONL | Local tests | ACS-ORG-011 |
| Identity validator | `HttpIdentityValidator` | `OidcJwtIdentityValidator` + `RemoteJwksProvider`; explicit DEV header adapter | Yes | Production: explicit OIDC required | signature/claims/rotation/real HTTP forged-header tests; live IdP unproven | ACS-ORG-003 RESOLVED |
| Rate limiter | context contract only | mock header parser | No | Disabled | Mock tests | ACS-ORG-010 |
| Worker dispatcher | registry/assignment contracts | direct `LocalExecutionWorker` | No remote adapter | Yes | Same-process tests | ACS-ORG-004 |
| Queue/broker | none | none | No | N/A | No | ACS-ORG-004/005 |
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
| ACS process restarts | Tenant, membership/ownership, governance/entitlements/limits, audit, secret metadata/references and economic/settlement state recover from configured durable adapters. Agent, deployment, runtime and worker mutations still disappear. |
| Local worker process is lost | Registration, assignment and lease state disappear with the same ACS process; no durable orphan recovery exists. |
| One replica dies while another remains | The new local adapter has no cross-process lock or refresh protocol. Replica sharing and concurrent writers remain NOT PROVEN and must not be inferred from restart durability. |
| Local JSONL volume survives | Legacy workflow receipts/telemetry remain readable on that volume, but are not the active Product API domain source and are not replica-shared. |
| Vault-backed secret context restarts | Metadata/reference reloads from SQLite and material resolves again from the external provider for the owning Tenant. |
| Secret memory store restarts | DEV-only raw values are lost; production profile refuses this adapter. |
| Filesystem secret store is used | Values survive on one volume but remain local plaintext and unavailable to other replicas. |

## Multi-replica baseline

The active architecture assumes a single process:

- mutable global/service maps are used as authority;
- worker and target registries are local;
- rate-limit state is absent;
- JSONL and filesystem stores assume a local volume;
- no distributed lock, transactional uniqueness or idempotent command store protects concurrent mutations;
- no acceptance suite starts two ACS instances against shared state.

Horizontal scaling is therefore **NOT PROVEN** and structurally unsafe for authoritative mutations.

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

**Current status: PARTIAL.** HTTP methods, durable adapter patterns and selected Product API flows exist, but trusted identity, split Control Plane, unsupported composition and incomplete execution/recovery journeys remain.

### Level 3 — Operational Ready

Criteria:

- trusted identity and tenant scope;
- durable shared authoritative state;
- supported secrets lifecycle;
- remote execution and durable job recovery;
- operator-visible diagnostics and remediation;
- restart and multi-instance proof.

**Current status: BLOCKED.** Milestones B–F are required.

### Level 4 — Production Ready

Criteria:

- all Operational Ready gates;
- production target and controlled rollout/rollback;
- external telemetry/alerts and dependency-aware traffic readiness;
- security, capacity and failure acceptance;
- approved production adapter configuration with no DEV fallback.

**Current status: BLOCKED.** Milestones G and H may certify it only after all prerequisites pass.

## Why current `ready` labels are insufficient

The existing readiness report correctly keeps `productionReady` false, but it combines live probes with hardcoded adapter facts and can show a local worker/target as “Distributed Runtime readiness: ready”. `health` endpoints identify liveness/inspection, not traffic safety. Future implementation must expose the readiness level and dependency evidence explicitly; a component being reachable must not imply the platform is operational or production-ready.

## Baseline decision

No production deployment guard may be removed based on this document alone. The baseline is a dependency map: durable state and trusted identity precede remote execution; remote execution and external diagnostics precede production deployment; complete UX and final acceptance close the operational claim.
