# Architecture Gap Review

## Purpose

This review prevents a recurring classification error: a contract, interface, read model or unit test is not the same as an operational implementation. Each capability is evaluated across four layers:

```text
contract exists
→ implementation exists
→ production adapter exists and is selected
→ operational proof exists
```

## Capability matrix

| Capability | Contract | Implementation | Production adapter | Operational proof | Final assessment |
| --- | --- | --- | --- | --- | --- |
| Tenant lifecycle | Yes | Yes | Single-node durable adapter; no shared production database | Domain/API/browser plus restart/revision proof | PARTIAL |
| Membership/authority | Yes | Yes | Single-node durable adapter fed by trusted HTTP principal | Negative API/auth tests plus restart/atomic owner transfer proof | PARTIAL pending shared state/live IdP |
| Governance/limits/entitlements | Yes | Yes | Single-node durable adapter; no shared production database | Evaluator/enforcement, real HTTP method and restart proof | PARTIAL |
| Agent domain/lifecycle | Yes | Yes | No durable repository | Domain/Product API/browser evidence | PARTIAL |
| Composition resources | Yes | Read projections and compatibility | No mutable production catalog | Mutation journey absent | PARTIAL |
| Secret references | Yes | Tenant-scoped lifecycle plus durable metadata | Vault KV v2 provider; local catalog is single-node | Redaction, isolation, rotation/revoke and restart tests; live HA unproven | PARTIAL |
| Deployment lifecycle | Yes | Sandbox implementation | No production target | Sandbox tests | PARTIAL |
| Runtime lifecycle | Yes | Product API creates durable remote runtime jobs; read/cancel/event models exist | SQLite durable runtime store | restart/crash/fencing/process acceptance; multi-host unproven | READY for certified topology / PARTIAL globally |
| Worker registration/assignment | Yes | authenticated HTTP pull, durable registry/assignment/lease/fencing | SQLite shared-database adapter; signed service identity | two Control Planes/two workers, crash/reassignment/stale result proof | PARTIAL pending multi-host/workload identity |
| Audit events/read model | Yes | Durable single-node event store selected by HTTP server | No shared append/retention production service | Restart/correlation proof; replica/outbox unproven | PARTIAL |
| HTTP method contract | Yes | Server, CORS and route layer aligned for GET/POST/PUT/PATCH/DELETE | N/A | Real entry-handler integration tests | READY for method compatibility scope |
| Economics | Yes | Store-backed quotes/reservations/usage/settlement | SQLite economic/settlement adapters; no shared/external provider proof | Restart, idempotency, failure and reconciliation tests | PARTIAL |
| HTTP authentication | `HttpIdentityValidator` | OIDC JWT/JWKS validator plus explicit DEV adapter | Production-oriented adapter selected fail-closed | cryptographic/claims/key-rotation and real HTTP forged-header tests; live IdP unproven | PARTIAL |
| HTTP authorization | Yes | Yes after actor resolution | Depends on trusted identity | Domain/API negative tests | PARTIAL |
| Rate limiting | `RateLimiter` / `RateLimitStore` | fixed-window server boundary; SQLite active HTTP adapter, memory explicit DEV/test | Single-node shared-database adapter | atomic two-instance and real HTTP spoof/429/outage proof | PARTIAL |
| Telemetry | Event/sink contracts | Memory/JSONL | No external exporter | Local tests | PARTIAL |
| Readiness | Reports/read models | Computed inspection | No traffic gate | Report tests | PARTIAL |
| Main Control Plane | Yes | `.design/app-standalone` | N/A | EPIC-14 browser evidence | READY for accepted UX scope |
| Tenant Administration UI | Yes | `static` app | N/A | EPIC-15 browser evidence | READY for accepted UX scope; operational auth blocked |
| Recovery/remediation | Durable runtime cancel/recovery/event contracts | automatic lease/worker/orphan recovery; operator UX remains read-limited | SQLite recovery coordinator | worker/Control Plane crash and cancellation acceptance | PARTIAL |

## Existing architecture to preserve

- Tenant identity and tenant/workload isolation primitives.
- EPIC-15 Tenant, Membership, Administrative Authority, Governance, Entitlement and Limit contracts.
- Default-deny governance and explicit platform-versus-tenant authority.
- Product API as the external Control Plane boundary.
- Engine protocol and execution target abstraction.
- Worker registration/assignment types and explicit isolation scope.
- Audit correlation/redaction and administrative event categories.
- Economic authorization/receipt distinction from billing.
- EPIC-14 navigation, responsive and browser acceptance standards.

Later milestones must replace adapters and connect flows without introducing competing tenant, identity, governance, worker or audit models.

## Current active topology

```mermaid
flowchart TD
  Browser[Control Plane clients] -->|Bearer in production; explicit DEV headers locally| HTTP[ACS HTTP server]
  HTTP --> Identity[HttpIdentityValidator]
  Identity --> JWKS[Trusted issuer JWKS]
  HTTP --> Context[createControlPlaneContext]
  Context --> Tenant[Single-node durable tenant, membership and governance repositories]
  Context --> Agent[Map-backed agent and composition services]
  Context --> Deploy[Map-backed deployment service]
  Context --> Audit[Single-node durable AuditEventStore]
  Context --> Econ[SQLite economic state and settlement]
  Context --> SecretCatalog[SQLite non-secret catalog]
  SecretCatalog --> Secret[Vault KV v2 when selected; explicit DEV memory otherwise]
  Context --> Runtime[SQLite durable jobs, workers, assignments, leases and events]
  Runtime --> WorkerApi[Authenticated internal worker HTTP]
  WorkerApi --> RemoteWorker[Independent remote worker process]
  RemoteWorker --> Engine[Worker-owned OpenClaw engine/target]
  Context --> Diagnostics[Dependency-aware readiness and diagnostics]
  Context --> Telemetry[Structured logs, metrics and spans]
  RemoteWorker --> Telemetry
  Telemetry --> OTLP[External OTLP receiver]
```

This is a restart-safe, externally observable local multi-process runtime composition after AEES-E. Production HTTP identity and edge controls are validated, runtime execution no longer requires a same-process worker, and operational evidence leaves the diagnosed processes. The whole system is not a production topology because Agent/deployment and other aggregates remain process-local, local SQLite/snapshot adapters and the telemetry receiver are not multi-host certified, and service identity is not deployed workload OIDC/mTLS.

## AEES-E applied observability boundary

```mermaid
flowchart LR
  Request[HTTP request] --> Context[Server request and trace context]
  Context --> Job[Durable runtime job]
  Job --> Worker[Independent worker child span]
  Context --> Provider[OperationalTelemetryProvider]
  Worker --> Provider
  Provider --> Exporter[Bounded OTLP HTTP/JSON exporter]
  Exporter --> Receiver[External receiver process]
  Dependencies[Identity, edge, secrets, state, economics, runtime, workers] --> Readiness[READY / DEGRADED / BLOCKED]
  Readiness --> Product[Public summary + authorized diagnostics]
```

The provider is a side channel, never domain authority. Production rejects disabled/memory exporters; a configured receiver outage degrades observability without rolling back durable state. Audit and telemetry retain separate semantics.

## AEES-D applied runtime boundary

```mermaid
flowchart LR
  Product[Product API runtime intent] --> Job[Durable ExecutionJob]
  Job --> Store[(SQLite runtime authority)]
  Worker[Independent authenticated worker] -->|register / heartbeat / claim| Internal[Internal worker HTTP]
  Internal --> Store
  Store -->|assignment + lease + fencing token| Worker
  Worker --> Engine[Worker-owned OpenClaw engine]
  Worker -->|idempotent fenced result| Internal
  Recovery[Recovery coordinator in competing Control Planes] --> Store
```

Delivery and ownership are separate. HTTP only carries claims and results. `runtime_assignments` plus a current lease and fencing token define ownership. A partial unique index and revision/status CAS prevent two active assignments; reassignment advances the job fencing epoch. Result writes validate the full worker/instance/assignment/lease/token tuple before committing.

The production profile rejects local runtime mode and non-production worker identity. Development retains the local engine path explicitly. SQLite is classified `SINGLE_NODE_DURABLE / SHARED_DATABASE_MULTI_INSTANCE / MULTI_HOST_NOT_PROVEN`.

## B01 applied boundaries

```mermaid
flowchart LR
  Domain[Tenant / Membership / Governance services] --> Repo[Aggregate repository interfaces]
  Repo --> Memory[Explicit in-memory test adapters]
  Repo --> Durable[DurableAdministrativeState]
  Durable --> File[Atomic single-node snapshot]
  Audit[AuditService] --> AuditStore[AuditEventStore]
  AuditStore --> Durable

  Client[Product API client] --> Server[HTTP method boundary]
  Server --> Router[Product API route matching]
  Router --> Handler[Semantic route handler]
```

The administrative file is updated by write-to-temporary-path plus atomic rename. The in-process snapshot is replaced only after the filesystem commit succeeds. Membership ownership transfer uses repository `saveMany`, so the previous and next owner are persisted in one snapshot replacement. A corrupt file fails startup, and a write failure propagates instead of falling back to memory.

These semantics provide restart survivability and per-file atomicity on one node. They do not provide distributed locking, live reload, cross-instance optimistic concurrency, schema migration tooling or a transaction that combines the resource commit and subsequent audit append. The architecture classification is therefore `SINGLE_NODE_DURABLE / MULTI_INSTANCE_NOT_PROVEN`.

## B02 applied boundaries

```mermaid
flowchart LR
  Credential[CredentialConnectionRegistry] --> Catalog[SqliteSecretCatalog]
  SecretCommand[Secret lifecycle command] --> Provider[VaultSecretProvider]
  Provider --> Catalog
  Provider --> Vault[Vault KV v2 material]

  Economic[EconomicService] --> State[EconomicStateStore]
  State --> SqliteState[SqliteEconomicStateStore]
  Economic --> Settlement[SettlementProvider]
  Settlement --> SqliteProvider[SqliteSettlementProvider]
  SqliteProvider --> Reconcile[Provider-to-projection reconciliation]
  Reconcile --> SqliteState
```

Secret material and metadata are deliberately separate. The Vault adapter never serializes raw material into the ACS catalog, API or audit event. The SQLite catalog remains the Tenant ownership/version authority, which means its single-node limitation is part of the finding status.

Economic settlement also has two authorities: provider-confirmed effects and the local operational projection. Idempotency prevents duplicate provider effects; an atomic local commit updates settlement, reservation and receipt together; reconciliation repairs a provider-success/local-failure crash window.

## C01 applied boundary

```mermaid
flowchart LR
  Client[Untrusted HTTP client] --> Bearer[Bearer credential]
  Bearer --> Validator[OidcJwtIdentityValidator]
  Validator --> JWKS[RemoteJwksProvider]
  Validator --> Principal[AuthenticatedPrincipal]
  Principal --> Context[Trusted AcsAuthContext]
  Context --> Authority[Existing Tenant / platform authority]
  Authority --> Governance[Governance and operation]
  Governance --> Audit[Authenticated actor attribution]
```

The validator retains only the canonical principal, issuer/method summary, scopes, optional Tenant binding and explicit platform flag. Raw credentials and full claims do not cross the boundary. The DEV header adapter is separate and rejected by production composition. Downstream enforcement no longer maps absent/disabled auth or actor type names to global authority.

## Target topology boundaries

```mermaid
flowchart TD
  Client[Authenticated Control Plane client] --> Edge[Edge controls and trusted identity]
  Edge --> API[Product API application boundaries]
  API --> Authority[Administrative authority and governance]
  API --> Stores[Durable tenant/agent/deployment/runtime repositories]
  API --> Secrets[Managed secret provider]
  API --> Audit[Durable audit append path]
  API --> Dispatcher[Durable dispatcher/queue]
  Dispatcher --> Workers[Authenticated remote workers]
  Workers --> Targets[Certified execution targets]
  API --> Economics[Durable economic records and settlement adapter]
  API --> Telemetry[External logs/metrics/traces]
  Stores --> Readiness[Dependency-aware readiness gate]
  Secrets --> Readiness
  Dispatcher --> Readiness
  Audit --> Readiness
  Economics --> Readiness
  Telemetry --> Readiness
```

The diagram is normative only at the boundary level. It does not prescribe a database, cloud, broker or identity vendor.

## Write/read boundaries

| Boundary | Writes | Reads | Rule |
| --- | --- | --- | --- |
| Product API | semantic commands only | stable administrative/operational read models | UI never calls repositories or workers directly. |
| Identity edge | validated principal and scope | token/upstream identity metadata | caller headers cannot construct authority. |
| Domain/application services | lifecycle, membership, governance, deployment and run transitions | aggregates/revisions | business rules remain here. |
| Durable repositories | authoritative state and idempotency records | versioned state | no cache becomes authority. |
| Dispatcher | job, lease, attempt, result transitions | worker/job status | no side effect before durable dispatch intent. |
| Workers | execution result/heartbeat | assigned work and leased secrets | no cross-tenant implicit context. |
| Audit | append-only attributable event | minimized tenant-scoped history | audit failure semantics are explicit. |
| Observability | structured operational signals | dashboards/alerts/diagnostics | telemetry is not authoritative domain state. |

## Gap clusters and root causes

### Development composition is the only composition

`createAcsHttpServer` now selects durable administrative, secret-catalog, economic, rate-limit and remote-runtime state explicitly; direct contexts use memory/local behavior unless durability/remote mode is requested. The production profile validates secrets, economics, OIDC, rate limiting, CORS, durable runtime and signed worker identity rather than accepting insecure fallbacks. Agents, deployments and shared multi-host state remain open under ACS-ORG-001/019.

### Trust starts too late

Tenant-scoped authorization and governance are correctly modeled, but the incoming actor is not authenticated. The target is not a new RBAC model; it is a trusted principal boundary feeding the existing authority model.

### Runtime contracts are connected to durable scheduling

AEES-D connects the normal Product API runtime path to durable jobs and worker claims. The worker transport cannot grant ownership; it can only request an atomic claim and present the resulting lease/fencing identity. Runtime result and recovery state are inspectable through Product API read models. The residual gap is operational UX and multi-host infrastructure, not a missing scheduling boundary.

### Evidence is derived from ephemeral truth

Administrative audit, secret metadata/references, economics and runtime ownership survive single-node restart. AEES-E now exports operational signals and computes dependency-aware diagnostics from those boundaries. Exporters do not make Agent/deployment projections durable; residual Milestone B work must still establish their authoritative truth, and Milestone F must expose supported operator remediation.

### Surfaces are accepted independently, not as one journey

EPIC-14 and EPIC-15 browser evidence remains valid for their routes. Operational readiness requires a single authenticated journey across tenant administration, agent configuration, execution, diagnostics and recovery. This is integration work, not a redesign.

## Sandbox deployment gate prerequisites

Production deployment may be introduced only after all of the following are certified:

1. durable tenant, agent, deployment and runtime state;
2. managed secrets with rotation and worker-safe delivery;
3. trusted identity and explicit platform authority;
4. distributed rate limiting and edge hardening;
5. authenticated remote worker dispatch with durable jobs and lease fencing;
6. target health, rollout, rollback and failure recovery;
7. durable audit and economic reconciliation;
8. external logs/metrics/traces and dependency-aware readiness;
9. operator UX for deploy, observe, diagnose and recover;
10. restart, multi-instance, security and browser acceptance.

The implementation task is therefore “add a certified production target behind a readiness gate”, not “remove `sandbox` checks”.

## Boundary decisions for future milestones

- **Database/vendor choice:** SQLite is adopted for bounded single-node B02 durability; a shared production database remains an OPEN DECISION at the B03/B04 gate. Required characteristics are transactional revisions, tenant partitioning, append support and multi-instance access.
- **Secret provider:** Vault KV v2 is the implemented production-oriented provider boundary. Live deployment/HA/service identity and whether metadata moves to a shared database remain OPEN DECISIONS; local filesystem is development-only.
- **Identity provider deployment:** protocol decision is CLOSED for the active HTTP boundary: interoperable OIDC/JWT with RS256/JWKS and server-owned verification. Vendor/live issuer selection and deployment acceptance remain environment decisions.
- **Rate limiter:** implementation decision CLOSED for the active single-node HTTP composition: fixed-window `RateLimiter`, hashed server-derived keys and atomic SQLite shared-database store. A live multi-host/global provider and deployment topology remain H/ACS-ORG-019 acceptance decisions.
- **Dispatcher/broker:** implementation decision CLOSED for the certified topology: authenticated HTTP worker pull over SQLite durable ownership. A broker is not required for correctness. Multi-host storage/transport and whether a later deployment adopts a managed queue remain H/environment decisions; ownership continues to live in the runtime store.
- **Telemetry protocol:** decision CLOSED for the active boundary: bounded OTLP HTTP/JSON through a vendor-neutral provider. Collector/backend vendor, multi-host deployment, retention and alert routing remain environment/H decisions; a generic observability platform is not part of AEES-E.
- **Control Plane consolidation:** OPEN DECISION at Milestone F gate between one build and secure federated surfaces. One actor/session/navigation contract is mandatory.

## Architecture acceptance rule

A capability advances from `PARTIAL` to `READY` only when the production adapter is selected in an explicit non-development profile and its required operational proof passes. Documentation, interfaces and static read models remain necessary but insufficient evidence.
