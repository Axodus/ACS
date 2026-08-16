# Architecture Gap Review — Final EPIC-15.5 State

**Status:** final, 2026-08-16

## Acceptance vocabulary

| Level | Meaning |
| --- | --- |
| Contract exists | interface/type/route is declared |
| Implementation exists | real application path executes it |
| Production adapter exists | production profile selects a non-mock boundary and fails closed |
| Operational proof exists | restart/process/failure/browser evidence proves the supported topology |

EPIC-15.5 closes only the fourth level for `PRODUCTION_LIKE_SINGLE_HOST`; it does not infer global topology proof.

## Final architecture

```text
untrusted HTTP client
    ↓ edge guards / network limiter
trusted OIDC identity
    ↓ authenticated principal
Tenant membership / platform authority
    ↓ governance
Product API / domain services
    ↓ aggregate repository boundaries
durable authoritative adapters
    ↓
job + assignment + lease + fencing
    ↓ authenticated remote worker process
durable result / recovery
    ↓
structured logs + metrics + traces → external receiver process
    ↓
operator diagnostics / readiness / browser UX
```

Production deployment adds:

```text
target capability
+ aggregate readiness
+ explicit Tenant production allow
→ durable deployment revision
→ deploy
→ health verification
→ ACTIVE or diagnostic failure
→ degradation / rollback
```

## Before and after

| Area | A01 state | H final state | Remaining global boundary |
| --- | --- | --- | --- |
| administrative authority | in-process maps | repository boundary + atomic durable snapshot | networked shared multi-host store |
| Agent/deployment state | process-local | durable stores with revision/evidence | multi-host aggregate sharing |
| secrets | memory/filesystem | Vault KV v2 provider + durable metadata | live/HA provider and managed identity |
| economics | memory provider/maps | durable idempotent store/provider + reconciliation | external billing is out of scope |
| HTTP methods | global guard rejected declared routes | route-aware GET/POST/PUT/PATCH/DELETE | none |
| identity | caller headers | signed OIDC/JWT validation context | live IdP acceptance |
| rate limiting | mock/caller-derived | server-derived atomic shared-local buckets | global distributed limiter |
| runtime | same-process worker | independent authenticated processes | cross-host runtime |
| ownership/recovery | implicit/maps | durable assignment/lease/fencing/CAS | multi-host partition/failover |
| telemetry | local/disabled | structured logs/metrics/traces + OTLP | managed remote backend/retention |
| readiness | shallow health | dependency-aware required/optional model | topology-specific capacity policy |
| UX | fragmented/backend-only | supported Product API/browser journeys | external infrastructure provisioning |
| production gate | blanket sandbox-only | aggregate readiness/governance/health/rollback | real cloud target acceptance |

## Boundary integrity

- Domain services do not depend on SQL, filesystem layout, HTTP serialization or provider credentials.
- Frontend consumes Product API/read models and does not create authoritative UI-only state.
- Tenant identity is derived from authoritative resource/assignment context, never freely trusted from a worker or browser header.
- Audit and telemetry remain separate concerns.
- Transport delivery does not grant ownership; only current durable lease/fencing state does.
- Telemetry export failure cannot corrupt or roll back authoritative mutations.
- Production configuration never silently selects a development adapter.

## Multi-instance classification

| Component | Classification |
| --- | --- |
| runtime ownership/recovery | `MULTI_PROCESS_SINGLE_HOST_PROVEN` |
| rate limiting | `MULTI_INSTANCE_SAME_HOST_PROVEN` |
| external telemetry | `EXTERNAL_PROCESS_PROVEN` |
| deployment target | `INDEPENDENT_PROCESS_SINGLE_HOST_PROVEN` |
| administration/audit and other SQLite stores | `SINGLE_HOST_DURABLE` |
| aggregate-wide cross-host state | `NOT_PROVEN` |
| cross-host Control Plane/worker topology | `NOT_PROVEN` |

The unproven rows are recorded as terminal topology deferrals and keep the global claim not certified.

## Final architecture conclusion

No critical active production path is contract-only, mock-only or process-memory-only for the certified topology. The remaining gaps are live-provider and topology certification boundaries, not hidden fallbacks.
