# SH03 — Dual-Control-Plane Shared-State Certification

**Result:** `PASS`

**Topology:** `DUAL_PROCESS_SHARED_STATE`

## Topology

```text
Control Plane A (PID 862547) ─┐
                              ├─ TCP ─ PostgreSQL 17.6 container
Control Plane B (PID 862550) ─┘

Control Plane A restarted as PID 862608
```

Each process had an independent context, heap, HTTP listener and PostgreSQL connection pool. The database ran as an external Docker process over a TCP socket. All processes/containers used one physical host, so this is not `DUAL_HOST_SHARED_STATE`.

## Acceptance matrix

| Scenario | Result |
| --- | --- |
| Tenant create A → read B | `PASS` |
| governance update B → read A | `PASS` |
| concurrent Agent revision | `PASS`: one success, one conflict |
| concurrent deployment revision | `PASS`: one success, one conflict |
| audit stream from A/B | `PASS` |
| job created A → visible B | `PASS` |
| assignment contention | `PASS`: one winner |
| recovery coordinator contention | `PASS`: one effective expiry/requeue |
| fencing epoch 1 → epoch 2 | `PASS`, monotonic |
| stale epoch 1 result | `PASS`, rejected `409` |
| worker registry visibility | `PASS` |
| settlement/idempotency A+B | `PASS`: two `200`, one effect/receipt |
| secret metadata A → B | `PASS`, no plaintext |
| rollback requested by alternate instance | `PASS` |
| shared rate-limit bucket A+B | `PASS`: consumed values 1 and 2 |
| Control Plane A loss | `PASS`, B continued authority |
| Control Plane A restart | `PASS`, restored from PostgreSQL |
| database outage | `PASS`, authoritative operations blocked |
| local fallback during outage | `PASS`, zero fallback |
| database reconnect/convergence | `PASS` |
| unauthorized acceptance HTTP | `PASS`, `401` |

## Failure hardening discovered during certification

The first outage run exposed that `pg.Pool` idle-client errors could terminate Node when no pool error listener existed. The adapter now records the dependency error while query boundaries fail closed; the Control Plane remains alive for readiness and reconnect.

Concurrent economic acceptance also identified unstable textual comparison of JSONB. Duplicate settlement validation now uses structural equality, preserving stable cross-instance idempotency despite JSONB key ordering.

Stale-result acceptance was tightened so terminal idempotency applies only to the assignment that actually reached `completed`/`failed`; an expired predecessor cannot borrow the job's terminal status.

## Database outage and reconnect

The PostgreSQL container was stopped and restarted. Docker Desktop required an extended physical fsync/recovery period. During that interval:

- both Control Plane processes stayed alive;
- repository operations failed/blocked;
- readiness did not report ready;
- no JSON/SQLite authority was activated;
- after PostgreSQL recovery, both pools reconnected and observed the same Tenant/job terminal state.

The longer 180-second harness recovery bound does not change repository connection/statement timeouts.

## Evidence

```text
/tmp/acs-post15-5-aees-sh-evidence/manifest.json
```

Manifest results:

- scenarios: `20/20 PASS`;
- credential/token/connection-string/secret matches: `0`;
- SH01: `PASS`;
- SH02: `PASS`;
- SH03: `PASS`.

## Gate

SH03 is `PASS` for `DUAL_PROCESS_SHARED_STATE`. Physical host failure, network partition between hosts and managed PostgreSQL HA remain AEES-MH scope.
