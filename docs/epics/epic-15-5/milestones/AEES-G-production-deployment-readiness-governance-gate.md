# AEES-G — Production Deployment Readiness & Governance Gate

**Date:** 2026-08-16

**Result:** PASS WITH TOPOLOGY AND ENVIRONMENT CAVEATS

**Certified topology:** `PRODUCTION_LIKE_SINGLE_HOST`; global multi-host production remains Milestone H scope.

## Discovery and root cause

The previous path represented deployment authority as `mode === sandbox`. `DeploymentService`, `RuntimeLifecycleService`, the Product API and the OpenClaw adapter rejected every non-sandbox request before a target-specific readiness decision could exist. Agent and deployment projections were also process-local. The guard was correct for the prior topology, but could not express an evidence-backed production allow.

| Component | Before | G result |
| --- | --- | --- |
| Agent revision | process-local repository | SQLite durable repository with CAS/restart semantics |
| Deployment record | process-local map | SQLite durable lifecycle/evidence repository |
| Target | sandbox engine identity | vendor-neutral target contract plus authenticated HTTP production adapter |
| Production policy | blanket sandbox-only | explicit `deployment.production` Tenant governance action |
| Readiness | generic/sandbox projection | server-owned aggregate deployment decision |
| Rollback | unavailable | predecessor-aware, revision-safe, idempotent target operation |

## G01 — target and lifecycle

`HttpProductionTargetEngine` and `ProductionTargetStore` define the certified target `production-single-host`. It is an independent HTTP boundary with bearer service authentication, bounded JSON bodies, durable SQLite target state, health inspection and rollback. It advertises `deployment.live`, `deployment.health`, `deployment.rollback`, `runtime.remote`, `state.durable`, `telemetry.external` and `secrets.references`.

Deployment records persist the exact Agent revision, composition/execution-plan fingerprints, credential reference IDs/versions, target, governance/readiness evidence, health, correlation identifiers and predecessor. Secret material is rejected from the target composition and never enters evidence. Lifecycle writes use repository revision/CAS and only reach `ACTIVE` after target inspection reports ready.

**G01 gate:** PASS. Sandbox/OpenClaw remains supported and explicitly sandbox-only.

## G02 — aggregate production gate

`ProductionDeploymentReadinessEvaluator` evaluates production profile, trusted identity, edge/rate limiter, external secret provider, durable administrative/Agent/deployment/economic/runtime state, recovery, worker service identity/capacity, external telemetry, target eligibility/capabilities and Tenant governance.

Checks are classified as `HARD_BLOCKER`, `REQUIRED`, `DEGRADED_ALLOWED` or `INFORMATIONAL`; each result carries a stable code, reason, required action, evidence and expiry. Production requires an explicit matched `deployment.production` allow. The Product API exposes a read-only evaluation, but `DeploymentService.deploy()` re-evaluates immediately before mutation, preventing UI/client TOCTOU authority. The accepted snapshot is stored with the deployment.

Negative coverage denies development identity, insecure edge/secrets, local runtime, unavailable telemetry/target/worker and governance default-deny. No denied attempt creates a deployment record.

**G02 gate:** PASS.

## G03 — deploy, degradation and rollback

The acceptance uses a production-profile Control Plane context, durable repositories, Vault contract transport, durable economics/rate limiting/runtime, signed worker identity, external OTLP HTTP receiver and an independently addressed production target boundary.

| Scenario | Result |
| --- | --- |
| default Tenant production policy | PASS — denied, zero deployment side effects |
| explicit governance allow plus all checks | PASS — `PRODUCTION_LIKE_SINGLE_HOST` |
| production revision A | PASS — `VALIDATING → DEPLOYING → ACTIVE` after inspection |
| production revision B | PASS — predecessor persisted |
| post-deploy target degradation | PASS — authoritative record became `DEGRADED` with reason code |
| rollback B → A | PASS — B `ROLLED_BACK`, A restored `ACTIVE` |
| duplicate rollback request | PASS — same revision/result; no duplicate operation |
| audit and OTLP evidence | PASS — readiness/deploy/rollback correlated; secret scan zero |
| targeted Control Plane browser regression | PASS when referenced manifest is present; otherwise environment caveat |

The target/exporter acceptance is loopback/process-addressable and therefore production-like, not a multi-host/cloud certification. Infrastructure bootstrap still uses the test harness; the operator decision and actions use Product API/Control Plane contracts.

**G03 gate:** PASS WITH TOPOLOGY CAVEAT.

## Product API and UX

- `GET /api/v1/agents/:agentId/production-readiness?targetId=...`
- `POST /api/v1/agents/:agentId/deploy` with `mode: live`
- `POST /api/v1/deployments/:deploymentId/rollback`

The Agent surface displays the server decision/check blockers, keeps production disabled until allowed, confirms target/Agent revision, states that the server re-evaluates at mutation time, shows live deployment health and exposes rollback only for a degraded live deployment. Browser state is never authoritative.

## Finding and readiness result

- `ACS-ORG-006`: **RESOLVED for the certified topology**. The blanket gate was replaced, not deleted.
- `ACS-ORG-001`: materially reduced; Agent/deployment runtime authority is now single-node durable. Shared managed multi-host storage is not proven.
- `ACS-ORG-002`, `007`, `010`, `018`, `019`, `021`: residual caveats remain unchanged unless separately evidenced by H.
- Operational Ready: **READY for the certified topology / PARTIAL globally**.
- Production Ready: **READY for `PRODUCTION_LIKE_SINGLE_HOST` / PARTIAL globally**.

## Validation and evidence

- `npx tsc -p tsconfig.json --noEmit` — PASS.
- compile to `/tmp/epic15-5-aees-g/dist` — PASS.
- official `npm run build` — environment-blocked by the known `TS5033/EROFS` output path.
- `s56-epic-15-5-production-deployment-gate.test.mjs` — G01/G02/G03 contract and acceptance.
- standalone Control Plane typecheck/build and production UX contract test — PASS.
- browser evidence: `/tmp/acs-epic15-5-aees-g-browser-evidence/manifest.json`.
- aggregate evidence: `/tmp/acs-epic15-5-aees-g-evidence/manifest.json`.

## Deferred to H

Managed multi-host Agent/deployment databases, live external IdP/Vault/limiter/OTLP provider acceptance, cross-host target/worker networking, fleet capacity, infrastructure provisioning and full-system final closure remain explicit H scope. No cloud, multi-host or global Production Ready claim is made here.
