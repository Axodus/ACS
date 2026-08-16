# AEES-F — End-to-End Operational UX Certification

> Historical milestone snapshot. Partial/readiness labels below describe AEES-F at execution time; current terminal finding status is authoritative in `../operational-gap-inventory.md` and the H closure report.

**Date:** 2026-08-16
**Result:** **PASS WITH TOPOLOGY AND ENVIRONMENT CAVEATS**
**Production Ready:** **BLOCKED** — Milestones G/H remain mandatory.

## Executive result

AEES-F closes the supported sandbox operator journey across the main Control Plane, Tenant Administration, durable remote runtime and operational diagnostics. An authenticated operator can create and compose an Agent from Product API catalogs, create a write-only secret reference, inspect readiness, deploy to the approved sandbox target, start remote execution, observe durable job/worker state, diagnose failure/recovery, cancel a non-terminal job and administer Tenant governance/audit without shell, manual API calls or direct storage access.

The two frontend builds remain separately deployed, but they now form an explicit secure federation: shared bearer/session semantics, visible server-owned Tenant context, reciprocal navigation and no browser-controlled actor/platform authority. No domain state or authority rule was duplicated in either UI.

## Initial discovery and capability inventory

| Capability | Product API before F | Operator surface before F | AEES-F result |
| --- | --- | --- | --- |
| Agent create/edit | yes | partial | **SUPPORTED** with role/profile/model/capability/skill/tool/credential composition |
| Secret lifecycle | provider/store existed | backend-only | **SUPPORTED** create/rotate/revoke; value remains write-only |
| Readiness/deploy | yes | fragmented | **SUPPORTED** on Agent detail, sandbox gate preserved |
| Runtime jobs | durable reads existed | backend-only | **SUPPORTED** list/detail/timeline/diagnostics/cancel |
| Workers | durable reads existed | backend-only | **SUPPORTED** list/detail/capability/heartbeat/assignment inspection |
| Recovery | automatic | backend-only | **SUPPORTED visibility**; destructive infrastructure control remains out of scope |
| System readiness | dependency-aware API | backend-only | **SUPPORTED** Operations surface with reason/action mapping |
| Tenant Administration | separate application | separate/mock actor | **SUPPORTED secure federation** using trusted HTTP context |
| Audit | tenant-scoped API | Tenant Administration tab | **SUPPORTED** and linked from the unified navigation |

## F01 — Unified navigation and journey closure

### Navigation architecture

The main shell now exposes Agents, Executions, Workers, System/Operations, Secret references and Tenant Administration. Tenant Administration remains its own Vite application but is intentionally federated rather than presented as an unrelated product. Navigation preserves the same authenticated HTTP boundary and never reconstructs authority from local storage.

### Agent lifecycle

The create/edit form consumes authoritative Product API catalogs for:

- role and profile;
- model provider and model strategy;
- capabilities, skills and tools;
- credential connection references.

Readiness now blocks a composition that lacks `modelStrategy` with `AGENT_MODEL_STRATEGY_REQUIRED`; the deployment plan is likewise ineligible. This removed the acceptance-only permissive gap discovered while running Journey A.

### Secret UX

The `Credentials` surface supports create, rotate and revoke. Administrative reads expose only metadata, status and version. The Product API writes secret material through the configured secret provider, persists only the safe credential reference and emits `secret.created`, `secret.rotated` and `secret.revoked` audit events without plaintext.

### F01 gate

**PASS.** Normal sandbox configuration no longer requires a manual Product API call. Agent composition, write-only secret references, readiness and deploy are connected through the supported UI. Tenant Administration is securely federated and stale “future scope” navigation copy was removed.

## F02 — Runtime, recovery and remediation UX

### Executions

`/executions` and `/executions/:jobId` expose status, attempt, Agent, worker, timestamps, result/failure summary, durable events and diagnostics. Filters cover status, Agent and failure/recovery text. Cancellation is offered only for non-terminal states and requires confirmation.

Automatic retry/reassignment remains backend-owned. The UI presents recovery events, prior/current worker identity, attempt progression and the diagnostic recommended action. It does not expose fencing controls or invent a client-side retry state.

### Workers

`/workers` and `/workers/:workerId` expose durable registration status, capabilities, heartbeat age and current assignment. Service credentials and secret material are never returned. Starting infrastructure or autoscaling a worker remains an explicit external remediation, not a fake UI action.

### Operations

`/operations` consumes the E02 dependency-aware status projection and distinguishes liveness, readiness, degraded, blocked and unknown states. Stable reason codes map to bounded guidance, including `NO_ELIGIBLE_WORKERS`, `SECRET_PROVIDER_UNREACHABLE` and `RATE_LIMITER_UNAVAILABLE`.

Structured HTTP errors distinguish authentication/authority, rate limiting and dependency outage. `429` observes `Retry-After`; `403` is not presented as a retryable system failure.

### F02 gate

**PASS.** Jobs, workers, diagnostics, durable cancellation, recovery visibility and dependency remediation guidance are operable through supported surfaces. Remote process management, force recovery and infrastructure autoscaling were not invented.

## F03 — Browser operational acceptance

### Topology

```text
Chromium 151
  -> Control Plane gateway/process
  -> Tenant Administration gateway
  -> ACS Product API process PID 762265
  -> shared durable runtime SQLite
  -> worker-primary PID 762519
  -> worker-recovery PID 762628
  -> worker-failure PID 762649
```

Classification: `MULTI_PROCESS_SINGLE_HOST`. Multi-host/browser-to-live-IdP acceptance remains H scope.

### Journey results

| Journey | Result | Evidence |
| --- | --- | --- |
| A — Agent lifecycle | PASS | write-only credential, governed composition, readiness and sandbox deploy |
| B — Execution | PASS | browser start created a durable job and remote assignment |
| C — Recovery | PASS | primary worker killed; lease recovery reassigned and completed attempt 2 |
| D — Failed job | PASS | `INJECTED_RETRYABLE_FAILURE`, terminal diagnostic and recommended action |
| E — Dependency/capacity | PASS | no eligible worker visible in Operations with remediation |
| F — Tenant Administration | PASS | tenant create, detail and governance without disconnected actor setup |
| G — Authorization | PASS | authenticated principal without platform authority receives coherent denial |

Runtime linkage from the final manifest:

```text
jobId: job_eaef469e-032a-4ee6-bbca-851d6ce80ff6
assignmentId: assign_77635ed8-0f60-4dc7-979a-f490a175efcc
workerId: worker-f-primary
finalStatus: succeeded
attempt: 2
```

### Browser evidence

```text
routes/viewports: 56/56 PASS
unique routes: 14
viewports: 4/4
route screenshots: 56
critical journey screenshots: 6
total screenshots: 62
accessibility: 56/56 checks PASS
keyboard dialog flow: PASS
horizontal overflow failures: 0
page errors: 0
console errors: 0
sensitive evidence matches: 0
manifest: /tmp/acs-epic15-5-aees-f-evidence/manifest.json
```

Viewports: `1440x900`, `1280x800`, `768x1024`, `390x844`.

Routes: `/agents`, Agent detail, `/credentials`, `/executions`, `/workers`, `/operations`, `/readiness`, and Tenant list/detail/members/governance/entitlements/limits/audit.

### F03 gate

**PASS.** All journeys A–G used browser actions over the real Product API/runtime topology. The harness made no manual API calls to fill an intermediate operator step; API usage was limited to fixture/topology control and independent assertions.

## Contract and security adjustments

- Added write-only credential create/rotate/revoke routes with tenant authority and audit attribution.
- Added durable job cancellation route and Tenant hiding for foreign job IDs.
- Added Agent readiness/deployment-plan blocker for missing model strategy.
- Allowed cross-origin resource responses only for a CORS-approved origin; same-origin remains the default.
- Removed browser actor/platform authority reconstruction from Tenant Administration.
- Removed tracked divergent `.bak`/`.backup` sources and added ignore rules.

## Validation

| Validation | Result |
| --- | --- |
| Backend `tsc --noEmit` | PASS |
| Backend official build | **ENVIRONMENT BLOCKER** — `TS5033`/`EROFS` writing `dist` |
| Backend temporary emit | PASS — `/tmp/acs-epic15-5-aees-f-final` |
| Main Control Plane typecheck | PASS |
| Main Control Plane build | PASS |
| Tenant Administration typecheck | PASS |
| Tenant Administration official build | **ENVIRONMENT BLOCKER** — `tsbuildinfo` `EROFS` |
| Current hardening/edge/AEES-F contracts (`s28`, `s48`, `s55`) | 26 PASS / 0 FAIL |
| Consolidated B01–E/Tenant regression | 65 PASS / 1 transient parallel failure |
| Isolated rerun of transient `s50` | 3 PASS / 0 FAIL |
| Browser acceptance | 56/56 route-viewports; journeys A–G PASS |

The sole consolidated-suite failure was `s50` reporting a worker-side `fetch failed` under concurrent multi-process suites. The stronger `s51` process certification passed in that run, and `s50` passed 3/3 immediately when isolated. It is classified as test-environment contention, not a confirmed product regression.

## Finding updates

| Finding | Status after AEES-F | Rationale |
| --- | --- | --- |
| ACS-ORG-014 | **RESOLVED** | coherent secure federation, navigation and trusted session context |
| ACS-ORG-015 | **RESOLVED for supported Agent composition** | Product API-backed role/profile/model/capability/skill/tool/reference form and browser proof |
| ACS-ORG-016 | **RESOLVED for supported secret lifecycle** | write-only create/rotate/revoke, isolation/no-leak contracts and browser proof |
| ACS-ORG-017 | **RESOLVED for supported sandbox execution UX** | start, job/worker observation, result, diagnostics and cancel surface |
| ACS-ORG-018 | **PARTIALLY_RESOLVED** | automatic recovery and safe cancellation are visible/actionable; infrastructure remediation remains external |
| ACS-ORG-021 | **PARTIALLY_RESOLVED** | normal supported journey is shell-free; worker/provider deployment configuration remains engineering scope |
| ACS-ORG-022 | **RESOLVED for active Control Plane language** | readiness is level/topology-qualified |
| ACS-ORG-023 | **RESOLVED** | Tenant Administration is no longer projected as future scope in active navigation |
| ACS-ORG-024 | **RESOLVED** | divergent tracked backups removed and ignored |

## Readiness and caveats

| Dimension | Status |
| --- | --- |
| Agent lifecycle | READY for supported sandbox topology |
| Execution UX | READY for supported remote topology |
| Failure diagnostics | READY |
| Recovery UX | PARTIAL — automatic recovery/cancel supported; infrastructure actions external |
| Tenant Administration | READY for supported authenticated boundary |
| Operational Ready | **PARTIAL / READY FOR CERTIFIED TOPOLOGY** |
| Production Ready | **BLOCKED** |

Residual caveats:

- browser/runtime acceptance is multi-process single-host, not multi-host;
- official backend/static builds are blocked by workspace `EROFS`, while typecheck/temp builds pass;
- Agent/deployment authoritative projections are not yet fully shared multi-instance state;
- production deployment remains sandbox-gated until G;
- live IdP, Vault, telemetry retention/alert routing and managed multi-host topology remain H/live-environment evidence.

## Deferred scope

Production deployment/rollback, infrastructure autoscaling, worker process management, Vault administration, IdP provisioning, SCIM, billing, generic workflow engines, multi-host runtime infrastructure and a generic observability dashboard remain outside AEES-F.
