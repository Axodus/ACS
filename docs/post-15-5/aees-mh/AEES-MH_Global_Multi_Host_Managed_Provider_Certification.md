# AEES-MH — Global Multi-Host & Managed Provider Certification

**Date:** 2026-08-16
**Baseline:** EPIC-15.5 closure commit `428ca6d`
**Result:** **NOT CERTIFIED**
**Gate result:** `MH01=FAIL`, `MH02=NOT_STARTED_BY_GATE`, `MH03=NOT_STARTED_BY_GATE`

## Baseline imported from H

The H closure is the source of truth:

- EPIC-15.5: `CLOSED WITH CERTIFICATION LIMITS`;
- certified topology: `PRODUCTION_LIKE_SINGLE_HOST`;
- global production claim: `NOT_CERTIFIED`;
- EPIC findings: 17 `RESOLVED`, seven `ACCEPTABLE_DEFERRED`, zero `OPEN_BLOCKER` inside the certified topology.

| H residual | Final status in H | AEES-MH action/result |
| --- | --- | --- |
| shared persistence (`ACS-ORG-001`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER` for multi-host claim: snapshot/SQLite remain host-local. |
| live/managed IdP and Vault (`ACS-ORG-002`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER`; MH02 was not started because MH01 failed. |
| shared audit (`ACS-ORG-009`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER`: append history is part of the host-local administrative snapshot. |
| global limiter (`ACS-ORG-010`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER`: SQLite bucket state is not network-shared. |
| infrastructure remediation (`ACS-ORG-018`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER` for global operator claim; provisioning/failover remains external and uncertified. |
| multi-host topology (`ACS-ORG-019`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER`: no dual-host authority or partition evidence exists. |
| managed bootstrap (`ACS-ORG-021`) | `ACCEPTABLE_DEFERRED` | `OPEN_BLOCKER`: no managed deployment profile/manifests exist. |

Findings already resolved in H were not reimplemented.

## Discovery and root cause

Observed acceptance topology:

```text
Whostler (single WSL/Docker host)
  ├─ ACS repository and local processes
  ├─ Docker Engine 29.7.2 (no second Docker host)
  ├─ local snapshot/SQLite authoritative stores
  └─ PostgreSQL client probe available, shared server unreachable

No host B / shared network database / managed provider endpoints
```

Host/process inventory for this attempt:

| Item | Evidence |
| --- | --- |
| acceptance host | `Whostler` |
| Node.js | `v24.15.0` |
| Docker engine | reachable, server `29.7.2` |
| Docker host count available to harness | 1 |
| shared PostgreSQL | not reachable |
| managed provider credentials/endpoints | not configured or inspected |
| EPIC-16 package | absent |

All production-critical authority remains host-local:

| Component | Backend | Transaction/writer model | Multi-host result |
| --- | --- | --- | --- |
| Tenant/membership/governance/audit | atomic JSON snapshot | single-process synchronous rewrite/rename | `NOT_PROVEN` |
| Agent | SQLite WAL | synchronous local database | `NOT_PROVEN` |
| deployment | SQLite WAL | synchronous local database + revision CAS | `NOT_PROVEN` |
| secret metadata/credentials | SQLite WAL | synchronous local catalog; secret material external | `NOT_PROVEN` for catalog |
| economics/settlement | SQLite WAL | synchronous transaction/idempotency | `NOT_PROVEN` cross-host |
| rate limiting | SQLite WAL | atomic local-file bucket update | `NOT_PROVEN` cross-host |
| jobs/assignments/workers/leases | SQLite WAL | atomic local-file transactions/fencing | `NOT_PROVEN` cross-host |

No PostgreSQL/Redis/network database driver, shared-state adapter, infrastructure manifest, or EPIC-16 package exists in the repository. The available Docker engine is a single Docker host with no pre-provisioned images/services; local PostgreSQL is not reachable.

The repository contracts for Tenant, Agent, deployment and other core state are synchronous. A correct network database adapter must await the authoritative provider before reporting success. The following shortcuts were rejected:

- SQLite on a network filesystem;
- process-local cache with asynchronous/write-behind replication;
- shelling out to `psql` or another database CLI per mutation;
- claiming multiple containers on the same Docker daemon as cross-host evidence.

Those options would not establish safe concurrent writers, failover, monotonic fencing or no-false-success semantics.

## MH01 result

`FAIL`.

Stable blockers:

- `MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE`;
- `MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE`;
- `MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE`.

Required work before retrying MH01:

1. select a networked transactional production database;
2. add shared adapters behind existing domain boundaries;
3. migrate synchronous service/repository call paths so remote acknowledgement is authoritative;
4. provide schema/migration/rollback and connection lifecycle;
5. prove dual-host CAS, fencing, settlement idempotency, audit integrity and host loss.

No database/provider vendor was introduced without an approved deployment target and operational environment.

## MH02 and MH03

Both are `NOT_STARTED_BY_GATE`.

The request explicitly requires MH01 to pass before MH02 and MH02 before MH03. Therefore no live IdP/Vault, managed limiter/OTLP, load balancer, cross-host worker, network-partition, production deploy or alternate-Control-Plane rollback scenario is represented as executed.

## Final certification decision

| Dimension | EPIC-15.5 certified topology | AEES-MH | Global claim |
| --- | --- | --- | --- |
| Identity | certified provider-equivalent boundary | not executed | `PARTIALLY_CERTIFIED` |
| Security/edge | certified single-host edge semantics | not executed behind real LB | `PARTIALLY_CERTIFIED` |
| Secrets | certified Vault-compatible boundary | managed/live acceptance not executed | `PARTIALLY_CERTIFIED` |
| Persistence | certified single-host durability | MH01 failed | `NOT_CERTIFIED` |
| Runtime | certified multi-process single-host | cross-host not executed | `NOT_CERTIFIED` |
| Recovery | certified process crash/restart | host/partition failover not executed | `NOT_CERTIFIED` |
| Observability | certified external receiver process | managed backend not executed | `PARTIALLY_CERTIFIED` |
| Deployment | certified production-like single-host target | cross-host target not executed | `NOT_CERTIFIED` |
| UX | certified operator journeys | LB/multi-host journey not executed | `PARTIALLY_CERTIFIED` |

AEES-MH is **not certified**. EPIC-15.5 remains closed and its certified topology remains valid. No global multi-host or managed-provider readiness claim is permitted.

## Acceptance and regression result

| Validation | Result |
| --- | --- |
| AEES-MH preflight tests | `PASS` |
| `npx tsc -p tsconfig.json --noEmit` | `PASS` |
| official `npm run build` | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` on repository `dist/` |
| equivalent writable `/tmp` TypeScript build | `PASS` |
| EPIC-15.5 core files `s45`–`s58` | `14/14 PASS` |
| affected loopback/process scenarios outside sandbox | `26/26 PASS` |
| first sandbox listener attempt | `ENVIRONMENT_LIMITATION`: `listen EPERM` |
| `git diff --check` | `PASS` |

The initial aggregate test attempt used the repository `dist/` after the official emit failed and therefore reported missing modules. A clean writable build removed those errors. The remaining listener failures were reproduced as `listen EPERM` in the sandbox and passed outside it. No product defect was inferred from either environment failure.

No MH01 database migration, dual-host Control Plane run, cross-host ownership test, managed-provider acceptance, browser run, production deployment or rollback was executed, because the gate sequence stopped at MH01.

## Evidence

Run:

```bash
node scripts/certify-aees-mh-preflight.mjs \
  /tmp/acs-post15-5-aees-mh-evidence/manifest.json
```

The manifest contains the imported H baseline, source-backed state inventory, environment probes, gate results and blocker codes. It contains no credentials.

## Follow-up status — AEES-SH

AEES-SH completed on 2026-08-17 without rewriting this historical result:

- `MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE` → `RESOLVED`;
- `MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE` → `RESOLVED` for the shared PostgreSQL profile;
- `MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE` → `DUAL_INSTANCE_PROVEN / PHYSICAL_MULTI_HOST_NOT_PROVEN`.

Evidence: `docs/post-15-5/aees-sh/` and `/tmp/acs-post15-5-aees-sh-evidence/manifest.json`. AEES-MH may resume at MH02 after bounded revalidation of these claims.
