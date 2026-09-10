# REQ-04 — Persistence Inventory

## Scope and evidence

The inventory covers ACS code and documentation that can own or affect native
Agent, Runtime, Run, Task, Attempt, Checkpoint, Event, Evidence, Usage, and
Cost state. The primary evidence is:

- src/control-plane/shared-state/contracts.ts
- src/control-plane/shared-state/migrations.ts
- src/control-plane/shared-state/postgres-shared-state.ts
- src/control-plane/shared-state/shared-authority-service.ts
- src/control-plane/agent-service.ts
- src/native-core/agent.ts
- src/native-core/runtime.ts
- src/native-core/evidence.ts
- src/native-core/accounting.ts
- src/workers/durable-runtime-state.ts
- tests/s49-epic-15-5-durable-runtime-state.test.mjs
- tests/s51-epic-15-5-distributed-runtime-acceptance.test.mjs
- tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs
- docs/architecture/acs-v2/req-03/contracts.md
- docs/architecture/acs-v2/req-03/state-machine-and-events.md

The line references below describe the current worktree inspected on
2026-09-10. They are evidence of current code, not a claim about a pristine
upstream release.

## Existing mechanisms

| Mechanism | Current capability | Decision | Evidence and reason |
| --- | --- | --- | --- |
| PostgresSharedAuthoritativeState | Shared network PostgreSQL state, transactional descriptor, async repositories, health, close, and transaction wrapper | REUSE | shared-state/contracts.ts:30-40, 241-261; postgres-shared-state.ts:1508-1523 |
| PostgreSQL migration registry | Versioned migrations in acs_schema_migrations with transaction-scoped advisory lock | REUSE / EXTEND | migrations.ts:1-9; postgres-shared-state.ts:1436-1460. Additive version only for IMP-01B. |
| Agent current/history tables | acs_agents current payload plus acs_agent_history keyed by agent and revision | ADAPT | migrations.ts:78-90; postgres-shared-state.ts:584-648. The shape supports lineage but current save/remove semantics do not enforce v1 immutability. |
| AsyncAgentRepository | create, get, list, save, history, remove, optimistic revision conflict | ADAPT | shared-state/contracts.ts:134-141. Add a lineage-specific append-and-advance operation and retire destructive removal from the native path. |
| acs_audit_events | Durable append, unique event_id, correlation and ordered sequence | ADAPT | postgres-shared-state.ts:561-582; migrations.ts:66-77. Retain as audit storage; do not silently turn it into the native event/outbox authority. |
| acs_runtime_events | Durable runtime event records written by runtime state operations | REUSE / ADAPT | migrations.ts:218-232; postgres-shared-state.ts:1189-1197 and runtime mutators. Reuse transaction and recovery patterns; retain runtime-specific event semantics. |
| Durable runtime jobs and assignments | Jobs, workers, leases, assignment status, fencing tokens, retry and expiry recovery | REUSE | migrations.ts:130-232; durable-runtime-state.ts; s49 and s51 tests. Native TaskAttempt must continue to map to this authority. |
| PostgreSQL transaction wrapper | BEGIN, callback operations, COMMIT, rollback on failure, client release | REUSE | postgres-shared-state.ts:1508-1523. This is the state/event atomicity boundary. |
| Runtime idempotency | Tenant-scoped runtime job key, same-request return, different-request conflict | REUSE / ADAPT | migrations.ts runtime job unique index; postgres-shared-state.ts:858-866; s49 tests. Generalize at command boundary without weakening runtime behavior. |
| Economic idempotency | Scoped kind/tenant/idempotency key uniqueness and conflict behavior | REUSE / ADAPT | migrations.ts:117-129; postgres-shared-state.ts:766-830. Do not redesign economics. |
| Native EventLedger | In-memory append validation, identity and sequence checks | ADAPT | src/native-core code and IMP-01 traceability. Use as conformance fixture; durable adapter belongs to shared state. |
| Native EvidenceLedger | In-memory append/correction validation and references | ADAPT | src/native-core/evidence.ts and IMP-01 traceability. Evidence remains distinct from events and audit. |
| Native Usage and Cost records | Provider-neutral typed records and deterministic validation | REUSE / ADAPT | src/native-core/accounting.ts. Persist with existing economic repository or event-correlated extension; do not introduce pricing or settlement policy. |
| SQLite durable runtime test store | Restart, concurrency, fencing, retry, duplicate terminal-result behavior in focused tests | REUSE AS EVIDENCE | s49 tests use SQLite for deterministic runtime proof. It is not a second production ACS authority. |
| External Eigent SQLiteRunJournal/outbox | Desktop-owned journal with local events and outbox | REJECT AS CANONICAL OWNER | REQ-02 Eigent/CAMEL audit records it as desktop-owned and fail-open for some persistence ordering. Preserve lessons only; ACS remains canonical. |
| External executor/provider storage | Provider or executor observations and local state | REJECT | REQ-02/REQ-03 ownership rules prohibit external identity or storage from owning ACS history. |
| Projection/read-model subsystem | No generic ACS projection repository, cursor, or rebuild mechanism is exposed in the inspected shared-state contracts | NOT REQUIRED FOR V1 | REQ-03 places reporting projections after the current foundation. Do not introduce projections merely because an event table exists. |
| Generic ACS outbox | No existing ACS table/repository with pending, claimed, delivery-attempt and acknowledgement semantics was found | EXTEND | Add canonical event and outbox persistence to the existing PostgreSQL schema; no broker is required. |

## Storage ownership

The durable owner is the ACS control plane's shared PostgreSQL state. The
PostgresSharedAuthoritativeState session is the repository composition boundary.
A service or worker may request a mutation, but it does not own canonical
storage. The runtime worker owns execution work and observations only.

The existing in-memory native ledgers must not be presented as restart-safe
canonical persistence. They remain useful for schema validation, deterministic
serialization, and conformance tests.

## Transaction boundaries observed

The shared state implementation wraps callback operations in one PostgreSQL
transaction. Existing runtime mutators are exposed through transaction wrappers,
and runtime ownership validation locks the assignment row before accepting
mutations. Agent create/save uses a current-row operation plus history insertion
in a single SQL statement, but the public repository contract does not couple
that mutation to a native event, outbox record, or generic idempotency result.

REQ-04 therefore reuses the existing transaction wrapper and extends the
repository session with a command operation that performs, in order:

1. authenticate scope and validate expected head or fencing ownership;
2. resolve a durable idempotency key;
3. write canonical state;
4. append the immutable canonical event;
5. write the outbox delivery record;
6. write the idempotency result;
7. commit once.

No external dispatch, webhook, provider call, or executor call occurs inside
this transaction.

## Migration and operational impact

Implementation will require additive schema migration for lineage constraints,
canonical native events, outbox delivery state, and generic command idempotency.
The current migration registry and advisory lock are sufficient. No destructive
migration, dual-write to an external platform, broker, or database replacement
is recommended.

Pending outbox rows are recovered by the ACS dispatcher after restart. A
delivery attempt can be repeated; the canonical event cannot be deleted because
delivery failed.

## Inventory conclusion

The reuse path is PostgreSQL shared state plus its transaction, migration,
runtime lease, fencing, retry, recovery, and idempotency foundations. The only
new durable structures are an additive native event/outbox/idempotency
extension and lineage constraints required to make the existing Agent tables
meet FROZEN-v1 semantics.
