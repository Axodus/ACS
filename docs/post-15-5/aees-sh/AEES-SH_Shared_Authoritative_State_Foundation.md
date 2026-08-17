# AEES-SH — Shared Authoritative State Foundation

**Date:** 2026-08-17

**Baseline:** AEES-MH blocker commit `3a2d1fa`

**Result:** **PASS**

**Gates:** `SH01=PASS`, `SH02=PASS`, `SH03=PASS`

## Baseline imported from AEES-MH

AEES-MH remains `NOT CERTIFIED`, stopped at MH01. EPIC-15.5 remains closed and certified for `PRODUCTION_LIKE_SINGLE_HOST`.

| MH blocker | Imported state | AEES-SH result |
| --- | --- | --- |
| `MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE` | synchronous local authority contracts | `RESOLVED` |
| `MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE` | JSON/SQLite host-local stores | `RESOLVED` for SH shared profile |
| `MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE` | no second authority instance/host | `DUAL_INSTANCE_PROVEN`; physical multi-host not proven |

## Discovery summary

The previous production-relevant stores were synchronous and local: administrative JSON plus SQLite Agent, deployment, secret metadata, economics, limiter and runtime databases. External Vault/settlement/limiter facades were async, but their authoritative catalogs remained local. `createControlPlaneContext` also bootstrapped local stores synchronously.

The migration preserves the old profile rather than silently changing its certification. New shared composition is separate and fail-closed.

## SH01 architecture

Canonical async interfaces cover Tenant, membership, governance, audit, Agent, deployment, secret metadata, economics, runtime and limiter. `SharedAuthorityService` and `SharedRuntimeCoordinator` await network persistence. `withTransaction` supplies explicit atomic sessions. Pure domain objects remain synchronous.

Audit decision: mutations orchestrated through shared authority append audit in the same database transaction. This closes the resource/audit split for the SH path. External provider operations still require provider-specific idempotency/reconciliation; SH does not invent distributed transactions across Vault or financial providers.

CAS remains expected-revision based. Runtime ownership uses row locks, a unique active assignment and per-job database fencing counter. No write returns success before commit.

## SH02 architecture

Backend: PostgreSQL 17.6 over TCP. Driver: `pg` 8.16.3. Schema version: 1.

The schema uses aggregate-specific tables and constraints. Migrations are ordered, recorded and advisory-lock protected. Pool configuration includes bounded connection/statement timeout and size. Idle-client outage errors are handled without crashing the process.

Production composition:

```text
ACS_STATE_BACKEND=shared
        ↓
PostgresSharedAuthoritativeState
        ↓
schema current + reachable + writable
        ↓
SharedAuthorityService / SharedRuntimeCoordinator
```

Fallback policy: zero. Shared profile cannot use JSON/SQLite if the DB is missing or unavailable. The historical local profile remains valid for development/single-host.

Import result: no product dataset was supplied; acceptance used an isolated schema and performed no destructive import. Existing local files remain untouched. Real cutover requires a source-specific, verified import with writers stopped and no mixed authority.

## SH03 evidence

Topology:

```text
Control Plane A (independent PID/pool/listener)
                  ↘
                   PostgreSQL external process over TCP
                  ↗
Control Plane B (independent PID/pool/listener)
```

Classification: `DUAL_PROCESS_SHARED_STATE`, single physical host.

Results:

- Tenant/governance immediately visible cross-instance;
- Agent and deployment CAS: exactly one winner;
- audit stream shared and ordered;
- job claim/recovery: exactly one effective winner;
- fencing incremented and stale predecessor result rejected;
- worker registry shared;
- economic duplicate settlement: two stable responses, one effect/receipt;
- secret metadata consistent with zero plaintext;
- rollback by alternate Control Plane passed;
- shared rate bucket passed;
- loss/restart of A did not interrupt B authority;
- DB outage blocked authority with no local fallback;
- both pools reconnected and converged after DB recovery.

Evidence manifest:

```text
/tmp/acs-post15-5-aees-sh-evidence/manifest.json
```

Final validation:

- `git diff --check`: `PASS`;
- TypeScript no-emit: `PASS`;
- backend and frontend builds in writable `/tmp`: `PASS`;
- official workspace emits: `ENVIRONMENT_LIMITATION` (`TS5033/EROFS` on the mounted repository);
- integrated regression inventory: `92/92 PASS` after correcting a disposable PostgreSQL test-credential mismatch;
- S59: `3/3 PASS`;
- SH03: `20/20 PASS`.

The credential mismatch affected only the first aggregate test command (`90/92`); it was corrected on the isolated acceptance role and did not require a product change. No product race or flaky assertion remained.

## Security and isolation

The acceptance HTTP boundary rejected an unauthorized request. Shared persistence stores secret metadata only. Evidence scan found zero bearer tokens, private keys, connection strings or secret plaintext. Existing C01/C02 and tenant-isolation regressions remain required and are not replaced by the harness.

## Gate results

### SH01

`PASS`: async network contracts, explicit transactions, error taxonomy, awaited commits, CAS and fencing preservation.

### SH02

`PASS`: network PostgreSQL adapter, schema/migrations, shared aggregates, DB-backed constraints, fail-closed profile and readiness integration.

### SH03

`PASS`: independent dual-process authority, contention, instance loss and database outage/reconnect.

## Findings and readiness impact

- `ACS-ORG-001`: post-15.5 shared-state subset materially resolved for this profile;
- `ACS-ORG-009`: shared transactional audit implemented for shared authority mutations;
- `ACS-ORG-019`: dual-instance semantics proven; physical multi-host remains unproven.

```text
Shared authoritative state: CERTIFIED
Dual Control Plane: CERTIFIED DUAL_PROCESS_SHARED_STATE
Physical multi-host: NOT YET PROVEN
Managed providers: NOT YET CERTIFIED
Cross-host runtime: NOT YET CERTIFIED
Global Production Ready: NOT CERTIFIED
```

## Caveats and deferred scope

- one physical host and one PostgreSQL container;
- PostgreSQL HA/failover not certified;
- no live managed IdP/Vault/OTLP/LB;
- no cross-host worker or network partition;
- no automatic local-data migration;
- no global multi-host production claim.

## Next step

Resume AEES-MH at MH02, revalidating only the SH-resolved MH01 blockers, then execute MH03. Do not repeat MH01 from zero and do not promote global readiness before managed-provider and physical cross-host evidence.
