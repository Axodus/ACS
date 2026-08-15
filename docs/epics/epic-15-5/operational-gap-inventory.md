# Operational Gap Inventory

This is the canonical finding register. The original A01 inventory reflects commit `b104895`; B01, B02 and C01 status/evidence were updated on 2026-08-15 against the implementation based on `ed46412`. `OPEN — VERIFIED` means the behavior remains confirmed; `PARTIALLY_RESOLVED` records bounded evidence without overstating the residual topology.

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
| ACS-ORG-001 | PERSISTENCE | Active authoritative Control Plane state is process-local | BLOCKER | B | PARTIALLY_RESOLVED — B01 |
| ACS-ORG-002 | SECURITY | No production-grade secret adapter is available or active | BLOCKER | B | PARTIALLY_RESOLVED — B02 |
| ACS-ORG-003 | IDENTITY | HTTP actor and platform authority are forgeable by the caller | BLOCKER | C | RESOLVED — C01 |
| ACS-ORG-004 | DISTRIBUTED_EXECUTION | Operational execution uses a same-process local worker, not remote dispatch | BLOCKER | D | OPEN — VERIFIED |
| ACS-ORG-005 | RECOVERY | Runtime jobs, assignments and leases lack durable recovery semantics | BLOCKER | D | OPEN — VERIFIED |
| ACS-ORG-006 | DEPLOYMENT | Production deployment is blocked by a deliberate sandbox-only gate | BLOCKER | G | OPEN — VERIFIED |
| ACS-ORG-007 | ECONOMICS | Economic settlement and records use an in-memory provider and maps | BLOCKER | B | PARTIALLY_RESOLVED — B02 |
| ACS-ORG-008 | PRODUCT_API | Real HTTP rejects Product API `PUT` and `DELETE` administration routes | BLOCKER | B | RESOLVED — B01 |
| ACS-ORG-009 | OBSERVABILITY | Administrative and operational audit history is process-local | CRITICAL | B | PARTIALLY_RESOLVED — B01 |
| ACS-ORG-010 | EDGE | Rate limiting is disabled or caller-selected mock state | CRITICAL | C | OPEN — VERIFIED |
| ACS-ORG-011 | OBSERVABILITY | External telemetry, HTTP telemetry, raw logs and traces are unavailable | CRITICAL | E | OPEN — VERIFIED |
| ACS-ORG-012 | OPERATIONS | No dependency-aware production traffic readiness gate exists | HIGH | E | OPEN — VERIFIED |
| ACS-ORG-013 | EDGE | HTTP edge controls are incomplete for an exposed service | HIGH | C | OPEN — VERIFIED |
| ACS-ORG-014 | CONTROL_PLANE | Tenant administration and the main Control Plane are separate applications | HIGH | F | OPEN — VERIFIED |
| ACS-ORG-015 | CONTROL_PLANE | Agent composition changes remain read-only or unsupported | HIGH | F | OPEN — VERIFIED |
| ACS-ORG-016 | SECURITY | Secret configuration, rotation and revocation lack a supported operator journey | HIGH | F | OPEN — VERIFIED |
| ACS-ORG-017 | RUNTIME | Execution routes and the dispatch/result/recovery journey are incomplete | HIGH | D/F | OPEN — VERIFIED |
| ACS-ORG-018 | RECOVERY | Failure surfaces diagnose but do not provide governed remediation | HIGH | F | OPEN — VERIFIED |
| ACS-ORG-019 | INFRASTRUCTURE | Multi-replica correctness is structurally unproven | CRITICAL | B/D | OPEN — VERIFIED |
| ACS-ORG-020 | TESTING | Acceptance does not cover restart, multi-process, remote or provider failures | HIGH | H | OPEN — VERIFIED |
| ACS-ORG-021 | OPERATIONS | Local filesystem, local engine and environment editing are hidden prerequisites | HIGH | B/D/F | OPEN — VERIFIED |
| ACS-ORG-022 | DOCUMENTATION | Public/demo readiness language can exceed the active operational evidence | MEDIUM | F | OPEN — VERIFIED |
| ACS-ORG-023 | PRODUCT_API | Legacy projections still describe tenant administration as future scope | MEDIUM | F | OPEN — VERIFIED |
| ACS-ORG-024 | DOCUMENTATION | Tracked backup source files create divergent implementation references | LOW | A/F | OPEN — VERIFIED |

## Findings

### ACS-ORG-001 — Active authoritative Control Plane state is process-local

- **Area:** PERSISTENCE; affects TENANT, GOVERNANCE, RUNTIME, DEPLOYMENT, PRODUCT_API.
- **Severity / status:** **BLOCKER**, PARTIALLY_RESOLVED — B01.
- **Evidence:** `src/http/control-plane-context.ts:277-391`; `src/control-plane/agent-service.ts:56-57,160-161`; `src/control-plane/tenant-domain.ts:108-109`; `src/control-plane/tenant-membership.ts:166-167`; `src/control-plane/tenant-governance.ts:392-393`; `src/control-plane/deployment-service.ts:52`; `src/control-plane/runtime-lifecycle-service.ts:79-80`.
- **Current behavior after B02:** `createAcsHttpServer` explicitly selects durable Tenant Administration/audit plus SQLite secret metadata/credential and economic/settlement adapters. These states survive a new context/process instance. Direct test contexts remain memory-backed unless persistence is requested. Agent, composition, deployment, runtime and worker truth remains process-local.
- **Operational impact:** restart loses authoritative administration and operational state; two replicas can return divergent answers and accept conflicting mutations.
- **B01 evidence:** `src/control-plane/durable-administrative-state.ts`; repository wiring in `src/http/control-plane-context.ts`; restart, ownership-batch, serialization, corruption and write-failure coverage in `tests/s45-epic-15-5-durable-http-contract.test.mjs`.
- **Residual risk:** the local snapshot is `SINGLE_NODE_DURABLE`, has no cross-process locking/refresh, migration framework or shared transaction service, and does not make the remaining operational aggregates durable.
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
- **Residual risk:** a live IdP/JWKS deployment, TLS/DNS availability and service identities are not certified by the deterministic adapter tests. C02 edge controls/rate limiting and Milestone H live-topology acceptance remain open; they do not reopen caller-header forgery.
- **Follow-up:** C02 distributed rate limiting and trusted edge/proxy policy, F authenticated UX and H live identity-provider acceptance.

### ACS-ORG-004 — Operational execution uses a same-process local worker, not remote dispatch

- **Area:** DISTRIBUTED_EXECUTION; affects RUNTIME, INFRASTRUCTURE.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/http/control-plane-context.ts:393-415`; `src/workers/local-worker.ts`; `src/workers/worker-registry.ts`; `src/workers/worker-assignment-service.ts`; normal runtime routes in `src/http/routes/product-api-routes.ts:909-931` call `RuntimeLifecycleService` directly.
- **Current behavior:** `LocalExecutionWorker` calls the engine inside the ACS process. Worker registration, assignment and lease contracts are exercised mainly by tests and are not connected to a broker, RPC service or the normal runtime start path.
- **Operational impact:** there is no remote worker discovery, network identity, delivery, redelivery or independently scalable execution plane. “Distributed” cannot be claimed.
- **Root cause:** EPIC-10 established contracts and local proof without a production transport.
- **Required target state:** authenticated remote worker protocol, durable queue/dispatch record, registration/heartbeat, lease fencing, result correlation and explicit dispatch integration at the Product API application boundary.
- **Dependencies / milestone:** durable job state and identity first; Milestone D.
- **Acceptance evidence:** real second process or host receives and executes work; no direct local fallback in production; network failure/redelivery and duplicate protection tests.

### ACS-ORG-005 — Runtime jobs, assignments and leases lack durable recovery semantics

- **Area:** RECOVERY; affects RUNTIME, DISTRIBUTED_EXECUTION.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/workers/worker-assignment-service.ts:33-36`; `src/workers/worker-registry.ts:23-24`; `src/control-plane/runtime-lifecycle-service.ts:79-80,181-225`; repository search found no restart/redelivery/dead-worker tests.
- **Current behavior:** jobs, worker records, leases and runtime records live in maps. Runtime inspection can return a cached local record after engine inspection fails. No durable state machine reconciles orphaned work, expired leases, duplicate delivery or worker loss.
- **Operational impact:** restart or worker loss can orphan executions, show stale status, duplicate side effects or require manual repair.
- **Root cause:** lifecycle state machines exist without durable scheduling/reconciliation infrastructure.
- **Required target state:** persisted jobs and transitions, lease fencing, heartbeat expiry, idempotency keys, retry policy, dead-letter/reconciliation flow and governed cancel/retry operations.
- **Dependencies / milestone:** ACS-ORG-001, ACS-ORG-003 and ACS-ORG-004; Milestone D.
- **Acceptance evidence:** crash/restart, lost-worker, duplicate-delivery, retry exhaustion, cancellation and recovery tests with final state reconciliation.

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
- **Residual scope:** production authentication, trusted origins/headers, request bounds and distributed rate limiting remain ACS-ORG-003/010/013. They do not reopen method compatibility.
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
- **Severity / status:** **CRITICAL**, OPEN — VERIFIED.
- **Evidence:** `src/http/rate-limit.ts:1-64`; `src/http/server.ts:33-45`; `tests/http-auth-rate-limit.test.mjs` validates the mock contract.
- **Current behavior:** headers choose `mock` or `mock-exceeded`; no counter or store is consulted. Default is disabled. No trusted IP/principal/tenant key, distributed window or proxy policy exists.
- **Operational impact:** clients can bypass or fabricate limits; replicas cannot coordinate abuse controls; sensitive administrative and execution routes are unprotected.
- **Root cause:** response/error semantics were implemented before an edge adapter.
- **Required target state:** server-owned distributed limiter with endpoint classes, tenant/principal/IP keys, trusted proxy resolution, retry-after and fail-safe behavior.
- **Dependencies / milestone:** trusted identity and edge profile; Milestone C.
- **Acceptance evidence:** concurrent and multi-instance limit tests, spoofed-header rejection, retry-after/status semantics and store outage behavior.

### ACS-ORG-011 — External telemetry, HTTP telemetry, raw logs and traces are unavailable

- **Area:** OBSERVABILITY; affects OPERATIONS, RECOVERY.
- **Severity / status:** **CRITICAL**, OPEN — VERIFIED.
- **Evidence:** `src/inspection.ts:590-616`; `src/control-plane/observability.ts:225-292,405-440,640-713`; `src/telemetry.ts` offers memory or local JSONL only.
- **Current behavior:** external exporter is disabled, HTTP telemetry is contract-only, raw logs are not in the Product API, traces and retention are deferred, and operational evidence is session/local scoped.
- **Operational impact:** an operator cannot reliably detect platform degradation, correlate distributed work or diagnose failures without direct process/filesystem access.
- **Root cause:** evidence models and UI were completed before production telemetry transport and retention.
- **Required target state:** structured logs, metrics and traces with external sink/export, tenant-safe correlation, alerting/SLO signals, retention and health of the exporter path.
- **Dependencies / milestone:** durable correlation IDs and remote runtime; Milestone E.
- **Acceptance evidence:** external sink receives HTTP/domain/worker signals, outage is visible, dashboards/alerts diagnose an injected failure, and secrets remain redacted.

### ACS-ORG-012 — No dependency-aware production traffic readiness gate exists

- **Area:** OPERATIONS; affects DEPLOYMENT, OBSERVABILITY.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `/api/v1/health` and `/acs/health` are liveness/inspection responses; `src/control-plane/product-api-client.ts:3062-3235` hardcodes auth, limiter, persistence, secret, settlement and remote-worker signals. “Distributed Runtime readiness” can be `ready` from a local worker and target while `remoteWorkerSupported` is false.
- **Current behavior:** useful production blocker reports exist, but no executable readiness probe determines whether a process should receive production traffic based on current dependencies.
- **Operational impact:** liveness can be mistaken for readiness and local connectivity can be mistaken for distributed readiness.
- **Root cause:** multiple historical readiness vocabularies were projected without a single runtime gate.
- **Required target state:** distinct liveness and dependency-aware readiness endpoints plus Development/Integration/Operational/Production levels, with live adapter health and reason codes.
- **Dependencies / milestone:** production adapters and observability; Milestone E.
- **Acceptance evidence:** dependency failure flips readiness without killing liveness; load-balancer semantics and stale-signal behavior are tested.

### ACS-ORG-013 — HTTP edge controls are incomplete for an exposed service

- **Area:** EDGE; affects SECURITY, PRODUCT_API.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `src/http/server.ts:11-31,94-100`; JSON body readers concatenate request chunks without a declared limit; repository search found no trusted-proxy, origin allowlist, security-header or server-timeout policy.
- **Current behavior:** wildcard CORS is returned, allowed headers omit the mock auth headers used by the browser, no body-size guard or endpoint timeout is defined, and production proxy/origin behavior is unspecified.
- **Operational impact:** legitimate browser preflights can fail while abusive or oversized requests lack bounded handling; deployment behavior varies behind proxies.
- **Root cause:** the HTTP server is an inspection MVP rather than an edge-hardened service.
- **Required target state:** environment-specific origin policy, complete method/header contract, body limits, request/operation timeouts, security headers and trusted proxy configuration.
- **Dependencies / milestone:** identity and rate limiter; Milestone C.
- **Acceptance evidence:** preflight matrix, oversize/timeouts, proxy spoofing, header policy and security-header tests.

### ACS-ORG-014 — Tenant administration and the main Control Plane are separate applications

- **Area:** CONTROL_PLANE; affects UX, OPERATIONS.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** `.design/app-standalone/src/App.tsx` defines the broad Control Plane routes but no `/admin/tenants`; `static/src/App.tsx:75` selects a standalone Tenant Administration application for `/admin/tenants`; the static app contains its own mock actor context.
- **Current behavior:** the main operational shell and tenant administration have separate builds, navigation and client contexts.
- **Operational impact:** operators lack one authenticated navigation/session boundary; tenant state and other operational resources cannot be followed through a single canonical journey.
- **Root cause:** EPIC-15 shipped into the available static surface without consolidating the EPIC-14 shell.
- **Required target state:** one supported Control Plane shell and Product API client/auth context, or an explicit secure federation with consistent navigation and error semantics.
- **Dependencies / milestone:** trusted identity and API method fix; Milestone F.
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
- **Acceptance evidence:** browser/API rotation journey, runtime resolution, restart preservation, audit record and exposure scan.

### ACS-ORG-017 — Execution routes and the dispatch/result/recovery journey are incomplete

- **Area:** RUNTIME; affects UX, PRODUCT_API, RECOVERY.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence after B01:** `src/http/routes/product-api-routes.ts` now resolves the typed `POST .../start` and `POST .../stop` handlers before unsupported-operation guards; `tests/s45-epic-15-5-durable-http-contract.test.mjs` proves real handler invocation and wrong-method `405`. Execution runs remain read projections and no supported retry/cancel/remediate flow exists.
- **Current behavior:** local runtime lifecycle start/stop is reachable through the Product API. It still does not provide durable dispatch intent, remote worker execution, restart recovery, retry/cancel/remediation or production execution proof.
- **Operational impact:** an operator cannot reliably execute, observe terminal result, retry safely, cancel or reconcile stuck work.
- **Root cause:** the route-order contradiction is resolved; the remaining gap is the absent durable distributed dispatch and recovery subsystem.
- **Required target state:** integrate run intent with the D milestone dispatcher, durable outcome and semantic retry/cancel operations, then expose them through the Product API and UI.
- **Dependencies / milestone:** ACS-ORG-004/005; Milestones D and F.
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
- **Acceptance evidence:** injected failures can be detected, remediated and verified through supported UI/API paths.

### ACS-ORG-019 — Multi-replica correctness is structurally unproven

- **Area:** INFRASTRUCTURE; affects PERSISTENCE, EDGE, RUNTIME.
- **Severity / status:** **CRITICAL**, OPEN — VERIFIED.
- **Evidence:** mutable maps in services/registries, local filesystem receipts/telemetry/secrets, local rate-limit context and same-process worker registry; repository tests contain no multi-process/replica suite.
- **Current behavior:** each process owns its own truth and counters. Local JSONL files provide limited restart evidence for the legacy runtime, not shared transactional state.
- **Operational impact:** horizontal scaling can cause lost updates, inconsistent lists, duplicate execution, conflicting ownership and incomplete audit.
- **Root cause:** single-process development composition is the only active topology.
- **Required target state:** shared authoritative adapters, idempotent mutations, distributed coordination only where necessary and explicit cache-versus-authority boundaries.
- **Dependencies / milestone:** B for state; D for jobs/workers.
- **Acceptance evidence:** two ACS instances serve the same dataset, enforce concurrency and continue after one instance dies.

### ACS-ORG-020 — Acceptance does not cover restart, multi-process, remote or provider failures

- **Area:** TESTING; affects all operational areas.
- **Severity / status:** **HIGH**, OPEN — VERIFIED.
- **Evidence:** the test inventory has broad unit/integration/browser suites, but searches found no restart-survivability, multi-process, broker/redelivery, real remote dispatch, JWT/OIDC validation, external exporter or durable provider failure-injection tests.
- **Current behavior:** contract, domain, route and static/browser behavior is well tested. Operational topology and failure semantics remain unproven.
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

### ACS-ORG-022 — Public/demo readiness language can exceed active operational evidence

- **Area:** DOCUMENTATION; affects UX, OPERATIONS.
- **Severity / status:** **MEDIUM**, OPEN — VERIFIED.
- **Evidence:** `static/src/App.tsx` contains production/deploy/operate language and illustrative live telemetry while the active runtime reports mock/local/sandbox constraints; a scope note exists but is not applied consistently to every claim.
- **Current behavior:** the public surface mixes architectural direction, demo data and operational verbs.
- **Operational impact:** reviewers/operators may infer production availability from a contract-complete demonstration.
- **Root cause:** marketing and product evidence evolved on different timelines.
- **Required target state:** evidence-linked labels for demo, development, operational and production states; no synthetic live status presented as runtime truth.
- **Dependencies / milestone:** align during UX operationalization; Milestone F.
- **Acceptance evidence:** claim audit against the readiness API and closure report; no unsupported production wording.

### ACS-ORG-023 — Legacy projections still describe tenant administration as future scope

- **Area:** PRODUCT_API; affects CONTROL_PLANE, DOCUMENTATION.
- **Severity / status:** **MEDIUM**, OPEN — VERIFIED.
- **Evidence:** `src/control-plane/product-api-client.ts:736-770,3540-3560,3621-3640` still returns production administration unavailable and tenants future scope, while EPIC-15 added `/api/v1/admin/tenants` and a Tenant Administration UI.
- **Current behavior:** old system/governance views and the new administrative API give contradictory capability status.
- **Operational impact:** the main Control Plane can route an operator to stale guidance and readiness conclusions.
- **Root cause:** EPIC-15 added a new bounded API without reconciling legacy EPIC-11 projections.
- **Required target state:** one canonical capability inventory or explicit distinction between tenant administration delivered and broader platform administration deferred.
- **Dependencies / milestone:** consolidate with the Control Plane shell; Milestone F.
- **Acceptance evidence:** route/read-model inventory contains no contradictory tenant capability status.

### ACS-ORG-024 — Tracked backup source files create divergent implementation references

- **Area:** DOCUMENTATION; affects TESTING, MAINTAINABILITY.
- **Severity / status:** **LOW**, OPEN — VERIFIED.
- **Evidence:** tracked files `.design/app-standalone/src/api/product-api.ts.backup` and `src/http/control-plane-context.ts.bak`.
- **Current behavior:** obsolete copies sit beside active source and contain stale composition/client behavior.
- **Operational impact:** searches, reviews and automated analysis can select the wrong implementation; future fixes may be applied inconsistently.
- **Root cause:** temporary backups were committed.
- **Required target state:** remove or move historical material to governed documentation/history when ownership is confirmed.
- **Dependencies / milestone:** safe hygiene in A follow-up or F; no runtime redesign.
- **Acceptance evidence:** tracked-source scan has no unmanaged backups and build/tests remain unchanged.

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
