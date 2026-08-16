# EPIC-15.5 Stories — Final Gate Inventory

**EPIC status:** **CLOSED WITH CERTIFICATION LIMITS**

These stories are grouped by operational flow. Historical implementation details remain in milestone reports; this file records final acceptance.

## Flow A — Discover and classify

| Story | Outcome | Status |
| --- | --- | --- |
| inventory production state/adapters/trust paths | 24 canonical findings with evidence | **DONE** |
| separate contract, implementation, adapter and operational proof | final architecture/readiness vocabulary | **DONE** |
| sequence blockers into executable milestones | A–H plan and gates | **DONE** |

## Flow B — Persist authoritative state

| Story | Outcome | Status |
| --- | --- | --- |
| preserve Tenant/membership/governance/audit through restart | durable administrative repository boundary | **DONE** |
| make HTTP methods match Product API | real route-aware method handling | **DONE** |
| protect secret material behind production provider boundary | Vault KV v2 + durable metadata/no-leak | **DONE WITH LIVE-PROVIDER DEFERRAL** |
| make economics/settlement durable and idempotent | restart/reconciliation semantics | **DONE** |

## Flow C — Establish trusted edge identity

| Story | Outcome | Status |
| --- | --- | --- |
| authenticate before authority | OIDC/JWT validator and trusted principal context | **DONE** |
| prevent actor/platform/header spoofing | real-server negative matrix | **DONE** |
| enforce real rate limits and HTTP hardening | server-owned buckets, proxy/CORS/bounds/headers | **DONE WITH CROSS-HOST DEFERRAL** |

## Flow D — Run and recover remotely

| Story | Outcome | Status |
| --- | --- | --- |
| persist jobs/workers/assignments/leases/results | durable runtime state | **DONE** |
| fence stale owners | monotonic token and commit validation | **DONE** |
| execute in independent worker process | authenticated remote pull/result path | **DONE** |
| recover worker/Control Plane failure | lease expiry, requeue, retry and single-winner recovery | **DONE** |

## Flow E — Observe and diagnose

| Story | Outcome | Status |
| --- | --- | --- |
| export structured logs/metrics/traces | bounded OTLP external-process path | **DONE** |
| correlate request to worker/result | distributed context and stable IDs | **DONE** |
| expose dependency-aware readiness | liveness/readiness/reason/action model | **DONE** |
| diagnose incidents without shell/SQLite | authorized operational read models | **DONE** |

## Flow F — Operate through supported UX

| Story | Outcome | Status |
| --- | --- | --- |
| unify Agent/runtime/operations/Tenant navigation | securely federated Control Plane journey | **DONE** |
| expose secret/readiness/deploy lifecycle | supported write-only/product-backed flow | **DONE** |
| expose jobs/workers/recovery/remediation | list/detail/timeline/reason/action UX | **DONE** |
| certify browser journeys and accessibility | 56/56 final matrix | **DONE** |

## Flow G — Govern production deployment

| Story | Outcome | Status |
| --- | --- | --- |
| formalize durable target/deployment lifecycle | revision/evidence/health/rollback contracts | **DONE** |
| replace sandbox blanket with aggregate gate | hard/soft checks plus explicit governance allow | **DONE** |
| prove deny, deploy, health, degradation and rollback | production-like acceptance | **DONE WITH TOPOLOGY LIMITS** |

## Flow H — Certify and close

| Story | Outcome | Status |
| --- | --- | --- |
| classify live-provider/topology proof | H01 manifest with PROVEN/NOT_PROVEN | **DONE** |
| execute B–G full regression/security/browser | 569 serial, 47 concurrent core, 56 browser | **DONE** |
| terminally classify all findings | 17 resolved, 7 deferred, 0 open blockers | **DONE** |
| define certified topology/global claim | readiness matrix and non-guarantees | **DONE** |
| publish closure report and synchronize docs | normative H closure package | **DONE** |

## Deferred certification stories

These are not incomplete EPIC-15.5 stories. They are future topology targets:

- certify live managed IdP/Vault and provider HA/service identity;
- certify networked shared state and limiter across hosts;
- certify cross-host Control Planes/workers and network partitions;
- certify a managed telemetry backend and real cloud target;
- automate external infrastructure bootstrap/remediation.

They must not expand the current global claim without new acceptance evidence.
