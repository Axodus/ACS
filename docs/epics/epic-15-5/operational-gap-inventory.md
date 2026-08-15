# Operational Gap Inventory

This is the canonical A01 finding register. The inventory reflects the repository at commit `b104895` on 2026-08-15. `OPEN — VERIFIED` means the behavior was confirmed in current code or tests and still requires a later milestone.

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
| ACS-ORG-001 | PERSISTENCE | Active authoritative Control Plane state is process-local | BLOCKER | B | OPEN — VERIFIED |
| ACS-ORG-002 | SECURITY | No production-grade secret adapter is available or active | BLOCKER | B | OPEN — VERIFIED |
| ACS-ORG-003 | IDENTITY | HTTP actor and platform authority are forgeable by the caller | BLOCKER | C | OPEN — VERIFIED |
| ACS-ORG-004 | DISTRIBUTED_EXECUTION | Operational execution uses a same-process local worker, not remote dispatch | BLOCKER | D | OPEN — VERIFIED |
| ACS-ORG-005 | RECOVERY | Runtime jobs, assignments and leases lack durable recovery semantics | BLOCKER | D | OPEN — VERIFIED |
| ACS-ORG-006 | DEPLOYMENT | Production deployment is blocked by a deliberate sandbox-only gate | BLOCKER | G | OPEN — VERIFIED |
| ACS-ORG-007 | ECONOMICS | Economic settlement and records use an in-memory provider and maps | BLOCKER | B | OPEN — VERIFIED |
| ACS-ORG-008 | PRODUCT_API | Real HTTP rejects Product API `PUT` and `DELETE` administration routes | BLOCKER | C | OPEN — VERIFIED |
| ACS-ORG-009 | OBSERVABILITY | Administrative and operational audit history is process-local | CRITICAL | B | OPEN — VERIFIED |
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
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/http/control-plane-context.ts:277-391`; `src/control-plane/agent-service.ts:56-57,160-161`; `src/control-plane/tenant-domain.ts:108-109`; `src/control-plane/tenant-membership.ts:166-167`; `src/control-plane/tenant-governance.ts:392-393`; `src/control-plane/deployment-service.ts:52`; `src/control-plane/runtime-lifecycle-service.ts:79-80`.
- **Current behavior:** each server context constructs new repositories/services backed by arrays or `Map`. Tenant, membership, governance, agent, composition, deployment and runtime truth disappears when that context ends and is not shared with another replica.
- **Operational impact:** restart loses authoritative administration and operational state; two replicas can return divergent answers and accept conflicting mutations.
- **Root cause:** domain contracts were stabilized before a durable application persistence boundary was selected.
- **Required target state:** transactional, tenant-scoped repositories for authoritative resources, explicit migrations, optimistic concurrency/idempotency and a composition profile that refuses production startup when durable adapters are absent.
- **Dependencies / milestone:** schema and adapter decisions precede remote execution and production deploy; Milestone B.
- **Acceptance evidence:** restart survival, two-instance consistency, conflict tests, migration/rollback evidence and no production composition using memory authority.

### ACS-ORG-002 — No production-grade secret adapter is available or active

- **Area:** SECURITY; affects PERSISTENCE, RUNTIME, DEPLOYMENT.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/intelligence/secret-store.ts:6-93`; `src/secret-storage.ts:3-79`; `src/http/control-plane-context.ts:161-185`; `src/inspection.ts:571-581`.
- **Current behavior:** the active server selects `InMemorySecretStore`; the alternative filesystem store writes the raw value to a local file with mode `0600`; a second `MockAcsSecretStorage` returns a redacted mock value. No Vault/KMS/cloud secret adapter, encryption lifecycle, rotation, version selection or production adapter selection was found.
- **Operational impact:** restart loses active secrets, local files do not work across replicas, and production credentials cannot be governed or recovered safely.
- **Root cause:** secret reference and redaction contracts exist, but provider lifecycle and managed storage were deferred.
- **Required target state:** one canonical secret contract with a managed encrypted adapter, tenant-scoped authorization, rotation/versioning, audit, availability health and runtime lease/injection semantics. Raw values must never enter API/UI/audit records.
- **Dependencies / milestone:** durable identity and audit integration; Milestone B, with UI completion in F.
- **Acceptance evidence:** provider integration test, restart/replica proof, rotation/revoke test, tenant isolation negative tests and secret-exposure scan.

### ACS-ORG-003 — HTTP actor and platform authority are forgeable by the caller

- **Area:** IDENTITY; affects SECURITY, GOVERNANCE, TENANT.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/http/auth.ts:27-78`; `src/http/server.ts:33-45`; `src/http/tenant-governance-enforcer.ts:351-366`; `static/src/admin/api.ts:299-365`.
- **Current behavior:** the server trusts `x-acs-actor-*`, tenant and authentication headers. Disabled mode is authenticated by default. Governance enforcement maps missing/disabled auth and actor types `system` or `governance` to `platform_admin`. The browser stores and edits a mock system actor in `localStorage`.
- **Operational impact:** an untrusted HTTP client can forge a principal, tenant scope or global authority. Correct B01/E01 authorization rules cannot provide security without a trusted principal.
- **Root cause:** inspection/mock context was promoted as the only HTTP identity path.
- **Required target state:** validated tokens or a trusted upstream identity contract with signature, issuer, audience, expiry and key rotation; server-owned principal construction; explicit platform-role assignment; strict development/production profiles.
- **Dependencies / milestone:** precedes all exposed administration and production deployment; Milestone C.
- **Acceptance evidence:** valid/invalid token tests, forged-header rejection, platform-admin negative matrix, tenant-binding tests and production startup refusal without an identity validator.

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
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED for production economics.
- **Evidence:** `src/control-plane/neurons-economic-contract.ts:126-147,139-143`; `src/http/control-plane-context.ts:71-92,369`.
- **Current behavior:** `EconomicService` defaults to `InMemorySettlementProvider`; quotes, reservations, usage, settlements and receipts are held in maps under a zero-valued DEV policy. The provider returns the supplied settlement without external settlement or reconciliation.
- **Operational impact:** state is lost on restart, duplicate settlement and reconciliation cannot be proven, and economic authorization does not establish production financial operation.
- **Root cause:** economic contracts were intentionally bounded ahead of a ledger/settlement adapter.
- **Required target state:** durable economic records, idempotent settlement provider, reconciliation, failure states and explicit non-billing boundary. Billing/pricing are not implied.
- **Dependencies / milestone:** durable persistence and audit; Milestone B.
- **Acceptance evidence:** restart-safe quote/reservation/settlement, duplicate request handling, provider failure/reconciliation and tenant isolation tests.

### ACS-ORG-008 — Real HTTP rejects Product API `PUT` and `DELETE` administration routes

- **Area:** PRODUCT_API; affects CONTROL_PLANE, TENANT, GOVERNANCE.
- **Severity / status:** **BLOCKER**, OPEN — VERIFIED.
- **Evidence:** `src/http/server.ts:11-31`; `src/http/routes/admin-tenant-routes.ts:403-507`; `static/src/admin/api.ts:426-433`; `tests/http.test.mjs:130-134`; D01 tests call `routeProductApiRequest` directly with `PUT`.
- **Current behavior:** the route layer supports policy, entitlement and limit `PUT`/`DELETE`, and the browser client calls them. The actual HTTP handler and CORS preflight allow only `GET`, `POST`, `OPTIONS`, returning `405` before routing.
- **Operational impact:** governance, entitlement and limit mutations certified at route level cannot complete through the shipped HTTP server/UI path.
- **Root cause:** server method allowlist was not updated when the administrative API expanded; integration tests bypassed the entry handler.
- **Required target state:** one method contract across server, CORS, route layer and client, with end-to-end tests through `createAcsHttpHandler`.
- **Dependencies / milestone:** pair with edge/auth changes in Milestone C; no domain redesign.
- **Acceptance evidence:** HTTP-level `PUT`/`DELETE` success and denial tests, browser mutation proof and no permissive method fallback.

### ACS-ORG-009 — Administrative and operational audit history is process-local

- **Area:** OBSERVABILITY; affects PERSISTENCE, SECURITY, OPERATIONS.
- **Severity / status:** **CRITICAL**, OPEN — VERIFIED.
- **Evidence:** `src/control-plane/audit-service.ts:82-142`; admin audit routes query that same service; `src/control-plane/observability.ts:436-450` acknowledges session-scoped retention.
- **Current behavior:** events are redacted, correlated and tenant-queryable, but stored in an array. Restart erases history; replicas have different histories; retention, tamper evidence and export are absent.
- **Operational impact:** privileged actions cannot be reconstructed reliably after restart or across instances, weakening incident response and governance evidence.
- **Root cause:** EPIC-15 completed the event/read model contract without a durable audit adapter.
- **Required target state:** append-only durable audit sink, tenant-scoped query projection, retention/ordering, immutable IDs, delivery failure semantics and optional export boundary.
- **Dependencies / milestone:** durable storage and trusted actor identity; Milestone B, exporter integration in E.
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
- **Evidence:** in `src/http/routes/product-api-routes.ts:798-817`, the runtime guard returns `unsupported_action` for `start`, `stop` and `restart`; later handlers at `:909-928` are therefore unreachable for the same paths. Execution runs are read projections and no supported retry/cancel/remediate flow was found.
- **Current behavior:** runtime application-service methods exist, but the public Product API route rejects their mutations before reaching the handlers. Agent sandbox deployment remains a separate bounded action. No end-to-end run path connects a supported request to remote assignment, durable result and recovery.
- **Operational impact:** an operator cannot reliably execute, observe terminal result, retry safely, cancel or reconcile stuck work.
- **Root cause:** lifecycle and evidence slices were developed independently from a durable dispatch subsystem.
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
