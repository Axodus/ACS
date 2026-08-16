# AEES-D — Distributed Runtime & Recovery Certification

> Historical milestone snapshot. Partial/readiness labels below describe AEES-D at execution time; current terminal finding status is authoritative in `../operational-gap-inventory.md` and the H closure report.

**Date:** 2026-08-16
**Status:** **PASS WITH TOPOLOGY CAVEATS**
**Blocks:** D01 → D02 → D03

## Executive result

AEES-D replaces the active production runtime path that directly invoked a local worker with a durable, worker-pull protocol. Runtime start now persists a job before execution. An independently authenticated worker registers, heartbeats, atomically claims compatible work, receives a lease and fencing token, executes through its own engine process, and submits an idempotent durable result. A recovery coordinator reclaims expired or orphaned ownership.

The final acceptance launched two Control Plane processes and two worker processes over one SQLite runtime database. It proved exclusive ownership, cross-process completion, worker crash/reassignment, monotonic fencing, stale-result rejection, Control Plane restart, duplicate-result idempotency, cancellation ordering, no-worker backpressure and shared recovery coordination.

This is not a multi-host production certification. The runtime store is `SINGLE_NODE_DURABLE / SHARED_DATABASE_MULTI_INSTANCE / MULTI_HOST_NOT_PROVEN`, and the signed worker credential is a bounded ACS service-identity mechanism rather than live workload OIDC or mTLS.

## Initial discovery

| Runtime component | Previous holder | Durable? | Remote? | Recovery? | Previous authority |
| --- | --- | ---: | ---: | ---: | --- |
| Job/runtime intent | `RuntimeLifecycleService` map | No | No | No | mixed local record/engine observation |
| Assignment | `WorkerAssignmentService` map | No | No | expiry only in process | process-local |
| Worker | `WorkerRegistry` map | No | No | No | process-local singleton composition |
| Lease | assignment object/timer semantics | No | No | no restart scan | implicit local ownership |
| Execution result | runtime map/engine result | No | No | No | process-local |
| Cancellation | local runtime command | No | No | No | process-local boolean/record |
| Deployment runtime state | deployment/runtime maps | No | No | No | process-local |

The Product API `start`/`stop` handlers were reachable after B01, but the normal path still called the local engine. Worker contracts existed separately and did not constitute dispatch.

## D01 — Durable Job State, Worker Registry & Lease Recovery

### Canonical state

`ExecutionJob` persists Tenant, runtime/deployment/Agent identifiers, workload, eligibility requirements, correlation/idempotency keys, attempt budget, status, revision, result/error and timestamps.

The implemented lifecycle is:

```text
QUEUED → ASSIGNED → RUNNING → SUCCEEDED
                     ├──────→ FAILED
                     └──────→ CANCEL_REQUESTED → CANCELLED
QUEUED ────────────────────────────────────────→ CANCELLED
ASSIGNED/RUNNING + expired ownership → QUEUED or FAILED
```

Terminal states cannot regress. All writes use transactions plus revision/status compare-and-set checks.

### Runtime repository

`SqliteDurableRuntimeState` owns four normalized durable tables:

- `runtime_jobs`;
- `runtime_workers`;
- `runtime_assignments`;
- `runtime_events`.

SQLite runs in WAL mode with foreign keys and bounded busy handling. Claims use `BEGIN IMMEDIATE`, a partial unique index for one active assignment per job, job revision checks and an incrementing `next_fencing_token`. Empty worker polls are read-only and do not take the single writer lock.

### Worker registry and heartbeat

Worker registrations persist identity binding, instance, declared capabilities, status, active runs, revision, last heartbeat and expiry. Capabilities include engine, runners, providers, isolation/deployment modes, target IDs and concurrency. Workers become ineligible after expiry and may be marked `OFFLINE` by recovery without requiring clean shutdown.

### Lease and fencing semantics

Every assignment contains a unique assignment ID, lease ID, worker/instance binding, expiry, attempt and fencing token. Every state-changing worker request must reproduce that ownership tuple. Reassignment increments the fencing token; a prior epoch cannot renew, start, fail, cancel or commit a result.

The final fencing proof used:

```text
job: job_72b357c7-e16f-437f-b535-35da3a09b031
assignment 1: assign_0bfdcf24-a09c-44b0-8e3c-28041e8fecda / token 1
assignment 2: assign_f3a3c59d-a7b3-4f90-833b-e7c41c588ab5 / token 2
late token 1 result: 409 stale_worker_ownership
```

### Recovery and failure semantics

`RuntimeRecoveryCoordinator` scans durable state. It marks expired workers offline, expires invalid assignments, decrements worker occupancy and transitions jobs to `QUEUED`, `CANCELLED` or terminal `FAILED` according to cancellation and attempt policy. Competing coordinators rely on the same transaction/CAS boundary, so only one transition wins.

Persistence or ownership failure never returns success. Result data is committed before the worker receives `200`. Duplicate submission with the same assignment/fencing idempotency key returns the existing terminal record without repeating effects.

### D01 gate

| Requirement | Result |
| --- | --- |
| Durable jobs/assignments/workers | PASS |
| Heartbeats and expiry | PASS |
| Atomic claim | PASS |
| Lease renewal/recovery | PASS |
| Monotonic fencing | PASS |
| Stale owner rejection | PASS |
| Restart preservation | PASS |
| Revision/CAS safety | PASS |
| Retry exhaustion/backpressure | PASS |
| Cancellation ordering | PASS |

**D01 result: PASS.**

## D02 — Remote Worker Dispatch & Service Identity

### Transport decision

The chosen transport is a bounded HTTP worker-pull protocol using the existing hardened server. It adds no broker or generic event bus. Delivery only advertises a durable claim; ownership remains exclusively in D01 state.

Worker service routes are internal and semantic:

```text
POST /api/v1/internal/runtime/workers/register
POST /api/v1/internal/runtime/workers/heartbeat
POST /api/v1/internal/runtime/jobs/claim
POST /api/v1/internal/runtime/jobs/:jobId/running
POST /api/v1/internal/runtime/jobs/:jobId/renew
POST /api/v1/internal/runtime/jobs/:jobId/result
POST /api/v1/internal/runtime/jobs/:jobId/failure
```

The worker cannot choose a Tenant. Tenant, workload, deployment and Agent scope come from the claimed authoritative job.

### Independent worker process

`remote-worker-entrypoint.ts` starts a standalone Node process with its own OpenClaw engine and process lifecycle. It registers capabilities, emits remote heartbeats, polls for work, marks ownership running, renews the lease, executes, and commits the result. It supports drain and bounded HTTP request timeouts.

`runtime-control-plane-entrypoint.ts` provides a reproducible independent server entrypoint for process acceptance. Production composition requires `ACS_DISPATCH_MODE=remote`, a durable runtime database and a production-oriented worker validator; local fallback is rejected.

### Service identity

`WorkerServiceIdentityValidator` is separate from user OIDC identity. The implemented production-oriented adapter validates a signed HS256 worker token with fixed algorithm, issuer, audience, signature, expiration/not-before, subject, worker ID, instance ID and permitted capability claims. The server binds registration and every ownership request to those signed values. Development headers remain isolated to non-production composition.

The shared signing-key adapter is intentionally small. External workload OIDC or mTLS and managed key rotation remain multi-host deployment caveats, not silent capabilities.

### Result behavior

Result submission includes job, assignment, lease, fencing token, attempt evidence and a deterministic result idempotency key. Lost/transient responses are retried with the same key. Once physical execution completes, an uncertain result response is never reclassified as an execution failure. If transport remains unavailable, durable lease recovery decides the next epoch.

Secret material is not persisted in jobs, assignments, events or results. Jobs carry references/workload identifiers only. Existing economic correlation/idempotency boundaries remain separate; AEES-D does not introduce billing or a second settlement path.

### D02 gate

| Requirement | Result |
| --- | --- |
| Independent worker process | PASS |
| Signed service identity | PASS |
| Remote register/heartbeat | PASS |
| Remote claim/result | PASS |
| D01 assignment remains authority | PASS |
| Fencing validated on result | PASS |
| Tenant derived from assignment | PASS |
| Production local fallback rejected | PASS |
| End-to-end process separation | PASS |

**D02 result: PASS WITH SERVICE-IDENTITY TOPOLOGY CAVEAT.**

## D03 — Distributed Failure Recovery & Acceptance

### Certified topology

The final reproducible test started:

| Process | PID | Role |
| --- | ---: | --- |
| Control Plane A | 655813 | HTTP dispatch/recovery context |
| Control Plane D | 655853 | competing HTTP dispatch/recovery context |
| Worker B | 655867 | independent OpenClaw worker |
| Worker C | 655904 | independent OpenClaw worker |

All four processes used one temporary SQLite runtime store. The two initial jobs completed on different worker PIDs. Later scenarios replaced workers and restarted Control Plane A with a new PID.

### Failure matrix

| Scenario | Result | Evidence |
| --- | --- | --- |
| independent worker execution | PASS | two jobs completed on PIDs 655867 and 655904 |
| two workers contend for work | PASS | one active assignment per job; different workers won different jobs |
| two Control Planes share ownership | PASS | both servers used one runtime DB with atomic claims |
| worker crash during owned work | PASS | worker killed; job remained durable and was recovered after expiry |
| dead-worker/orphan recovery | PASS | job requeued automatically without storage edits |
| reassignment fencing | PASS | token advanced from 1 to 2 |
| stale result | PASS | token 1 returned `409 stale_worker_ownership` after token 2 completed |
| duplicate result | PASS | repeated token 2 result returned the same revision/effect |
| cancellation race | PASS | cancellation committed first; durable state became `cancelled` with no result |
| Control Plane restart | PASS | job/assignment survived; new process recovered and completed it |
| transport interruption | PASS | durable state remained recoverable after server/worker interruption |
| no eligible worker | PASS | incompatible job stayed durablely `queued` with zero assignments |
| backpressure | PASS | queued work did not create unbounded timers/promises |
| duplicate authoritative delivery | PASS | atomic claim/unique active assignment prevented two valid owners |

The acceptance proves local multi-process/shared-store correctness. It does not prove a shared filesystem/database across hosts, network partitions or load-balancer behavior. Physical workload execution remains at-least-once across the crash window after an external side effect but before durable result commit; fencing prevents stale authoritative commits, while workload-specific external side effects must retain their own idempotency contract.

### D03 gate

**D03 result: PASS WITH MULTI-HOST CAVEAT.**

## Readiness integration

The Product API/readiness projection now reports:

- runtime store configured/reachable and adapter class;
- remote dispatch mode;
- active durable workers;
- recovery coordinator health/last scan;
- whether local fallback is disabled;
- durable runtime job and event read models.

Readiness does not require an active worker for liveness. Remote-runtime capability degrades when the store, service identity or recovery coordinator is absent. Production composition fails closed for process-local runtime or local worker fallback.

## Finding status

| Finding | Result after AEES-D | Rationale |
| --- | --- | --- |
| `ACS-ORG-004` | **RESOLVED** | normal production runtime intent is durable and completed by an independent authenticated worker; local fallback is rejected |
| `ACS-ORG-005` | **RESOLVED** | jobs, assignments, workers, leases, results, cancellation and recovery survive restart/crash and are fenced |
| `ACS-ORG-001` | **PARTIALLY_RESOLVED — runtime subset resolved** | runtime/job/worker/assignment truth is durable; Agent/deployment and other state remain outside this bounded store |
| `ACS-ORG-019` | **PARTIALLY_RESOLVED — local multi-process proven** | two Control Planes/two workers share atomic state; multi-host topology is not proven |
| `ACS-ORG-017` | **PARTIALLY_RESOLVED — backend runtime path** | Product API can create/read/cancel durable remote jobs; complete operator retry/remediation UX remains F |
| `ACS-ORG-020` | **PARTIALLY_RESOLVED** | runtime restart/multi-process/crash acceptance now exists; full-system H acceptance remains |

## Validation evidence

| Suite | Result |
| --- | --- |
| `s49-epic-15-5-durable-runtime-state.test.mjs` | 5/5 PASS |
| `s50-epic-15-5-remote-worker-dispatch.test.mjs` | 3/3 PASS |
| `s51-epic-15-5-distributed-runtime-acceptance.test.mjs` | 1/1 PASS; real processes |
| Selected B01-C02/EPIC-15/runtime regression matrix | 88/88 PASS across 18 files |
| Existing local runtime lifecycle regression | 4/4 PASS |
| `npx tsc -p tsconfig.json --noEmit` | PASS |
| temporary emitted build in `/tmp/epic15-5-aees-d.EmLK0j/dist` | PASS |
| official `npm run build` | ENVIRONMENT BLOCKER — `TS5033`/`EROFS` writing repository `dist` |

The process evidence was emitted to `/tmp/epic15-5-aees-d.EmLK0j/aees-d-evidence.json`. Temporary runtime databases, process fixtures and engine children are removed by the test and are not repository artifacts.

## Final classification

| Dimension | Status |
| --- | --- |
| Runtime | **READY for certified single-host remote topology** |
| Distributed execution | **PARTIAL** — multi-process proven; multi-host not proven |
| Recovery | **PARTIAL** — backend crash/restart recovery proven; operator remediation UX remains |
| Operational Ready | **BLOCKED** — Observability/Diagnostics and UX milestones remain |
| Production Ready | **BLOCKED** — E/F/G/H and live topology acceptance remain |

## Deferred scope and caveats

- multi-host/shared managed runtime database;
- workload OIDC or mTLS and managed service-credential rotation;
- broker-based push/redelivery or cross-region transport;
- physical side-effect exactly-once semantics beyond existing workload idempotency;
- Agent/deployment repository durability outside runtime records;
- operator worker/job/retry/remediation UX;
- external runtime telemetry and dependency-aware traffic readiness;
- production deployment target and removal of no sandbox gate.

AEES-D does not enable production deployment and does not claim global Operational or Production Readiness.
