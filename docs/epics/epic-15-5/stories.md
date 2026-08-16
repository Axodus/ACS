# EPIC-15.5 Stories

Stories are ordered by dependency. A story is complete only when its required operational evidence exists; implementation without that evidence is `PARTIAL`.

## Milestone A

### ORG-A01 — Establish the verified operational baseline — COMPLETE

- **Findings:** all A01 inventory inputs.
- **Objective:** distinguish implemented contracts from operational and production readiness.
- **Scope:** repository-wide discovery, evidence, taxonomy, state/adapter inventory, journeys, milestones and gates.
- **Dependencies:** EPIC-10/11/12/14/15 closure documents and current code.
- **Non-goals:** production adapter or UX implementation.
- **Acceptance criteria:** canonical findings, readiness levels and executable backlog are internally consistent.
- **Required evidence:** this package, targeted compile/tests and `git diff --check`.

## Milestone B — Durable Platform State & Production Adapters

### EPIC-15.5-B01 — Durable Control Plane State & HTTP Contract Compatibility — COMPLETE

- **Findings:** ACS-ORG-001, ACS-ORG-008, ACS-ORG-009 and route-order portion of ACS-ORG-017.
- **Objective:** make Tenant Administration recoverable on one node and align the shipped HTTP entry point with declared Product API methods.
- **Scope:** aggregate repository boundaries, atomic administrative snapshot, durable audit store, restart/failure semantics, HTTP/CORS method alignment and runtime start/stop reachability.
- **Dependencies:** EPIC-15 A01–E02 contracts and A01 baseline `ed46412`.
- **Non-goals:** shared production database, multi-instance writers, Agents/deployment/runtime/economic persistence, managed secrets, production identity or remote dispatch.
- **Acceptance criteria:** selected administrative state survives a new context, revisions continue, persistence failure cannot return success, all declared Tenant Administration `PUT`/`DELETE` handlers are reachable, and runtime start/stop route before unsupported guards.
- **Required evidence:** `tests/s45-epic-15-5-durable-http-contract.test.mjs`, affected regressions and `milestones/B01-durable-control-plane-state-http-contract.md`.

### EPIC-15.5-B02 — Production Secrets & Economic State Adapters — COMPLETE

- **Findings:** ACS-ORG-002 and ACS-ORG-007; composition-profile portion of ACS-ORG-001/019/021.
- **Objective:** introduce an external secret-material provider plus durable, idempotent and recoverable economic state.
- **Scope:** Vault KV v2, durable non-secret catalog/credential references, production fail-closed selection, secret lifecycle/isolation/leakage, economic store, settlement provider, atomic projection commit and reconciliation.
- **Dependencies:** B01 adapter composition and EPIC-15 Tenant/audit contracts.
- **Non-goals:** live Vault provisioning, shared cluster database, billing, pricing, broad metering, identity or remote runtime.
- **Acceptance criteria:** raw secrets remain external to ACS persistence/read models; restart resolution and isolation pass; settlement survives restart, is idempotent, and reconciles the provider-success/local-failure window without false success.
- **Required evidence:** `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`, affected regressions and `milestones/B02-production-secrets-economic-adapters.md`.

### ORG-B01 — Introduce explicit development and operational composition profiles — PARTIAL

- **Findings:** ACS-ORG-001, 002, 007, 009, 019, 021.
- **Objective:** prevent silent selection of development adapters in an operational profile.
- **Scope:** adapter configuration contract, startup validation, dependency health and explicit DEV defaults.
- **Dependencies:** decision gates B1–B3.
- **Non-goals:** implement every adapter in this story.
- **Acceptance criteria:** production profile now fails closed for insecure secret/economic adapters and DEV remains deterministic. Agent/deployment/runtime/jobs, identity, limiter and telemetry adapters keep the story `PARTIAL`.
- **Required evidence:** profile matrix, startup tests and configuration documentation.

### ORG-B02 — Persist Tenant, Membership, Governance and Agent truth — PARTIAL

- **Findings:** ACS-ORG-001, 019.
- **Objective:** make administrative and agent state restart-safe and replica-shared.
- **Scope:** repositories, revisions, uniqueness, migrations and compatibility for existing DEV fixtures.
- **Dependencies:** ORG-B01 and gate B1.
- **Non-goals:** new tenant roles, policies or Agent lifecycle states.
- **Acceptance criteria:** Tenant, Membership and Governance now pass single-node restart evidence. Agent persistence and two-instance lost-update proof remain open.
- **Required evidence:** migration, restart, concurrency and tenant isolation tests.

### ORG-B03 — Persist deployment, runtime and execution records

- **Findings:** ACS-ORG-001, 005, 019.
- **Objective:** establish durable operational truth before remote scheduling.
- **Scope:** deployment/runtime/run repositories, idempotency keys, revisions and reconciliation status.
- **Dependencies:** ORG-B01/B02 and gate B1.
- **Non-goals:** remote transport or production target.
- **Acceptance criteria:** state survives ACS restart and one replica can continue reads/mutations after another dies.
- **Required evidence:** restart/multi-instance tests and stale-state recovery contract.

### ORG-B04 — Integrate a managed secret provider — PARTIAL

- **Findings:** ACS-ORG-002.
- **Objective:** store and resolve secrets through a production-grade tenant-scoped provider.
- **Scope:** canonical provider adapter, version/rotation/revoke, availability health, worker-safe references and DEV adapter separation.
- **Dependencies:** ORG-B01, trusted service identity design and gate B2.
- **Non-goals:** secrets UI, provider-specific account directory or exposing raw values.
- **Acceptance criteria:** the B02 production profile never uses memory/filesystem and raw values remain absent from API/audit/errors. Live Vault HA/service identity and shared catalog proof remain open.
- **Required evidence:** B02 provider/restart/isolation/rotation/revoke/exposure tests plus future live-provider acceptance.

### ORG-B05 — Make administrative audit durable and append-only — PARTIAL

- **Findings:** ACS-ORG-009.
- **Objective:** preserve attributable history across restart and replicas.
- **Scope:** append adapter/outbox where required, ordering, retention metadata, query projection and failure semantics.
- **Dependencies:** ORG-B01/B02 and trusted actor contract from C design.
- **Non-goals:** SIEM or arbitrary event query language.
- **Acceptance criteria:** existing event/read contracts remain compatible and history survives a new single-node context. Shared append semantics, retention and transactional resource-plus-audit commit remain open.
- **Required evidence:** restart, replica, correlation, denied-attempt, write-failure and cross-tenant tests.

### ORG-B06 — Persist economics and integrate idempotent settlement — PARTIAL

- **Findings:** ACS-ORG-007.
- **Objective:** make quote/reservation/usage/settlement records recoverable and reconcilable.
- **Scope:** durable records, provider adapter, idempotency and reconciliation states.
- **Dependencies:** ORG-B01, gate B3 and ORG-B05.
- **Non-goals:** billing, pricing, invoices or money movement beyond the approved provider boundary.
- **Acceptance criteria:** duplicate settlement cannot double-apply; restart and provider-to-projection reconciliation pass. Shared/external settlement and multi-instance proof remain open.
- **Required evidence:** B02 restart, duplicate, partial-failure, reconciliation and Tenant-isolation tests plus future concurrent/shared-provider acceptance.

## Milestone C — Production Identity, Security & Edge Controls

### ORG-C01 — Validate incoming production identity — COMPLETE

- **Findings:** ACS-ORG-003.
- **Objective:** construct the actor only from a trusted credential or upstream assertion.
- **Scope:** validator interface/adapter, signature/issuer/audience/expiry, key rotation and DEV/production separation.
- **Dependencies:** gate C1.
- **Non-goals:** user directory, passwords, SCIM or new administrative roles.
- **Acceptance criteria:** caller actor headers are ignored/rejected in operational profile; unauthenticated requests cannot reach authority evaluation.
- **Required evidence:** token/assertion positive and adversarial tests.

Implemented by `tests/s47-epic-15-5-trusted-http-identity.test.mjs` and `milestones/C01-trusted-http-identity-authorization-boundary.md`. Production OIDC mode validates signature/JWKS, issuer, audience, expiration/not-before and subject; DEV headers are isolated in a non-production adapter.

### ORG-C02 — Bind trusted principal, tenant and platform authority — COMPLETE

- **Findings:** ACS-ORG-003.
- **Objective:** feed the existing B01 authority model from authenticated claims without creating parallel RBAC.
- **Scope:** tenant binding, platform role source, service identity and forged-context semantics.
- **Dependencies:** ORG-C01 and durable membership from B02.
- **Non-goals:** Agent Role changes or generic IAM.
- **Acceptance criteria:** platform authority is explicit; path/body/header/context conflicts fail; cross-tenant E01 matrix passes.
- **Required evidence:** forged tenant, self-escalation, removed/suspended member and platform-only negative tests.

C01 completed principal propagation, signed Tenant-claim conflict rejection, explicit platform claim mapping and removed/suspended member HTTP negatives. C02 completed the edge/proxy source matrix. Remote service identity remains Milestone D scope.

### ORG-C03 — Align HTTP method, CORS and request safety contracts — COMPLETE

- **Findings:** ACS-ORG-008, 013.
- **Objective:** make supported Product API routes executable through the real HTTP server and bounded at the edge.
- **Scope:** method/preflight allowlists, allowed headers/origins, body size, timeouts, security headers and trusted proxy policy.
- **Dependencies:** ORG-C01 context design.
- **Non-goals:** new admin mutations.
- **Acceptance criteria:** Tenant governance/entitlement/limit operations pass through `createAcsHttpHandler`; production uses explicit origins; Authorization preflight, body bounds, server timeouts, proxy policy and security headers are enforced and tested.
- **Required evidence:** HTTP-level integration, preflight, oversize, timeout and proxy spoof tests.

### ORG-C04 — Implement distributed rate limiting — COMPLETE WITH CAVEAT

- **Findings:** ACS-ORG-010.
- **Objective:** enforce abuse limits from trusted tenant/principal/IP context across replicas.
- **Scope:** adapter, keys, endpoint classes, retry-after and backend failure behavior.
- **Dependencies:** ORG-C01/C02 and gate C2.
- **Non-goals:** generic WAF or billing quotas.
- **Acceptance criteria:** client headers cannot alter counters; two instances share enforcement.
- **Required evidence:** concurrency, multi-instance, reset, sensitive-route and backend-outage tests.

ORG-C03 and ORG-C04 are the implementation stories consumed together by **Sprint C02 — Distributed Rate Limiting & HTTP Edge Hardening**. They remain separate stories because their failure semantics and acceptance evidence differ.

C02 completed both application boundaries. Two independent SQLite-backed instances share an atomic bucket and client-controlled keys/forwarding headers cannot select a bucket. ORG-C04 retains a deployment caveat: multi-host/global-provider acceptance remains H/`ACS-ORG-019`, so `ACS-ORG-010` is partial rather than fully closed.

## Milestone D — Distributed Runtime & Execution Readiness

### ORG-D01 — Define durable job, attempt and lease state

- **Findings:** ACS-ORG-005, 017, 019.
- **Objective:** make dispatch intent and outcomes durable, idempotent and recoverable.
- **Scope:** job state machine, attempts, lease fencing, idempotency, retry/dead-letter and cancellation contracts.
- **Dependencies:** B03 and gate D1.
- **Non-goals:** generic workflow engine.
- **Acceptance criteria:** no partial side effect before durable intent; duplicate delivery resolves deterministically.
- **Required evidence:** transition, timeout, duplicate, cancellation and crash tests.

The implementation must also remove the current route-order contradiction by making the approved runtime command reachable through the real HTTP handler; it must not merely expose the existing local service without durable dispatch.

### ORG-D02 — Connect authenticated remote workers to Product API execution

- **Findings:** ACS-ORG-004, 021.
- **Objective:** execute an ACS operation across a real process/network boundary.
- **Scope:** registration, heartbeat, capabilities, authenticated dispatch, result correlation and production-local fallback prohibition.
- **Dependencies:** C identity, D01 and managed secrets B04.
- **Non-goals:** autoscaling platform or broad worker fleet UI.
- **Acceptance criteria:** the normal Product API path dispatches remotely and preserves tenant/workload/governance receipts.
- **Required evidence:** second-process/host execution, network loss, wrong-tenant, wrong-worker and no-local-fallback tests.

### ORG-D03 — Implement worker/runtime recovery and reconciliation

- **Findings:** ACS-ORG-005, 017, 018.
- **Objective:** recover safely from worker loss, ACS restart and stale runtime state.
- **Scope:** heartbeat expiry, requeue, orphan reconciliation, retry exhaustion, cancel and semantic recovery commands.
- **Dependencies:** D01/D02 and durable audit.
- **Non-goals:** production deploy rollback, handled in G.
- **Acceptance criteria:** terminal outcome is reconstructable and operator commands cannot duplicate side effects.
- **Required evidence:** failure-injection and restart/recovery matrix.

## Milestone E — Observability & Operational Diagnostics

### ORG-E01 — Export structured operational telemetry

- **Findings:** ACS-ORG-011.
- **Objective:** make HTTP, domain, dispatcher, worker and provider degradation externally observable.
- **Scope:** logs, metrics, traces, correlation/redaction, exporter health and retention contract.
- **Dependencies:** B05, D02 and gate E1.
- **Non-goals:** generic observability platform or SIEM.
- **Acceptance criteria:** operator can diagnose an injected failure without shell access and exporter failure is itself visible.
- **Required evidence:** external sink artifacts, redaction scan, correlation trace and alert test.

### ORG-E02 — Implement dependency-aware liveness and readiness

- **Findings:** ACS-ORG-012.
- **Objective:** make traffic readiness distinct from process liveness and readiness levels unambiguous.
- **Scope:** live adapter probes, stale policy, reason codes and Development/Integration/Operational/Production level projection.
- **Dependencies:** B–E01 adapters.
- **Non-goals:** automatically enabling production deployment.
- **Acceptance criteria:** dependency failure removes readiness while liveness stays up; local worker cannot satisfy distributed readiness.
- **Required evidence:** dependency matrix and load-balancer-style probe tests.

## Milestone F — End-to-End Product UX Operationalization

### ORG-F01 — Establish one authenticated Control Plane boundary

- **Findings:** ACS-ORG-014, 023.
- **Objective:** provide one actor/session/navigation contract across tenant and operational surfaces.
- **Scope:** consolidate builds or securely federate them, reconcile route/capability inventory and deep-link/forbidden behavior.
- **Dependencies:** C01–C03.
- **Non-goals:** global redesign or new design system.
- **Acceptance criteria:** operator moves from tenant to agent/operations/audit without changing identity context or using mock selectors.
- **Required evidence:** browser route/session/navigation matrix.

### ORG-F02 — Complete governed composition and secret-reference UX

- **Findings:** ACS-ORG-015, 016.
- **Objective:** configure a real Agent without files, fixtures or direct repository calls.
- **Scope:** semantic Product API mutations and UI for roles/profiles/capabilities/tools/plugins/provider/engine and managed secret references.
- **Dependencies:** B04, C authority and existing compatibility/readiness models.
- **Non-goals:** generic plugin marketplace, policy DSL or secret value display.
- **Acceptance criteria:** create-to-ready Agent flow is governed, auditable and tenant-scoped.
- **Required evidence:** API and browser positive/negative journey.

### ORG-F03 — Complete execution and remediation UX

- **Findings:** ACS-ORG-017, 018.
- **Objective:** execute, inspect, retry/cancel and verify recovery through supported surfaces.
- **Scope:** D commands/read models, actionable diagnostics, pending/success/failure states and audit correlation.
- **Dependencies:** D01–D03 and E01/E02.
- **Non-goals:** production target enablement.
- **Acceptance criteria:** an injected sandbox failure is detected, remediated and verified without shell access.
- **Required evidence:** browser mutation/recovery proof and audit event correlation.

### ORG-F04 — Reconcile readiness language and source hygiene

- **Findings:** ACS-ORG-022, 023, 024.
- **Objective:** ensure every UI/document/source points to the current capability truth.
- **Scope:** capability labels, demo qualification, legacy projections and tracked backups.
- **Dependencies:** F01 and E02 vocabulary.
- **Non-goals:** marketing redesign.
- **Acceptance criteria:** no contradictory tenant/readiness status, unmanaged backups or unsupported production claim remains.
- **Required evidence:** textual/route inventory and browser review.

## Milestone G — Production Deployment Readiness & Governance Gate

### ORG-G01 — Certify production deployment prerequisites

- **Findings:** ACS-ORG-006.
- **Objective:** convert B–F outputs into a fail-closed production gate.
- **Scope:** dependency checklist, target contract, capacity/isolation/secrets/observability/recovery requirements and approval record.
- **Dependencies:** all B–F exit gates.
- **Non-goals:** removing sandbox guards before approval.
- **Acceptance criteria:** each prerequisite has live evidence and a failed prerequisite deterministically blocks deployment.
- **Required evidence:** signed gate report and negative dependency matrix.

### ORG-G02 — Add and prove a production target with rollback

- **Findings:** ACS-ORG-006.
- **Objective:** deploy safely to an approved non-sandbox target.
- **Scope:** target adapter, rollout, health, rollback, audit and operator controls.
- **Dependencies:** G01.
- **Non-goals:** multi-cloud abstraction or fleet autoscaling.
- **Acceptance criteria:** canary deploy and injected failure rollback complete through supported paths.
- **Required evidence:** target artifacts, health/telemetry, rollback receipt and browser/API proof.

## Milestone H — Full-System Acceptance & Gap Closure

### ORG-H01 — Certify the complete operational journey and close findings

- **Findings:** ACS-ORG-020 and all remaining OPEN findings.
- **Objective:** determine the highest evidence-supported readiness level.
- **Scope:** full regressions, restart, multi-instance, remote execution, security, failure injection, browser/accessibility/overflow and closure docs.
- **Dependencies:** G exit.
- **Non-goals:** feature expansion.
- **Acceptance criteria:** every finding is `CLOSED`, `ACCEPTABLE_DEFERRED` or explicitly `FAILED/BLOCKED`; no hidden gap is called PASS.
- **Required evidence:** reproducible manifests, counts, artifacts, environment caveats and final readiness statement.
