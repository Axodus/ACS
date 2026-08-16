# Operational Gap Inventory

This is the canonical finding register. The original A01 inventory reflects commit `b104895`; B01, B02, C01, C02, AEES-D and AEES-E status/evidence were updated through 2026-08-16 against the implementation based on `ed46412`. `OPEN — VERIFIED` means the behavior remains confirmed; `PARTIALLY_RESOLVED` records bounded evidence without overstating the residual topology.

## Severity model

- **BLOCKER:** prevents real operation or production readiness of a central capability.
- **CRITICAL:** creates severe security, state-loss, isolation or availability risk.
- **HIGH:** leaves a significant workflow, diagnosis or remediation gap.
- **MEDIUM:** relevant but bounded or temporarily avoidable.
- **LOW:** hygiene or polish without central operational impact.
- **ACCEPTABLE_DEFERRED:** consciously outside the approved operational baseline.
- **NOT_A_GAP:** intentional implementation appropriate to its declared environment.

## Taxonomy

Findings use a primary area plus affected areas from this controlled set:

`INFRASTRUCTURE`, `PERSISTENCE`, `SECURITY`, `IDENTITY`, `EDGE`, `RUNTIME`, `DISTRIBUTED_EXECUTION`, `OBSERVABILITY`, `ECONOMICS`, `GOVERNANCE`, `PRODUCT_API`, `CONTROL_PLANE`, `UX`, `OPERATIONS`, `RECOVERY`, `TESTING`, `DEPLOYMENT`, `DOCUMENTATION`.

## Summary

| ID | Primary area | Finding | Severity | Milestone | Status |
| --- | --- | --- | --- | --- | --- |
| ACS-ORG-001 | PERSISTENCE | Active authoritative Control Plane state is process-local | BLOCKER | B/D | PARTIALLY_RESOLVED — runtime subset resolved by AEES-D |
| ACS-ORG-002 | SECURITY | No production-grade secret adapter is available or active | BLOCKER | B | PARTIALLY_RESOLVED — B02 |
| ACS-ORG-003 | IDENTITY | HTTP actor and platform authority are forgeable by the caller | BLOCKER | C | RESOLVED — C01 |
| ACS-ORG-004 | DISTRIBUTED_EXECUTION | Operational execution uses a same-process local worker, not remote dispatch | BLOCKER | D | RESOLVED — AEES-D |
| ACS-ORG-005 | RECOVERY | Runtime jobs, assignments and leases lack durable recovery semantics | BLOCKER | D | RESOLVED — AEES-D |
| ACS-ORG-006 | DEPLOYMENT | Production deployment is blocked by a deliberate sandbox-only gate | BLOCKER | G | OPEN — VERIFIED |
| ACS-ORG-007 | ECONOMICS | Economic settlement and records use an in-memory provider and maps | BLOCKER | B | PARTIALLY_RESOLVED — B02 |
| ACS-ORG-008 | PRODUCT_API | Real HTTP rejects Product API `PUT` and `DELETE` administration routes | BLOCKER | B | RESOLVED — B01 |
| ACS-ORG-009 | OBSERVABILITY | Administrative and operational audit history is process-local | CRITICAL | B | PARTIALLY_RESOLVED — B01 |
| ACS-ORG-010 | EDGE | Rate limiting is disabled or caller-selected mock state | CRITICAL | C | PARTIALLY_RESOLVED — C02 |
| ACS-ORG-011 | OBSERVABILITY | External telemetry, HTTP telemetry, raw logs and traces are unavailable | CRITICAL | E | RESOLVED — AEES-E active boundary |
| ACS-ORG-012 | OPERATIONS | No dependency-aware production traffic readiness gate exists | HIGH | E | RESOLVED — AEES-E active boundary |
| ACS-ORG-013 | EDGE | HTTP edge controls are incomplete for an exposed service | HIGH | C | RESOLVED — C02 |
| ACS-ORG-014 | CONTROL_PLANE | Tenant administration and the main Control Plane are separate applications | HIGH | F | RESOLVED — secure federation/browser navigation certified |
| ACS-ORG-015 | CONTROL_PLANE | Agent composition changes remain read-only or unsupported | HIGH | F | RESOLVED — supported Agent composition journey certified |
| ACS-ORG-016 | SECURITY | Secret configuration, rotation and revocation lack a supported operator journey | HIGH | F | RESOLVED — write-only lifecycle certified |
| ACS-ORG-017 | RUNTIME | Execution routes and the dispatch/result/recovery journey are incomplete | HIGH | D/F | RESOLVED — supported sandbox execution UX certified |
| ACS-ORG-018 | RECOVERY | Failure surfaces diagnose but do not provide governed remediation | HIGH | F | PARTIALLY_RESOLVED — recovery/cancel UX active; infrastructure remediation external |
| ACS-ORG-019 | INFRASTRUCTURE | Multi-replica correctness is structurally unproven | CRITICAL | B/D | PARTIALLY_RESOLVED — local multi-process proven |
| ACS-ORG-020 | TESTING | Acceptance does not cover restart, multi-process, remote or provider failures | HIGH | H | PARTIALLY_RESOLVED — runtime topology covered |
| ACS-ORG-021 | OPERATIONS | Local filesystem, local engine and environment editing are hidden prerequisites | HIGH | B/D/F | PARTIALLY_RESOLVED — certified journey shell-free; provider/worker deployment remains engineering scope |
| ACS-ORG-022 | DOCUMENTATION | Public/demo readiness language can exceed the active operational evidence | MEDIUM | F | RESOLVED — active surfaces topology-qualify readiness |
| ACS-ORG-023 | PRODUCT_API | Legacy projections still describe tenant administration as future scope | MEDIUM | F | RESOLVED — active navigation and projections reconciled |
| ACS-ORG-024 | DOCUMENTATION | Tracked backup source files create divergent implementation references | LOW | A/F | RESOLVED — tracked backups removed and ignored |

## Findings

### ACS-ORG-001 — Active authoritative Control Plane state is process-local

- **Area:** PERSISTENCE; affects TENANT, GOVERNANCE, RUNTIME, DEPLOYMENT, PRODUCT_API.
- **Severity / status:** **BLOCKER**, PARTIALLY_RESOLVED — B01/B02/AEES-D; runtime subset resolved.
- **Evidence:** `src/http/control-plane-context.ts:277-391`; `src/control-plane/agent-service.ts:56-57,160-161`; `src/control-plane/tenant-domain.ts:108-109`; `src/control-plane/tenant-membership.ts:166-167`; `src/control-plane/tenant-governance.ts:392-393`; `src/control-plane/deployment-service.ts:52`; `src/control-plane/runtime-lifecycle-service.ts:79-80`.
- **Current behavior after AEES-D:** `createAcsHttpServer` explicitly selects durable Tenant Administration/audit plus SQLite secret metadata/credential, economic/settlement and runtime adapters. Runtime jobs, workers, assignments, leases, results and recovery events survive context/process restart and are shared by multiple local Control Plane processes. Agent, composition and deployment authority remains process-local.
- **Operational impact:** restart loses authoritative administration and operational state; two replicas can return divergent answers and accept conflicting mutations.
- **B01 evidence:** `src/control-plane/durable-administrative-state.ts`; repository wiring in `src/http/control-plane-context.ts`; restart, ownership-batch, serialization, corruption and write-failure coverage in `tests/s45-epic-15-5-durable-http-contract.test.mjs`.
- **AEES-D evidence:** `src/workers/durable-runtime-state.ts`, runtime composition in `src/http/control-plane-context.ts` and `tests/s49`–`s51`; two Control Planes and two workers shared atomic SQLite ownership and recovered after process loss.
- **Residual risk:** administrative snapshots and several aggregates remain single-node/unshared; the runtime database is multi-process capable on one host but multi-host access, migrations and managed database topology are not proven.
- **Required target state:** transactional, tenant-scoped repositories for authoritative resources, explicit migrations, optimistic concurrency/idempotency and a composition profile that refuses production startup when durable adapters are absent.
- **Dependencies / milestone:** B03 must address remaining Agent/deployment/runtime/job authority; shared multi-instance certification remains H scope. B02 adapters remain single-node or externally managed with local metadata.
- **Acceptance evidence:** restart survival, two-instance consistency, conflict tests, migration/rollback evidence and no production composition using memory authority.

### ACS-ORG-002 — No production-grade secret adapter is available or active

- **Area:** SECURITY; affects PERSISTENCE, RUNTIME, DEPLOYMENT.
- **Severity / status:** **BLOCKER**, PARTIALLY_RESOLVED — B02.
- **Evidence:** `src/intelligence/secret-store.ts`; `src/intelligence/vault-secret-provider.ts`; adapter selection in `src/http/control-plane-context.ts`; `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`.
- **Current behavior after B02:** a Vault KV v2 provider stores material externally; a SQLite catalog persists non-secret lifecycle metadata and credential references; production profile composition rejects memory/filesystem fallback. Rotation, logical revocation, provider health, Tenant isolation and restart resolution are implemented. DEV memory/filesystem adapters remain explicit.
- **Operational impact:** the original process-memory/plaintext-only production path is removed when production profile is selected. Live Vault service identity/policy, HA behavior and a replica-shared metadata catalog are not yet certified, so the production blocker is reduced but not closed.
- **Root cause:** the provider boundary existed only as basic put/get storage and had no production selection or durable catalog.
- **Required target state:** one canonical secret contract with a managed encrypted adapter, tenant-scoped authorization, rotation/versioning, audit, availability health and runtime lease/injection semantics. Raw values must never enter API/UI/audit records.
- **B02 evidence:** external-material fake transport exercises the real KV v2 contract; a new catalog/context reload preserves version/reference resolution; cross-Tenant access, rotation, revocation, provider failure and value-exposure tests pass. No live external Vault was provisioned.
- **Residual risk:** `SqliteSecretCatalog` is single-node and multi-instance behavior is not proven; provider authentication still uses configuration rather than the future trusted service-identity milestone; runtime propagation and Control Plane secret lifecycle UX remain open.
- **Dependencies / milestone:** trusted service identity in C, operator UX in F and multi-instance/live-provider certification in H.
- **Acceptance evidence required to close:** live managed-provider integration, service-identity/policy proof, HA/unavailable-provider behavior, replica-shared catalog or external metadata, rotation/revoke negative matrix and secret-exposure scan.

### ACS-ORG-003 — HTTP actor and platform authority are forgeable by the caller

- **Area:** IDENTITY; affects SECURITY, GOVERNANCE, TENANT.
- **Severity / status:** **BLOCKER**, RESOLVED — C01.
- **Previous evidence:** the HTTP server used `parseMockAuthContext`; routes/enforcement derived platform authority from caller-selected actor type or missing/disabled auth.
- **Current behavior after C01:** `createAcsHttpHandler` authenticates protected requests through `HttpIdentityValidator`. `OidcJwtIdentityValidator` verifies RS256 signature/JWKS key, issuer, audience, expiration/not-before and subject. It ignores legacy identity/Tenant/platform headers. Platform authority requires one configured signed claim/value; normal tokens still require existing Tenant membership. Production rejects development identity or incomplete OIDC configuration.
- **Operational impact:** untrusted callers can no longer construct actor identity or `platform_admin` through request headers in the production OIDC composition. Authentication failure occurs before authority/governance evaluation.
- **C01 evidence:** `tests/s47-epic-15-5-trusted-http-identity.test.mjs` covers invalid-token categories, JWKS rotation, forged headers through the real HTTP server, platform mapping, cross-Tenant scope, suspended/removed membership, audit actor attribution and production fail-closed configuration.
- **Residual risk:** a live IdP/JWKS deployment, TLS/DNS availability and service identities are not certified by the deterministic adapter tests. C02 edge controls/rate limiting now pass; Milestone H live-topology acceptance remains open and does not reopen caller-header forgery.
- **Follow-up:** F authenticated UX and H live identity-provider/reverse-proxy acceptance.

### ACS-ORG-004 — Operational execution uses a same-process local worker, not remote dispatch

- **Area:** DISTRIBUTED_EXECUTION; affects RUNTIME, INFRASTRUCTURE.
- **Severity / status:** **BLOCKER**, RESOLVED — AEES-D.
- **Previous behavior:** `LocalExecutionWorker` called the engine inside the ACS process and the normal Product API runtime path did not connect to a remote dispatcher.
- **Current behavior:** production runtime start persists a job and returns pending. An independently authenticated worker process registers, heartbeats, atomically claims compatible work, executes through its own OpenClaw engine and submits a fenced/idempotent result over internal HTTP routes. Production rejects local runtime mode and development worker identity.
- **Evidence:** `src/workers/remote-worker.ts`, `src/workers/remote-worker-entrypoint.ts`, `src/http/routes/worker-runtime-routes.ts`, signed identity in `src/workers/worker-service-auth.ts`, and `tests/s50`/`s51`. The final run used distinct Control Plane PIDs 655813/655853 and worker PIDs 655867/655904; both initial jobs completed on worker processes.
- **Residual caveat:** service identity is an ACS signed credential and the shared runtime store is local SQLite. Workload OIDC/mTLS, multi-host network/storage and capacity acceptance remain H topology work. These do not reintroduce a same-process production fallback.

### ACS-ORG-005 — Runtime jobs, assignments and leases lack durable recovery semantics

- **Area:** RECOVERY; affects RUNTIME, DISTRIBUTED_EXECUTION.
- **Severity / status:** **BLOCKER**, RESOLVED — AEES-D.
- **Previous behavior:** jobs, worker records, leases and runtime records lived in maps with no restart-safe orphan recovery.
- **Current behavior:** SQLite persists canonical jobs, registrations, assignments, leases, fencing epochs, results, cancellation and runtime events. Claims and recovery use transactions plus status/revision CAS. Heartbeat/lease expiry marks workers offline, requeues eligible jobs, advances fencing on reassignment and terminates exhausted work.
- **Evidence:** `tests/s49-epic-15-5-durable-runtime-state.test.mjs` proves restart, atomic claim, fencing, cancellation, retry exhaustion and backpressure. `tests/s51-epic-15-5-distributed-runtime-acceptance.test.mjs` kills worker and Control Plane processes, recovers/reassigns the durable job, rejects token 1 after token 2 and preserves one terminal result.
- **Residual caveat:** physical workload effects are at-least-once across a crash after external execution but before durable result commit; fencing protects ACS authority, while external workload effects still require their existing idempotency contract. Multi-host recovery is not certified.

### ACS-ORG-006 — Production deployment is blocked by a deliberate sandbox-only gate

- **Area:** DEPLOYMENT; affects GOVERNANCE, RUNTIME.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED; the gate itself is an intentional safety control.
- **Evidence:** `src/control-plane/deployment-service.ts`; `src/control-plane/runtime-lifecycle-service.ts`; `src/engines/openclaw-engine-adapter.ts:96-136`; `src/http/routes/product-api-routes.ts:1609-1613,1839-1845`; local worker capabilities only include `sandbox`.
- **Current behavior:** non-sandbox deploy and runtime modes are rejected by governance, application service, engine adapter and worker capability checks.
- **Operational impact:** no supported staged/live target can be selected, deployed, observed, rolled back or recovered.
- **Root cause:** production prerequisites are knowingly absent; multiple layers enforce the safe default.
- **Required target state:** keep fail-closed semantics and add an evidence-backed production target only after durable state, managed secrets, trusted identity, remote workers, external diagnostics, economic reconciliation and rollback/recovery are certified.
- **Dependencies / milestone:** B–F are prerequisites; Milestone G.
- **Acceptance evidence:** signed readiness gate, target health, deploy/rollback proof, restart/recovery, audit and operator browser journey. Removing a string guard alone is not acceptance.

### ACS-ORG-007 — Economic settlement and records use an in-memory provider and maps

- **Area:** ECONOMICS; affects PERSISTENCE, AUDIT.
- **Severity / status:** **BLOCKER**, PARTIALLY_RESOLVED — B02.
- **Evidence:** `src/control-plane/neurons-economic-contract.ts`; `src/control-plane/durable-economic-state.ts`; adapter selection in `src/http/control-plane-context.ts`; `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`.
- **Current behavior after B02:** `EconomicService` delegates quote/reservation/usage/settlement/receipt truth to `EconomicStateStore`; `SqliteEconomicStateStore` and `SqliteSettlementProvider` survive restart. Settlement keys are idempotent, the local settlement projection commits atomically, and `reconcile()` repairs provider-confirmed records missing after a crash window.
- **Operational impact:** the active HTTP composition no longer depends exclusively on process memory for economic records or settlement. The adapter is still single-node and the pricing policy remains explicitly DEV/non-billing; no external financial provider is certified.
- **Root cause:** economic contracts previously had no source-of-truth/store boundary and settlement idempotency was only a map scan.
- **Required target state:** durable economic records, idempotent settlement provider, reconciliation, failure states and explicit non-billing boundary. Billing/pricing are not implied.
- **B02 evidence:** restart-safe quote/reservation/usage/settlement/receipt, duplicate request stability, provider failure with zero local success, simulated post-provider crash and one-time reconciliation, and cross-Tenant visibility tests pass.
- **Residual risk:** SQLite is `SINGLE_NODE_DURABLE` and `MULTI_INSTANCE_NOT_PROVEN`; no external settlement service, ledger, billing, pricing or authoritative broad metering was introduced.
- **Dependencies / milestone:** shared-state/multi-instance closure in B/H; trusted identity in C; runtime usage source in D; external diagnostics in E.
- **Acceptance evidence required to close:** shared/external provider operation, concurrent writers, failover/reconciliation against a real service, durable audit/outbox and production policy approval.

### ACS-ORG-008 — Real HTTP rejects Product API `PUT` and `DELETE` administration routes

- **Area:** PRODUCT_API; affects CONTROL_PLANE, TENANT, GOVERNANCE.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/http/server.ts:11-31`; `src/http/routes/admin-tenant-routes.ts:403-507`; `static/src/admin/api.ts:426-433`; `tests/http.test.mjs:130-134`; D01 tests call `routeProductApiRequest` directly with `PUT`.
- **Current behavior after B01:** the server entry handler accepts `GET`, `POST`, `PUT`, `PATCH` and `DELETE`; preflight advertises the same methods plus `OPTIONS`; Tenant policy, entitlement and limit `PUT`/`DELETE` operations reach their real handlers. Unsupported top-level methods retain `405` and `Allow` metadata.
- **Operational impact:** governance, entitlement and limit mutations certified at route level cannot complete through the shipped HTTP server/UI path.
- **Resolution evidence:** `src/http/server.ts`; route-level read safety in `src/http/routes/acs-routes.ts`; real handler coverage in `tests/s45-epic-15-5-durable-http-contract.test.mjs` for all five application methods, CORS preflight and unsupported method behavior.
- **Required target state:** one method contract across server, CORS, route layer and client, with end-to-end tests through `createAcsHttpHandler`.
- **Residual scope after C02:** production authentication and application edge contracts are implemented; live IdP/proxy/multi-host limiter proof remains under ACS-ORG-010/019 and H. None of this reopens method compatibility.
- **Acceptance evidence:** HTTP-level `PUT`/`DELETE` success and denial tests, browser mutation proof and no permissive method fallback.

### ACS-ORG-009 — Administrative and operational audit history is process-local

- **Area:** OBSERVABILITY; affects PERSISTENCE, SECURITY, OPERATIONS.
- **Severity / status:** **CRITICAL**, PARTIALLY_RESOLVED — B01.
- **Evidence:** `src/control-plane/audit-service.ts:82-142`; admin audit routes query that same service; `src/control-plane/observability.ts:436-450` acknowledges session-scoped retention.
- **Current behavior after B01:** `AuditService` consumes an `AuditEventStore`; the HTTP composition selects the same single-node durable snapshot used by Tenant Administration. Administrative event IDs, correlations, actors, tenant scope, metadata, timestamps and revisions survive restart and remain queryable through the existing read model.
- **Operational impact:** privileged actions cannot be reconstructed reliably after restart or across instances, weakening incident response and governance evidence.
- **B01 evidence:** `src/control-plane/audit-service.ts`; `src/control-plane/durable-administrative-state.ts`; restart/correlation assertions in `tests/s45-epic-15-5-durable-http-contract.test.mjs`.
- **Residual risk:** the store is not a replica-shared append service; retention, tamper evidence and transactional coupling between resource state and its audit event remain deferred. A domain commit and audit append are two atomic file replacements, not one transaction.
- **Required target state:** append-only durable audit sink, tenant-scoped query projection, retention/ordering, immutable IDs, delivery failure semantics and optional export boundary.
- **Dependencies / milestone:** shared durable audit/outbox semantics remain Milestone B follow-up; trusted actor remains C; exporter integration remains E.
- **Acceptance evidence:** restart/replica history, denied-attempt capture, ordering/correlation, retention policy, write-failure behavior and cross-tenant read tests.

### ACS-ORG-010 — Rate limiting is disabled or caller-selected mock state

- **Area:** EDGE; affects SECURITY, OPERATIONS.
- **Severity / status:** **CRITICAL**, PARTIALLY_RESOLVED — C02.
- **Previous behavior:** headers chose `mock` or `mock-exceeded`; no counter/store was consulted and default enforcement was disabled.
- **Current behavior after C02:** `createAcsHttpHandler` consumes a server-owned fixed-window limiter before auth and again after authenticated principal resolution. Network, principal and Tenant+principal keys are derived from trusted context and hashed before persistence. `createAcsHttpServer` selects `SqliteRateLimitStore`; production rejects memory/mock fallback.
- **Operational impact after C02:** callers cannot select keys, fabricate exceeded/allowed state or bypass a bucket through untrusted forwarding headers. Sensitive operations fail closed with 503 when the store is unavailable; liveness remains observable and readiness reports the outage.
- **Root cause:** response/error semantics were implemented before an edge adapter.
- **Required target state:** server-owned distributed limiter with endpoint classes, tenant/principal/IP keys, trusted proxy resolution, retry-after and fail-safe behavior.
- **C02 evidence:** `src/http/rate-limit.ts`, `src/http/edge.ts`, `src/http/server.ts` and `tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs`; two independent SQLite connections share an atomic bucket, real HTTP returns consistent 429/Retry-After, spoofed keys/addresses fail, and backend-outage semantics pass.
- **Residual risk:** SQLite is single-node durable/shared-database capable, not a certified multi-host global limiter. Network partitions, live load-balancer topology and high-contention capacity remain unproven under `ACS-ORG-019`/H.
- **Dependencies / milestone:** live multi-host/provider acceptance remains H; the C02 implementation boundary is complete.
- **Acceptance evidence required to close:** two-host/shared-service load test, partition/outage behavior, trusted reverse-proxy deployment proof and operational capacity evidence.

### ACS-ORG-011 — External telemetry, HTTP telemetry, raw logs and traces are unavailable

- **Area:** OBSERVABILITY; affects OPERATIONS, RECOVERY.
- **Severity / status:** **CRITICAL**, RESOLVED — AEES-E for the active HTTP/runtime boundary.
- **Previous evidence:** `src/inspection.ts:590-616`; `src/control-plane/observability.ts:225-292,405-440,640-713`; legacy `src/telemetry.ts` offered memory or local JSONL only.
- **Current behavior after AEES-E:** `OperationalTelemetryProvider` emits structured logs, low-cardinality metrics and correlated spans through a bounded OTLP HTTP/JSON exporter. HTTP request context persists into durable jobs and independent workers. Platform telemetry/operational-status routes expose bounded current evidence, while audit remains authoritative history.
- **Operational impact after AEES-E:** worker/runtime/dependency incidents are diagnosable through supported HTTP surfaces and evidence exported to an independent process; telemetry outage is itself degraded without corrupting domain state.
- **Root cause:** evidence models and UI were completed before production telemetry transport and retention.
- **Required target state:** structured logs, metrics and traces with external sink/export, tenant-safe correlation, alerting/SLO signals, retention and health of the exporter path.
- **AEES-E evidence:** `src/control-plane/operational-telemetry.ts`, `src/control-plane/operational-diagnostics.ts`, `tests/s52`–`s54` and `/tmp/acs-epic15-5-aees-e-evidence/manifest.json`; independent receiver/Control Plane/workers and dependency-outage process exported 105 log, 94 metric and 91 trace batches with zero sensitive matches, including `SECRET_PROVIDER_UNREACHABLE` and `RATE_LIMITER_UNAVAILABLE` externally.
- **Residual caveat:** external-process local topology is proven; multi-host collectors, managed retention, dashboards/alerts and network partitions remain H/environment scope and do not reopen the exporter/diagnostic boundary.

### ACS-ORG-012 — No dependency-aware production traffic readiness gate exists

- **Area:** OPERATIONS; affects DEPLOYMENT, OBSERVABILITY.
- **Severity / status:** **HIGH**, RESOLVED — AEES-E active HTTP boundary.
- **Evidence:** `/api/v1/health` and `/acs/health` are liveness/inspection responses; `src/control-plane/product-api-client.ts:3062-3235` hardcodes auth, limiter, persistence, secret, settlement and remote-worker signals. “Distributed Runtime readiness” can be `ready` from a local worker and target while `remoteWorkerSupported` is false.
- **Current behavior after AEES-E:** `/api/v1/health` is minimal liveness; `/api/v1/ready` computes aggregate dependency-aware readiness with stable reason codes; platform operational status includes bounded identity, edge, secrets, administrative state, economics, settlement, runtime, recovery, worker and telemetry probes.
- **Operational impact after AEES-E:** required dependency failures block readiness while liveness stays up; optional telemetry outage is an explicit degradation; incompatible/no-worker capacity is diagnosable without treating the process as dead.
- **Root cause:** multiple historical readiness vocabularies were projected without a single runtime gate.
- **Required target state:** distinct liveness and dependency-aware readiness endpoints plus Development/Integration/Operational/Production levels, with live adapter health and reason codes.
- **AEES-E evidence:** `tests/s53` validates liveness/readiness separation, Vault/rate-limiter reason codes, authorization and Tenant isolation; `tests/s54` validates worker/exporter incident transitions across processes.
- **Residual caveat:** deployed load-balancer behavior, multi-host dependency infrastructure and production deployment target checks remain G/H acceptance, not missing readiness semantics.

### ACS-ORG-013 — HTTP edge controls are incomplete for an exposed service

- **Area:** EDGE; affects SECURITY, PRODUCT_API.
- **Severity / status:** **HIGH**, RESOLVED — C02 for the active HTTP server boundary.
- **Previous behavior:** wildcard CORS, unbounded JSON accumulation, runtime-default timeouts and undefined forwarded-address trust.
- **Current behavior after C02:** production requires an exact origin allowlist; preflight covers real methods and Authorization; body, header, request, keep-alive and per-socket limits are explicit; applicable security headers are returned; trusted proxy CIDRs are configured centrally and malformed/untrusted forwarding headers fall back to the socket peer.
- **Operational impact after C02:** browser origin trust and request resource consumption are bounded before domain handlers, with 413/403 semantics and no raw edge/internal data leakage.
- **Root cause:** the HTTP server is an inspection MVP rather than an edge-hardened service.
- **Required target state:** environment-specific origin policy, complete method/header contract, body limits, request/operation timeouts, security headers and trusted proxy configuration.
- **C02 evidence:** real TCP/HTTP CORS allow/deny and preflight tests, declared/chunked oversize requests with zero Agent side effect, proxy spoof tests, security-header assertions and server timeout/connection configuration in `tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs`.
- **Residual risk:** live TLS/reverse-proxy/load-balancer configuration is environment acceptance, not an application-contract gap. H must prove the deployed topology.

### ACS-ORG-014 — Tenant administration and the main Control Plane are separate applications

- **Area:** CONTROL_PLANE; affects UX, OPERATIONS.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `.design/app-standalone/src/App.tsx` defines the broad Control Plane routes but no `/admin/tenants`; `static/src/App.tsx:75` selects a standalone Tenant Administration application for `/admin/tenants`; the static app contains its own mock actor context.
- **Current behavior:** the main operational shell and tenant administration have separate builds, navigation and client contexts.
- **Operational impact:** operators lack one authenticated navigation/session boundary; tenant state and other operational resources cannot be followed through a single canonical journey.
- **Root cause:** EPIC-15 shipped into the available static surface without consolidating the EPIC-14 shell.
- **Required target state:** one supported Control Plane shell and Product API client/auth context, or an explicit secure federation with consistent navigation and error semantics.
- **Dependencies / milestone:** trusted identity and API method fix; Milestone F.
- **AEES-F result:** **RESOLVED.** The builds remain intentionally federated, but main navigation, reciprocal links, bearer/session semantics, server-owned Tenant context and structured error behavior are coherent. The Tenant application no longer offers browser actor/platform selection.
- **Acceptance evidence:** 56/56 route-viewports and Journey F/G in `/tmp/acs-epic15-5-aees-f-evidence/manifest.json`.
- **Acceptance evidence:** direct/deep navigation, shared actor context, route regression and browser journey from tenant to agent/audit without changing applications manually.

### ACS-ORG-015 — Agent composition changes remain read-only or unsupported

- **Area:** CONTROL_PLANE; affects PRODUCT_API, UX, GOVERNANCE.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `src/control-plane/product-api-client.ts:644-645,3582-3615`; `src/http/routes/product-api-routes.ts` exposes role/profile/capability/skill/tool/plugin reads and returns `405 unsupported_action` for composition mutations; UI labels these operations unsupported/future.
- **Current behavior:** an agent can be created and revised, but supported UI/API paths do not complete role/profile, skill, tool/plugin, engine/provider and capability assignment as an operator workflow.
- **Operational impact:** operators must rely on initial payload knowledge, fixtures or direct engineering paths to configure an executable agent.
- **Root cause:** EPIC-11 intentionally bounded composition mutation while stabilizing read models.
- **Required target state:** small semantic mutation set through Product API, authority/governance checks, compatibility/readiness refresh and audit receipts.
- **Dependencies / milestone:** secrets and identity; Milestone F.
- **AEES-F result:** **RESOLVED for the supported Agent definition boundary.** The create/edit form consumes Product API role, profile, provider/model, capability, skill and tool catalogs and persists one governed Agent definition/revision. Missing model strategy is a deterministic readiness/deployment blocker.
- **Residual boundary:** plugin installation and arbitrary catalog administration remain outside the supported Agent-composition flow; no second frontend domain model was added.
- **Acceptance evidence:** create-to-ready browser journey assigns real governed resources without file/code edits; invalid combinations fail semantically.

### ACS-ORG-016 — Secret configuration, rotation and revocation lack a supported operator journey

- **Area:** SECURITY; affects UX, CONTROL_PLANE, RUNTIME.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** Product API exposes credential/provider connection reads; mutation routes are unsupported; the main UI declares no secret values are stored/displayed; no supported secrets administration route was found.
- **Current behavior:** reference/redaction contracts exist, but an operator cannot securely create, rotate, revoke and validate a runtime secret through the Product API and Control Plane.
- **Operational impact:** deployment depends on engineering-side provisioning or in-memory bootstrap, contrary to the target journey.
- **Root cause:** safe storage was deferred, so mutation UX correctly remained absent.
- **Required target state:** after ACS-ORG-002, semantic secret-reference operations with minimal metadata, rotation/revoke, readiness feedback and no value echo.
- **Dependencies / milestone:** managed secret adapter and trusted identity; Milestone F.
- **AEES-F result:** **RESOLVED for the supported secret-reference lifecycle.** Product API and Control Plane create, rotate and revoke tenant-scoped references; reads expose metadata/version/status only; audit and browser evidence contain no material.
- **Evidence:** `tests/s55-epic-15-5-operational-ux-contract.test.mjs` and Journey A.
- **Acceptance evidence:** browser/API rotation journey, runtime resolution, restart preservation, audit record and exposure scan.

### ACS-ORG-017 — Execution routes and the dispatch/result/recovery journey are incomplete

- **Area:** RUNTIME; affects UX, PRODUCT_API, RECOVERY.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence after B01:** `src/http/routes/product-api-routes.ts` now resolves the typed `POST .../start` and `POST .../stop` handlers before unsupported-operation guards; `tests/s45-epic-15-5-durable-http-contract.test.mjs` proves real handler invocation and wrong-method `405`. Execution runs remain read projections and no supported retry/cancel/remediate flow exists.
- **Current behavior after AEES-D:** Product API start creates durable remote dispatch intent; job/detail/event reads and durable cancellation are exposed; remote workers complete results and recovery handles worker/Control Plane loss. A complete retry/drain/remediation operator surface and Control Plane execution UX remain absent.
- **Operational impact:** an operator cannot reliably execute, observe terminal result, retry safely, cancel or reconcile stuck work.
- **Root cause:** the route-order contradiction is resolved; the remaining gap is the absent durable distributed dispatch and recovery subsystem.
- **Required target state:** integrate run intent with the D milestone dispatcher, durable outcome and semantic retry/cancel operations, then expose them through the Product API and UI.
- **Dependencies / milestone:** backend D scope is complete; Milestone F owns the remaining operator journey.
- **AEES-F result:** **RESOLVED for the supported sandbox runtime journey.** Agent detail starts execution; Executions/Workers expose durable state, assignment, events, diagnostics and terminal result; cancellation is available for valid non-terminal states; crash recovery/reassignment is visible.
- **Evidence:** Journeys B/C/D and runtime IDs in the AEES-F manifest.
- **Acceptance evidence:** UI-to-remote-worker run with result, failure, retry, cancellation and audit correlation.

### ACS-ORG-018 — Failure surfaces diagnose but do not provide governed remediation

- **Area:** RECOVERY; affects OPERATIONS, UX.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** diagnostics/evidence/readiness routes are read-only; UI text explicitly describes runtime control, worker registration/autoscaling and several operational actions as unsupported/future.
- **Current behavior:** the Control Plane can show blockers, stale state and evidence, but supported actions to requeue, reconcile, rotate a failed provider, recover a deployment or drain a worker are missing.
- **Operational impact:** shell access, restart or source knowledge remains the practical remediation path.
- **Root cause:** observability and contract visibility were accepted before the recovery command surface.
- **Required target state:** bounded runbooks and semantic remediation commands tied to authority, preconditions, receipts and post-action verification.
- **Dependencies / milestone:** D and E supply reliable state/signals; Milestone F.
- **AEES-F result:** **PARTIALLY_RESOLVED.** Automatic recovery and durable cancellation are visible and actionable, reason codes have recommended actions, and failure/recovery can be diagnosed without shell. Starting infrastructure, scaling workers, repairing Vault/IdP or forcing ownership remain external operational actions and are not faked in the Control Plane.
- **Acceptance evidence:** injected failures can be detected, remediated and verified through supported UI/API paths.

### ACS-ORG-019 — Multi-replica correctness is structurally unproven

- **Area:** INFRASTRUCTURE; affects PERSISTENCE, EDGE, RUNTIME.
- **Severity / status:** **CRITICAL**, PARTIALLY_RESOLVED — local multi-process runtime/edge proof.
- **Current behavior after AEES-D:** two Control Plane processes and two worker processes share atomic SQLite runtime ownership; C02 previously proved shared SQLite rate counters. Claims, lease recovery and result commits do not depend on one process. Other authoritative aggregates and local filesystem adapters remain unshared.
- **Operational impact:** runtime duplicate ownership is prevented in the certified one-host/shared-database topology. Horizontal scaling across hosts can still produce inconsistent non-runtime resources and has no partition/failover proof.
- **Root cause:** bounded shared SQLite adapters now exist, but a complete shared multi-host composition does not.
- **Required target state:** shared authoritative adapters, idempotent mutations, distributed coordination only where necessary and explicit cache-versus-authority boundaries.
- **Dependencies / milestone:** B for state; D for jobs/workers.
- **AEES-D evidence:** `tests/s51` starts two independent ACS servers and two workers, proves shared claims/recovery, then replaces a killed Control Plane process. Multi-host/network-partition evidence remains H.

### ACS-ORG-020 — Acceptance does not cover restart, multi-process, remote or provider failures

- **Area:** TESTING; affects all operational areas.
- **Severity / status:** **HIGH**, PARTIALLY_RESOLVED — runtime topology covered by AEES-D.
- **Evidence:** the test inventory has broad unit/integration/browser suites, but searches found no restart-survivability, multi-process, broker/redelivery, real remote dispatch, JWT/OIDC validation, external exporter or durable provider failure-injection tests.
- **Current behavior after AEES-D:** contract/domain/route/browser coverage is supplemented by real multi-process runtime crash/restart, fencing, duplicate-result, cancellation and backpressure acceptance. External providers, multi-host partitions, observability and the full operator journey remain unproven.
- **Operational impact:** passing regressions can coexist with restart data loss, forgeable identity and nonfunctional remote execution.
- **Root cause:** earlier acceptance scopes explicitly certified bounded milestones rather than production operation.
- **Required target state:** milestone-specific operational harnesses and a final H matrix covering restart, replica loss, provider outage, network partition, forged identity and browser recovery.
- **Dependencies / milestone:** test each adapter as introduced; consolidate in H.
- **Acceptance evidence:** reproducible manifests with topology, commands, counts, artifacts and negative cases.

### ACS-ORG-021 — Local filesystem, local engine and environment editing are hidden prerequisites

- **Area:** OPERATIONS; affects INFRASTRUCTURE, DEPLOYMENT, UX.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `src/http/control-plane-context.ts:117-125,271-275`; `src/engines/openclaw-bootstrap.ts`; `src/runtime.ts:48-57`; scripts depend on environment variables and local `~/.openclaw` paths.
- **Current behavior:** runtime/config/artifact/workspace roots and the OpenCode endpoint are local process configuration; bootstrap discovers local files and child processes. No supported administrative configuration, validation or remote target onboarding path exists.
- **Operational impact:** installation and recovery require engineering knowledge, filesystem access and restarts; containers/replicas cannot assume shared local paths.
- **Root cause:** local development topology is embedded in the default composition.
- **Required target state:** explicit environment profiles, validated configuration source, externalized durable stores, target/worker onboarding and diagnostics that identify missing dependencies without shell access.
- **Dependencies / milestone:** B/D/F.
- **Acceptance evidence:** clean environment bootstrap from documented supported inputs, no manual file edits, and actionable dependency failures in the Control Plane.
- **AEES-F result:** **PARTIALLY_RESOLVED.** Journeys A–G require no shell, curl, SQLite inspection or file editing after the harness topology is bootstrapped. Deploying/configuring the worker, IdP/Vault and multi-host infrastructure remains an engineering/deployment prerequisite for G/H.

### ACS-ORG-022 — Public/demo readiness language can exceed active operational evidence

- **Area:** DOCUMENTATION; affects UX, OPERATIONS.
- **Severity / status:** **MEDIUM**, OPEN — VERIFIED.
- **Evidence:** `static/src/App.tsx` contains production/deploy/operate language and illustrative live telemetry while the active runtime reports mock/local/sandbox constraints; a scope note exists but is not applied consistently to every claim.
- **Current behavior:** the public surface mixes architectural direction, demo data and operational verbs.
- **Operational impact:** reviewers/operators may infer production availability from a contract-complete demonstration.
- **Root cause:** marketing and product evidence evolved on different timelines.
- **Required target state:** evidence-linked labels for demo, development, operational and production states; no synthetic live status presented as runtime truth.
- **Dependencies / milestone:** align during UX operationalization; Milestone F.
- **AEES-F result:** **RESOLVED for active Control Plane surfaces.** Operations distinguishes liveness/readiness and Ready/Degraded/Blocked/Unknown; documentation qualifies the single-host topology and keeps Production Ready blocked.
- **Acceptance evidence:** claim audit against the readiness API and closure report; no unsupported production wording.

### ACS-ORG-023 — Legacy projections still describe tenant administration as future scope

- **Area:** PRODUCT_API; affects CONTROL_PLANE, DOCUMENTATION.
- **Severity / status:** **MEDIUM**, OPEN — VERIFIED.
- **A01 evidence:** the pre-AEES-F `SystemGuardrails`, `SystemAdministration` and `SystemTenants` projections returned production administration unavailable and tenants future scope, while EPIC-15 had already delivered `/api/v1/admin/tenants` and its UI.
- **Current behavior:** old system/governance views and the new administrative API give contradictory capability status.
- **Operational impact:** the main Control Plane can route an operator to stale guidance and readiness conclusions.
- **Root cause:** EPIC-15 added a new bounded API without reconciling legacy EPIC-11 projections.
- **Required target state:** one canonical capability inventory or explicit distinction between tenant administration delivered and broader platform administration deferred.
- **Dependencies / milestone:** consolidate with the Control Plane shell; Milestone F.
- **AEES-F result:** **RESOLVED.** Active navigation and session copy point to the real Tenant Administration surface; stale future-scope guidance was removed from the operator path.
- **Acceptance evidence:** route/read-model inventory contains no contradictory tenant capability status.

### ACS-ORG-024 — Tracked backup source files create divergent implementation references

- **Area:** DOCUMENTATION; affects TESTING, MAINTAINABILITY.
- **Severity / status:** **LOW**, OPEN — VERIFIED.
- **A01 evidence:** the repository tracked `.design/app-standalone/src/api/product-api.ts.backup` and `src/http/control-plane-context.ts.bak` as divergent source copies.
- **Current behavior:** obsolete copies sit beside active source and contain stale composition/client behavior.
- **Operational impact:** searches, reviews and automated analysis can select the wrong implementation; future fixes may be applied inconsistently.
- **Root cause:** temporary backups were committed.
- **Required target state:** remove or move historical material to governed documentation/history when ownership is confirmed.
- **Dependencies / milestone:** safe hygiene in A follow-up or F; no runtime redesign.
- **Acceptance evidence:** tracked-source scan has no unmanaged backups and build/tests remain unchanged.
- **AEES-F result:** **RESOLVED.** `.design/app-standalone/src/api/product-api.ts.backup` and `src/http/control-plane-context.ts.bak` were verified as divergent obsolete copies, removed, and `*.bak`/`*.backup` are ignored.

## Disposition of high-signal textual matches

| Observation | Disposition | Reason |
| --- | --- | --- |
| In-memory adapters used exclusively by unit tests | NOT_A_GAP | Appropriate deterministic test implementation when production composition cannot select it silently. |
| `JsonlReceiptStore` and `JsonlTelemetrySink` in the legacy local runtime | NOT_A_GAP as DEV evidence; not production proof | They survive a local restart but are not shared, transactional or externally operated. |
| Sandbox-only deployment checks | NOT_A_GAP as a guardrail; ACS-ORG-006 tracks unmet prerequisites | Removing the gate before readiness would weaken safety. |
| EPIC-15 domain authority and cross-tenant rules | NOT_A_GAP | Contract and regression evidence exist; ACS-ORG-003 concerns the untrusted incoming identity chain. |
| Billing, pricing, invoices, SCIM and generic IAM | ACCEPTABLE_DEFERRED | They are not required to certify the approved ACS operational baseline, unless a later milestone changes that boundary explicitly. |
| Secret references/redaction | NOT_A_GAP | The reference-only contract is correct; storage/provider and operator lifecycle remain gaps. |

## Known blocker reconciliation

All initial blockers were confirmed in current code. The two secret-store statements were consolidated into ACS-ORG-002. “Deployment, runtime, audit and economic state are process-local” was decomposed by root cause into ACS-ORG-001, ACS-ORG-005, ACS-ORG-007 and ACS-ORG-009 so each can close with distinct evidence. The sandbox-only rule was reclassified as an intentional protective gate whose production prerequisites remain a blocker, not as a guard to delete.
