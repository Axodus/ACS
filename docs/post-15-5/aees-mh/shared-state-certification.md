# MH01 — Shared Multi-Host State & Control Plane Certification

**Result:** `FAIL`

## Authoritative state inventory

| State | Current authority | Concurrency semantics | Multi-host capable/proven |
| --- | --- | --- | --- |
| Tenant, membership, governance, audit | atomic filesystem snapshot | revision checks inside one process/snapshot writer | no/no |
| Agent | SQLite | local transaction + revision | no/no |
| deployment | SQLite | local transaction + record revision | no/no |
| secret metadata | SQLite | local catalog transaction | no/no |
| economics and settlement | SQLite | local transaction + idempotency keys | no/no |
| limiter | SQLite | local atomic bucket update | no/no |
| runtime authority | SQLite | local atomic claim, lease and fencing | no/no |

## Evidence and failed guarantees

- The production composition selects local snapshot/SQLite adapters.
- Store descriptors explicitly state `single_node_durable` and/or `multiHost: not_proven`.
- No shared database driver or adapter exists in `package.json`/`src`.
- No external database is reachable in the acceptance environment.
- Only one Docker host is available, so dual-host loss and partition cannot be demonstrated.

Consequently the following required evidence is absent:

- dual Control Plane concurrent writers across hosts;
- single-winner runtime claim/recovery against networked authority;
- cross-host settlement idempotency;
- deployment CAS across hosts;
- shared append/audit integrity;
- host-loss continuity;
- database reconnect/failover.

## Migration boundary

The correct follow-up is a production shared-store implementation, not a certification harness workaround. It must preserve the existing domain models while making network I/O explicit and acknowledgement-safe. Schema migration must cover current snapshot and SQLite data with integrity verification and rollback.

SQLite remains valid only for development and the already certified single-host topology. SQLite on a shared network filesystem is not an accepted MH01 design.

## Follow-up result

AEES-SH completed this foundation on 2026-08-17 with PostgreSQL network authority, async repositories, transactional audit, DB-backed CAS/fencing and dual-process acceptance. See `../aees-sh/SH02-shared-database-adapters.md` and `../aees-sh/SH03-dual-control-plane-certification.md`.

This does not retroactively change the MH01 attempt from `FAIL`; it supplies the prerequisite for resuming MH02/MH03. Physical multi-host remains unproven.
