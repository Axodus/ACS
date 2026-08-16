# Production Readiness — A01 Baseline and H Final Decision

**Final assessment date:** 2026-08-16
**Certified topology:** `PRODUCTION_LIKE_SINGLE_HOST`

## Historical A01 baseline

| Level | A01 state |
| --- | --- |
| Development Ready | READY |
| Integration Ready | PARTIAL |
| Operational Ready | BLOCKED |
| Production Ready | BLOCKED |

A01 found process-local authority, forgeable identity, same-process execution, no durable recovery, development-only secret/economic adapters, missing external telemetry, incomplete operator journeys and a deliberate sandbox-only production guard.

## H final readiness

| Level | Certified topology | Global claim |
| --- | --- | --- |
| Development Ready | **READY / CERTIFIED** | **READY** |
| Integration Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** |
| Operational Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** |
| Production Ready | **READY for `PRODUCTION_LIKE_SINGLE_HOST`** | **NOT_CERTIFIED** |

`PARTIALLY_CERTIFIED` above is a readiness-claim classification, not a finding status. Every finding has a terminal disposition in [operational-gap-inventory.md](./operational-gap-inventory.md).

## Final dimension matrix

| Dimension | Certified-topology status | Evidence | Global limitation |
| --- | --- | --- | --- |
| Identity | **READY** | RS256/JWKS/issuer/audience/time validation; forged actor/admin denied | live managed IdP/DNS/TLS not proven |
| Security | **READY** | Tenant authority separation, fail-closed profiles and no secret/token leakage | external WAF/service mesh not in scope |
| Edge | **READY** | trusted proxy resolution, CORS, bounds/timeouts, headers and real limiter | global/cross-host limiter not proven |
| Secrets | **READY for provider-equivalent topology** | Vault KV v2 lifecycle, tenant isolation, restart and failure semantics | live/HA Vault and managed identity not proven |
| Persistence | **READY for one host** | active aggregate state survives restart; runtime/limiter local multi-process tests | networked shared DB for all aggregates not proven |
| Runtime | **READY** | independent workers, durable jobs/assignments/leases/results | cross-host runtime not proven |
| Distributed execution | **READY for multi-process single-host** | atomic claim, fencing, stale owner rejection and recovery | multi-host/network partition not proven |
| Recovery | **READY** | worker/CP crash, orphan, retry, duplicate and cancellation races | cross-host disaster recovery not proven |
| Deployment | **READY for production-like target** | aggregate gate, governance, health, degradation and rollback | real cloud/HA target not proven |
| Observability | **READY** | logs, metrics, traces, external receiver and diagnostics | managed remote backend/retention not proven |
| Economics | **READY for ACS semantics** | durable/idempotent/reconciled authorization and settlement | billing/payment processing out of scope |
| Audit | **READY for one host** | durable correlated administrative history | shared outbox/retention/tamper store not proven |
| Product API | **READY** | method compatibility, auth/edge, admin, runtime, diagnostics and deployment paths | only declared supported actions are included |
| Control Plane/UX | **READY** | Agent, Tenant, workers, operations, recovery and deployment browser journeys | infrastructure provisioning stays external |
| Testing | **READY for certified topology** | 569 serial tests, 47 concurrent core tests, 56 browser checks | live-provider/multi-host acceptance not executed |

## Final state ownership inventory

| State | Active holder/adapter | Restart | Multi-process/host classification | Terminal finding impact |
| --- | --- | --- | --- | --- |
| Tenant/membership/governance/limits/audit | atomic durable administrative snapshot | PASS | single-host only | 001/009 deferred for global topology |
| Agents/composition/deployments | durable repositories/stores | PASS | single-host only | certified topology ready |
| secret metadata/references | SQLite catalog; material via Vault boundary | PASS | local catalog; provider-managed material | 002 deferred for live provider |
| economics/settlement | SQLite economic and settlement providers | PASS | single-host durable | 007 resolved for ACS semantics |
| jobs/workers/assignments/leases/results | SQLite durable runtime authority | PASS | local multi-process proven | 004/005 resolved; 019 deferred globally |
| rate-limit buckets | atomic SQLite store | PASS | local multi-instance proven | 010 deferred globally |
| operational telemetry | bounded provider + OTLP exporter | exported outside source process | independent receiver process | 011 resolved |
| deployment target state | durable deployment store + target adapter | PASS | production-like independent process | 006 resolved for certified topology |

No authoritative active state is memory-only across restart in the certified topology. Local files/SQLite are not misrepresented as networked multi-host databases.

## Production composition safety

In production mode, configuration rejects:

- development/mock identity or incomplete OIDC configuration;
- insecure secret provider fallback;
- memory economic/settlement authority;
- process-local runtime or local-worker fallback;
- disabled/memory limiter;
- disabled/memory-only telemetry;
- wildcard/missing required edge configuration;
- unsupported/non-production target;
- production deployment without explicit governance allow.

Dependency outage changes readiness/deployment state; it does not select a development fallback.

## Acceptance evidence

| Evidence | Result |
| --- | --- |
| complete serial tests | **569/569 PASS** |
| concurrent B–G core | **47/47 PASS** |
| browser matrix | **56/56 PASS** |
| accessibility/overflow/page/console failures | **0/0/0/0** |
| security/cross-Tenant violations | **0** |
| root/static writable-path builds | **PASS** |
| official repository emit | `ENVIRONMENT_BLOCKER` — `TS5033/EROFS` |

## Final conclusion

ACS is operational and production-capable for the explicit production-like single-host topology. A global production claim remains not certified until live providers, networked shared state and cross-host topology are accepted.
