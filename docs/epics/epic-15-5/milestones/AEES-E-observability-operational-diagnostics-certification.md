# AEES-E — Observability & Operational Diagnostics Certification

**Date:** 2026-08-16

**Result:** **PASS WITH TOPOLOGY CAVEATS**

**Finding result:** `ACS-ORG-011` and `ACS-ORG-012` are **RESOLVED** for the active HTTP/runtime boundary. External-process OTLP export and local multi-process correlation are proven; multi-host collector, managed retention, alert routing and production dashboards remain unproven.

## Executive result

AEES-E establishes one bounded operational telemetry and diagnostic path:

```text
HTTP request
  -> server-owned request/correlation + W3C trace context
  -> durable runtime job/assignment
  -> authenticated independent worker
  -> structured logs + metrics + spans
  -> bounded OTLP HTTP/JSON exporter
  -> independent receiver process
  -> dependency-aware readiness and authorized diagnostics
```

Telemetry remains a non-authoritative side channel. Export failure cannot commit, roll back or duplicate domain/runtime state. Audit remains the authoritative governance/security history.

## Discovery inventory

| Signal | Before AEES-E | Process-local? | Exported? | Correlated? | Operator-visible? | Final state |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| HTTP logs | no active request pipeline | yes | no | partial | no | ACTIVE structured events |
| runtime logs | audit/events only | mixed | no | partial | partial | ACTIVE structured events |
| worker logs | stderr/event summaries | worker-local | no | partial | no | ACTIVE per-process telemetry |
| metrics | contracts/local summaries | yes | no | no | no | ACTIVE bounded OTLP metrics |
| traces | deferred | n/a | no | no | no | ACTIVE Control Plane -> worker spans |
| audit | administrative durable projection | single-node durable | API read | yes | yes | PRESERVED; not replaced |
| health | liveness/inspection projection | computed | HTTP | partial | yes | explicit LIVENESS |
| readiness | historical report | computed | HTTP | incomplete | partial | dependency-aware READY/DEGRADED/BLOCKED |
| dependency status | fragmented | computed | no | no | no | authorized operational status |
| job diagnostics | job/event read models | durable backend | HTTP | partial | partial | tenant-safe diagnostic projection |

Legacy `src/telemetry.ts` memory/JSONL sinks remain development evidence. The active AEES-E path is `OperationalTelemetryProvider`; production composition rejects disabled/memory exporters.

## E01 — Structured telemetry and external exporters

### Architecture

`OperationalTelemetryProvider` exposes vendor-neutral `log`, `metric` and `startSpan` operations. Domain services do not depend on an exporter SDK. `OtlpHttpTelemetryExporter` emits bounded OTLP HTTP/JSON batches to `/v1/logs`, `/v1/metrics` and `/v1/traces`. The acceptance receiver is a separate process and is not an authoritative ACS store.

Configuration:

```text
ACS_TELEMETRY_MODE=disabled|memory|otlp-http
ACS_OTEL_EXPORTER_OTLP_ENDPOINT=http(s)://...
ACS_OTEL_SERVICE_NAME=...
ACS_TELEMETRY_QUEUE_CAPACITY=...
ACS_TELEMETRY_BATCH_SIZE=...
ACS_TELEMETRY_EXPORT_INTERVAL_MS=...
ACS_OTEL_EXPORT_TIMEOUT_MS=...
```

Production rejects `disabled` and `memory`; a configured external exporter may become temporarily `degraded` without corrupting or rolling back authoritative operations.

### Structured events

Stable events cover HTTP receive/complete, job create/assign/start/complete/fail/recover, worker claim/complete, worker registration, lease expiry, stale-result rejection and readiness transitions. Common context includes only applicable identifiers: request, correlation, trace/span, Tenant, principal, job, assignment and worker.

### Metrics

Implemented low-cardinality metrics include:

- HTTP count, duration, 429 and 5xx;
- job create/queued/running/completed/failed and duration;
- assignments, lease expirations, recoveries and stale-result rejection;
- registered/active/offline workers;
- readiness state.

Metric attributes drop job, assignment, request, correlation, trace, principal, Tenant and worker identifiers. Those identifiers remain in logs/traces where correlation is appropriate.

### Tracing and correlation

The server generates the canonical request ID and accepts a client correlation ID only after bounded-format validation. Standard `traceparent` input is parsed; the server creates an HTTP span and persists its trace context on the durable job. The independent worker creates `job.execute` as a child of that context and uses it on running/renew/result/failure calls.

### Sensitive-data controls

Central redaction removes sensitive keys and bearer/private-key patterns. Regression evidence proves zero Bearer token, Vault token, secret plaintext, worker credential or private-key matches in logs, metrics, traces, diagnostics and the evidence manifest.

### Exporter failure semantics

- queues and recent buffers are bounded;
- failed batches remain bounded for retry and increment dropped count when capacity is exceeded;
- asynchronous export never runs inside a domain transaction;
- exporter outage changes telemetry/readiness health to `degraded`;
- graceful shutdown performs one bounded flush;
- domain/runtime mutations do not become false failures or false successes because of telemetry.

### E01 gate

| Requirement | Result |
| --- | --- |
| structured logs | PASS |
| metrics | PASS |
| traces | PASS |
| remote worker trace propagation | PASS |
| external exporter | PASS — independent OTLP receiver process |
| redaction | PASS — 0 sensitive matches |
| bounded outage behavior | PASS |
| explicit production configuration | PASS — insecure fallback rejected |

## E02 — Dependency-aware readiness and diagnostics

### Health model

- `GET /api/v1/health` is minimal dependency-independent liveness and returns `LIVE`.
- `GET /api/v1/ready` returns aggregate `READY`, `DEGRADED` or `BLOCKED` plus stable reason codes, without topology details.
- `GET /api/v1/system/operational-status` requires platform authority and returns dependency, worker, job, recovery and telemetry diagnostics.
- `GET /api/v1/system/telemetry` requires platform authority and returns bounded recent telemetry plus exporter/queue health.
- `GET /api/v1/runtime/jobs/:jobId/diagnostics` is Tenant-scoped and hides foreign jobs as `404`.

### Dependency registry

| Dependency | Required policy | Failure code |
| --- | --- | --- |
| identity provider | required | `AUTH_PROVIDER_UNREACHABLE` |
| HTTP edge/rate limiter | required | `RATE_LIMITER_UNAVAILABLE` |
| secret provider | required in production | `SECRET_PROVIDER_UNREACHABLE` |
| administrative state | required | `ADMIN_STATE_UNAVAILABLE` |
| economic state | required | `ECONOMIC_STORE_UNAVAILABLE` |
| settlement provider | required | `SETTLEMENT_PROVIDER_UNAVAILABLE` |
| runtime store | required in remote mode | `RUNTIME_STORE_UNAVAILABLE` |
| recovery coordinator | required in remote mode | `RECOVERY_COORDINATOR_UNHEALTHY` |
| compatible remote workers | required in remote mode | `NO_ELIGIBLE_WORKERS` |
| telemetry exporter | optional for domain continuity, operational degradation | `TELEMETRY_EXPORTER_DEGRADED` / `TELEMETRY_EXPORTER_DISABLED` |

Probes are bounded by timeout and short cache TTL. Readiness state changes emit telemetry only on transition, avoiding poll-driven log spam.

### Runtime diagnostics

Worker diagnostics expose status, heartbeat age, capabilities and current fenced assignments without credentials. Job diagnostics expose attempt/max attempts, current assignment/lease summary, failure/recovery codes, correlation and minimized event history. Eligibility diagnosis reuses the runtime's canonical worker eligibility predicate; it does not duplicate scheduler rules.

Stable job reasons include `NO_ELIGIBLE_WORKERS`, `LEASE_EXPIRED`, `STALE_WORKER_OWNERSHIP`, `MAX_ATTEMPTS_EXHAUSTED` and application/provider failure codes, paired with a non-destructive recommended action.

### Access control

Public liveness/readiness never expose DSNs, identities, workers or dependency endpoints. Platform diagnostics require explicit platform authority. Tenant job diagnostics compare the durable job Tenant with the trusted isolation scope; cross-Tenant lookups return safe `404` responses.

### E02 gate

| Requirement | Result |
| --- | --- |
| liveness distinct from readiness | PASS |
| dependency registry/reason codes | PASS |
| required dependency blocking | PASS |
| optional exporter degradation | PASS |
| worker/job/recovery read models | PASS |
| Tenant/platform authorization | PASS |
| bounded dependency probes | PASS |
| observable readiness transitions | PASS |

## E03 — Operational incident acceptance

### Topology and evidence

```text
Control Plane PID 712722 -> restarted as PID 713050
Worker B PID 712777
Worker C PID 712887
Recovery worker PID 713133
OTLP receiver PID 712714
Dependency-outage process PID 713154
Shared durable runtime: SQLite
```

The IDs are ephemeral acceptance evidence, not runtime configuration. Evidence manifest:

```text
/tmp/acs-epic15-5-aees-e-evidence/manifest.json
```

Classification: `EXTERNAL_PROCESS_PROVEN / MULTI_HOST_NOT_PROVEN`.

### Incident matrix

| Scenario | Result | Operator evidence |
| --- | --- | --- |
| worker crash | PASS | job diagnostics + lease expiry/recovery telemetry |
| stale result | PASS | HTTP `409 stale_worker_ownership` + structured rejection event |
| Vault outage | PASS | `SECRET_PROVIDER_UNREACHABLE` over operational status |
| rate limiter outage | PASS | `RATE_LIMITER_UNAVAILABLE` over operational status |
| no eligible worker | PASS | queued job + capability-aware reason/action |
| retryable failure | PASS | attempts, worker failure event and continuous correlation |
| max attempts exhausted | PASS | terminal `MAX_ATTEMPTS_EXHAUSTED` |
| Control Plane restart | PASS | same durable job observed/completed by replacement PID |
| exporter outage | PASS | telemetry dependency degraded; workload remains authoritative |
| exporter recovery | PASS | reachability returns after receiver restart |

### Correlation proof

```text
requestId: req_c2c48f84-76e2-49df-90a8-77f8a0ccea04
traceId: 11111111111111111111111111111111
jobId: job_d6442b29-8473-4299-8a97-5c9a6598bcc5
assignmentId: assign_06197709-a20d-4a49-bfe7-4028232be287
workerId: worker-c
```

The receiver recorded 105 log batches, 94 metric batches and 91 trace batches with zero sensitive matches. The acceptance observed request-to-worker trace continuity, runtime lease/recovery counters, structured stale-result evidence and externally exported Vault/rate-limiter reason codes.

### Diagnostics without shell

Every scenario used only supported HTTP diagnostics/readiness and exported telemetry. Shell/PID control was used solely by the acceptance harness to inject process failure; direct SQLite inspection, filesystem log reading and process-memory inspection were not part of the operator diagnosis.

### E03 gate

All required scenarios pass. External exporter, correlation, logs, metrics, traces, dependency diagnostics, Control Plane restart visibility and bounded exporter outage are proven.

## Files and tests

Primary implementation:

- `src/control-plane/operational-telemetry.ts`
- `src/control-plane/operational-diagnostics.ts`
- `src/control-plane/operational-telemetry-receiver-entrypoint.ts`
- HTTP context/server/routes and remote runtime/worker instrumentation.

Tests:

- `tests/s52-epic-15-5-structured-telemetry.test.mjs`
- `tests/s53-epic-15-5-operational-diagnostics.test.mjs`
- `tests/s54-epic-15-5-observability-incident-acceptance.test.mjs`
- `tests/fixtures/aees-e-failure-worker-process.mjs`

## Finding and readiness result

| Item | Result |
| --- | --- |
| `ACS-ORG-011` | RESOLVED for active HTTP/runtime boundary |
| `ACS-ORG-012` | RESOLVED for active liveness/readiness boundary |
| Observability | READY FOR CERTIFIED TOPOLOGY / PARTIAL globally |
| Runtime | READY for certified single-host remote topology |
| Recovery | PARTIAL globally; observable for certified topology |
| Operational Ready | BLOCKED by Milestone F operator UX and residual state/topology gaps |
| Production Ready | BLOCKED by B/F/G/H and live infrastructure acceptance |

## Caveats and deferred scope

- multi-host collector/store/network-partition behavior is not proven;
- managed retention, dashboards, alert routing and SLO/SLA tooling are deferred, not simulated;
- the receiver entrypoint is an acceptance utility, not a bundled generic observability platform;
- Agent/deployment authoritative durability and a complete remediation UI remain open;
- production deployment remains sandbox-gated;
- audit durability/retention and telemetry retention are separate concerns.

## Milestone classification

AEES-E / Milestone E is **PASS WITH TOPOLOGY CAVEATS**. The next milestone is **F — End-to-End Operational UX**. It must consume the Product API diagnostics added here rather than reading stores or telemetry internals directly.
