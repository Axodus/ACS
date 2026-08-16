# UX Operational Audit

**Assessment date:** 2026-08-16
**Current evidence:** AEES-F browser manifest at `/tmp/acs-epic15-5-aees-f-evidence/manifest.json`.

## Classification

- **SUPPORTED:** real Product API path and operator surface exist for the bounded behavior.
- **PARTIAL:** the supported path works, but a declared topology/provider/remediation boundary remains.
- **BACKEND_ONLY:** an application capability exists without a supported operator surface.
- **BLOCKED:** a deliberate safety/readiness gate prevents the step.
- **DEFERRED:** not required for the supported AEES-F journey.

## Current surface inventory

| Capability | API | Main Control Plane | Tenant Administration | Manual workaround | Status |
| --- | --- | --- | --- | --- | --- |
| Agent create/edit | semantic definition/revision mutations | form uses Product API catalogs | N/A | none | SUPPORTED |
| Role/profile/model | authoritative catalogs + Agent definition | selectable in create/edit | N/A | none | SUPPORTED |
| Capabilities/skills/tools | authoritative catalogs + Agent definition | selectable in create/edit | N/A | none | SUPPORTED for Agent assignment |
| Secret references | create/rotate/revoke/describe | write-only Credentials surface | N/A | none | SUPPORTED |
| Agent readiness | Agent readiness + deployment plan | Agent operations panel | N/A | none | SUPPORTED |
| Sandbox deploy | governed Agent deploy | Agent operations panel | N/A | none | SUPPORTED |
| Runtime execution | durable start/cancel/read/diagnostics | Agent Execute + Executions | N/A | none | SUPPORTED |
| Jobs/results | list/detail/events/diagnostics | Executions list/detail | N/A | none | SUPPORTED |
| Workers | list/detail/capabilities/heartbeat | Workers list/detail | N/A | none | SUPPORTED read |
| Recovery | automatic lease/orphan recovery + events | timeline/diagnostics; cancellation | N/A | infrastructure action external | PARTIAL |
| Operations/readiness | dependency-aware operational status | System/Operations | N/A | none for diagnosis | SUPPORTED |
| Tenant administration | real lifecycle/membership/governance/entitlement/limit/audit | federated navigation | full administration app | none | SUPPORTED |
| Audit | scoped Product API | linked/federated | Audit tab | none | SUPPORTED |
| Production deploy/rollback | sandbox gate only | correctly blocked | N/A | not supported | BLOCKED until G |

## Journey A — Agent lifecycle

| Step | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Create Agent | `/agents/new` | SUPPORTED | browser mutation |
| Role/profile | Product API catalog selectors | SUPPORTED | Journey A selects `role.executor`/`profile.default` |
| Model strategy | provider/model selectors | SUPPORTED | deployment eligibility assertion |
| Capabilities/skills/tools | catalog checkboxes | SUPPORTED | Journey A performs real assignments |
| Secret reference | `/credentials` + Agent form | SUPPORTED | write-only mutation and zero plaintext |
| Readiness | Agent detail | SUPPORTED | missing strategy regression plus eligible composed Agent |
| Deploy | Agent detail | SUPPORTED for sandbox | accepted deployment mutation |
| Inspect | Agent detail/Executions | SUPPORTED | state and next action linked |

**Journey result:** **SUPPORTED for the approved sandbox topology**. Production target enablement remains G.

## Journey B — Execution

| Step | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Select deployed Agent | Agent detail | SUPPORTED | Journey A/B continuity |
| Start | Execute action | SUPPORTED | durable runtime job created |
| Observe queue/running | Executions | SUPPORTED | remote queued/running state |
| Inspect assignment/worker | Job detail/Workers | SUPPORTED | durable worker and assignment IDs |
| Inspect result | Job detail | SUPPORTED | terminal `succeeded` after recovery |
| Cancel | Job detail confirmation | SUPPORTED for non-terminal jobs | `s55` contract |
| Retry/reassignment | backend policy + timeline | SUPPORTED automatic / PARTIAL manual | recovery attempt visible; no fake force-retry |

**Journey result:** **SUPPORTED**, with explicit automatic-recovery boundary.

## Journey C — Failure and recovery

| Step | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Detect | Operations/Executions | SUPPORTED | worker/no-capacity/failure states |
| Identify cause | diagnostic reason code | SUPPORTED | `INJECTED_RETRYABLE_FAILURE` and dependency codes |
| Inspect timeline | Job events | SUPPORTED | crash, lease recovery, reassignment, completion |
| Recommended action | diagnostic projection | SUPPORTED | contextual action copy |
| Remediate | cancel or backend-owned recovery | PARTIAL | safe supported actions only |
| Verify | Job/Operations refresh | SUPPORTED | terminal state/attempt 2 |

**Journey result:** **SUPPORTED for automatic recovery and cancellation; PARTIAL for external infrastructure remediation**.

## Journey D — Tenant Administration

| Step | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Trusted session | federated applications | SUPPORTED | actor/platform selectors removed |
| Tenant list/detail/create | Tenant Administration | SUPPORTED | Journey F mutation |
| Members/authority | members tab | SUPPORTED | route matrix |
| Governance | governance tab | SUPPORTED | Journey F |
| Entitlements/limits | corresponding tabs | SUPPORTED | route matrix and B01 method contract |
| Audit | audit tab | SUPPORTED | real tenant-scoped history route |
| Unauthorized user | protected app | SUPPORTED denial | Journey G |

**Journey result:** **SUPPORTED**. State durability remains bounded by B01 topology caveats, not by UX fragmentation.

## Journey E — Operator readiness

| Step | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Liveness vs readiness | `/readiness`, `/operations` | SUPPORTED | separate status presentation |
| Dependency degradation | Operations | SUPPORTED | stable reason/action mapping |
| Impacted capability | dependency card/job diagnostic | SUPPORTED | no eligible worker scenario |
| Remediation path | recommended action/deep link | SUPPORTED guidance | Journey E |
| Production gate | Agent deploy/System status | BLOCKED by design | sandbox policy retained |

**Journey result:** **SUPPORTED for current operations; production deployment remains blocked until G**.

## Error and permission UX

- `401` is authentication failure; `403` is authenticated but insufficient authority.
- `429` shows rate-limited state and respects `Retry-After` instead of aggressive retry.
- `503` identifies dependency unavailability and links the operator to Operations.
- Failed jobs expose reason codes and recommended actions rather than raw JSON.
- Foreign Tenant/job resources remain hidden by the Product API; protected content is not rendered before denial.

Browser acceptance explicitly exercised `403`, `429` and `503`.

## Hidden operational steps after AEES-F

Normal supported journeys no longer require shell, curl, SQLite inspection, local actor injection or file editing. These deployment prerequisites remain external and explicit:

- starting/configuring a remote worker process or infrastructure capacity;
- configuring live OIDC, Vault, OTLP and shared storage endpoints;
- production target provisioning and rollback controls;
- multi-host/network topology acceptance.

They are not represented as completed UI capabilities.

## Final UX certification

```text
Agent Lifecycle: SUPPORTED
Execution: SUPPORTED
Tenant Administration: SUPPORTED
Failure Diagnostics: SUPPORTED
Automatic Recovery Visibility: SUPPORTED
Infrastructure Remediation: PARTIAL/EXTERNAL
Production Deployment: BLOCKED
Backend-only critical supported journeys: 0
```

Operational Ready is **READY for the certified multi-process single-host sandbox topology** and **PARTIAL globally**. Production Ready remains **BLOCKED**.
