# SH01 — Async Repository & Transaction Boundary Migration

**Result:** `PASS`

## Repository inventory

| Repository/store | Principal callers | Previous contract | Required atomicity | CAS/revision | SH01 boundary |
| --- | --- | --- | --- | --- | --- |
| Tenant | lifecycle/admin routes | synchronous local | entity + history + audit | tenant revision | `AsyncTenantRepository` |
| Membership | authority/admin routes | synchronous local | ownership `saveMany` + audit | member revision | `AsyncTenantMembershipRepository` |
| Governance | enforcer/admin routes | synchronous local | state + history + audit | governance revision | `AsyncTenantGovernanceRepository` |
| Audit | all governed mutations | synchronous local append | same transaction where ACS owns both writes | event uniqueness/sequence | `AsyncAuditEventStore` |
| Agent | Product API/deploy | synchronous local | revision + history + audit | Agent revision | `AsyncAgentRepository` |
| Deployment | deploy/rollback | synchronous local | lifecycle + history/evidence + audit | record revision | `AsyncDeploymentRepository` |
| Secret metadata | Vault/catalog | synchronous local | metadata/version + audit | secret version | `AsyncSecretMetadataRepository` |
| Economics | quote/reserve/settle | synchronous local store | settlement + reservation + receipt + audit | revision + idempotency | `AsyncEconomicRepository` |
| Runtime/jobs | worker/dispatcher/recovery | synchronous SQLite | claim/lease/fence/job/worker/events | row revision + fencing | `AsyncRuntimeRepository` |
| Rate limiter | edge limiter | sync store behind async facade | atomic bucket consume | bucket primary key | `AsyncRateLimitRepository` |

Classification:

- existing in-memory state: `PURE_IN_MEMORY`;
- JSON/SQLite adapters: `LOCAL_IO` and retained for dev/single-host;
- PostgreSQL contracts: `NETWORK_IO_CAPABLE`;
- `withTransaction` sessions and atomic repository operations: `TRANSACTIONAL`.

## Architecture

```text
existing domain model / decision
        ↓
SharedAuthorityService / SharedRuntimeCoordinator
        ↓ await
async repository session
        ↓
PostgreSQL transaction / CAS / constraints
        ↓ commit
HTTP/application success may be returned
```

Pure entities remain synchronous. No entity performs network I/O. The legacy local adapters were not wrapped with `Promise.resolve` and are not evidence for SH readiness.

`SharedAuthorityService` is the async application boundary. It accepts already-decided canonical models and owns transaction lifetime, CAS commit and atomic audit append. It cannot return before `COMMIT`. Telemetry remains a side channel; authority is never fire-and-forget.

## Transactions and errors

`PostgresSharedAuthoritativeState.withTransaction(operation, fn)` provides one connection/session and executes `BEGIN → awaited work → COMMIT`, with rollback on failure.

Stable repository errors:

- `ACS_REPOSITORY_UNAVAILABLE`;
- `ACS_REPOSITORY_TIMEOUT`;
- `ACS_REPOSITORY_REVISION_CONFLICT`;
- `ACS_REPOSITORY_TRANSACTION_FAILED`;
- `ACS_SHARED_STATE_SCHEMA_MISMATCH`.

Driver errors are not exposed through the application boundary. Writes are not retried generically. Idempotency is explicit for economic records, runtime job creation and terminal result submission.

## Atomicity decisions

- resource mutation and administrative audit append use the same PostgreSQL transaction when ACS owns both writes;
- ownership transfer uses one transaction and demotes the current owner before promotion to satisfy the active-owner constraint;
- settlement, reservation, receipt and audit are committed together;
- runtime claim allocates the fencing token and writes assignment/job/worker state in one transaction;
- recovery scanners use row locks and CAS; concurrent scans yield one effective transition;
- PostgreSQL pool errors during dependency outage update dependency state and do not terminate Node.

## Verification

- no-emit TypeScript: `PASS`;
- S59 config/rollback/CAS tests: `PASS`;
- no false-success during database outage: `PASS` in SH03;
- local JSON/SQLite profiles remain available and explicit.

## Gate

SH01 is `PASS`: network-capable contracts, awaited callers, transactions, CAS, fencing and fail-closed errors are present without changing pure domain semantics.
