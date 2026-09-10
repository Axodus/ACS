# ACS-V2-REQ-04 — Decision Record

**Decision date:** 2026-09-10

**Authority:** Axodus CTO

**Decision state:** FROZEN-v1 for durable persistence and event ownership

**Implementation authorization:** NO

## Decision 1 — Agent lineage persistence owner

### Problem

IMP-01 has native AgentRevision semantics but no durable canonical owner for
head advancement, immutable history, restart reconstruction, or concurrent
updates.

### Existing ACS capability

PostgresSharedAuthoritativeState already owns acs_agents,
acs_agent_history, repository operations, migrations, transactions, and
optimistic revision conflicts.

### Options

| Option | Result |
| --- | --- |
| A. Adapt existing PostgreSQL Agent repository and tables | Recommended |
| B. Create a native Agent database or lineage service | Rejected |

### Evidence

The current Agent repository writes current and history records in ACS-owned
PostgreSQL and exposes history and conflict behavior. A second store would
create cross-store identity and atomicity problems.

### Trade-offs

Option A requires additive constraints and a lineage command. It preserves
existing data and ownership. Option B isolates a new model at the cost of
duplicate identity, migration, and recovery authorities.

### Security, migration, and dependency impact

Option A preserves ACS scope and authority, requires an additive migration, and
adds no dependency. Option B expands trust and infrastructure boundaries.

### Recommendation and decision

ACS control plane owns Agent identity and lineage. Shared PostgreSQL is the
durable owner. Updating an Agent creates an immutable revision and advances
the canonical head using expected-head compare-and-swap.

Decision: FROZEN-v1.

## Decision 2 — Revision immutability and concurrency

### Problem

The existing generic save/remove shape can describe current-row mutation and
does not by itself freeze historical immutability.

### Existing ACS capability

Revision integers, history primary keys, fingerprinting, and
RevisionConflictError already exist.

### Options

| Option | Result |
| --- | --- |
| A. Append revision plus CAS head advance | Recommended |
| B. Mutate the current revision payload in place | Rejected |
| C. Merge concurrent revisions automatically | Rejected |

### Evidence

REQ-03 states that committed revisions are immutable and historical references
must remain reproducible. Existing current/history tables can support this
with an append operation and constraints.

### Recommendation and decision

Revision is a positive integer within one Agent lineage. The predecessor is the
previous head. A concurrent writer loses deterministically with a revision
conflict. Historical revisions are not physically deleted by the native
contract.

Decision: FROZEN-v1.

## Decision 3 — Canonical event owner and state/event atomicity

### Problem

Native EventLedger is in memory. Existing audit and runtime events do not
provide the complete generic canonical event plus outbox contract.

### Existing ACS capability

PostgreSQL has durable audit/runtime event tables and a shared transaction
wrapper. Existing runtime mutators already use transaction and fencing
patterns.

### Options

| Option | Result |
| --- | --- |
| A. Add separate canonical event and outbox tables in shared PostgreSQL | Recommended |
| B. Reuse audit table for canonical events and delivery state | Rejected |
| C. Introduce a broker or external event platform | Rejected |

### Evidence

acs_audit_events has event identity and correlation but audit-specific shape
and no pending delivery lifecycle. acs_runtime_events has runtime-specific
ownership and payload. The repository has no generic ACS outbox. REQ-03
requires Event, Evidence, and Audit to remain distinct.

### Recommendation and decision

One ACS command transaction validates authority, idempotency, expected revision
or fencing, canonical state, canonical EventEnvelopeV2, outbox record, and
idempotency result. All commit or all roll back. Delivery begins after commit.

Decision: FROZEN-v1.

## Decision 4 — Delivery and idempotency

### Problem

Retries, acknowledgement loss, and process restart can repeat delivery. ACS
must not claim unsupported exactly-once behavior.

### Existing ACS capability

Runtime jobs use tenant-scoped idempotency and conflict behavior. Economic
records use scoped uniqueness. Runtime leases and fencing make owner retries
safe.

### Options

| Option | Result |
| --- | --- |
| A. At-least-once delivery with durable scoped idempotency | Recommended |
| B. At-most-once delivery by deleting before dispatch | Rejected |
| C. Exactly-once external effects | Rejected as unsupported |

### Evidence

Existing runtime tests prove duplicate-safe terminal results, durable
restart/recovery, fencing rejection, and unique idempotency conflicts. They do
not prove exactly-once external effects.

### Recommendation and decision

Canonical creation is atomic. Internal and external delivery are at-least-once
attempts. Consumers deduplicate by event_id and consumer scope. Unknown
external outcomes require reconciliation.

Decision: FROZEN-v1.

## Decision 5 — Replay and projections

### Problem

Historical event use must not repeat irreversible external work, and REQ-04
must not introduce projections without repository need.

### Existing ACS capability

Durable event listing exists for audit/runtime mechanisms. No generic ACS
projection repository, cursor, or rebuild contract was found. REQ-03 places
reporting projections after the current foundation.

### Options

| Option | Result |
| --- | --- |
| A. Replay canonical ACS events for reconstruction/read models only | Recommended |
| B. Replay by re-dispatching external execution | Rejected |
| C. Add v1 projections and a new projection framework | Rejected / NOT REQUIRED |

### Recommendation and decision

Replay is FROZEN-v1 with cursor, duplicate handling, schema compatibility,
failure recovery, and side-effect isolation. Projection rebuild is NOT
REQUIRED for v1 and is a separate future contract.

## Decision 6 — Restart, fencing, evidence, and economics

### Problem

Durable native state must recover without weakening existing worker fencing or
collapsing Event, Evidence, Audit, Usage, and Cost into one record type.

### Existing ACS capability

Runtime jobs, assignments, workers, leases, fencing tokens, retry recovery,
runtime events, economic records, and native evidence/accounting contracts
already exist in separate boundaries.

### Recommendation and decision

The existing runtime assignment and fencing authority remains in place. The
event/outbox write is part of an accepted state mutation transaction, so a
stale worker cannot create the corresponding canonical event. Evidence and
Audit may reference events; they remain distinct. Usage and Cost retain their
existing correlation and scoped idempotency. No economic policy is redesigned.

Decision: FROZEN-v1.

## Decision 7 — Technology, migration, and dependencies

### Problem

The durable contracts require more storage semantics, but a new database,
broker, or framework would expand operational and security scope.

### Existing ACS capability

PostgreSQL shared state, migration registry, advisory lock, transaction
wrapper, health checks, repository interfaces, and durable runtime storage are
already implemented.

### Recommendation and decision

Reuse and minimally extend the current ACS PostgreSQL subsystem. Additive
migrations are required for lineage constraints, canonical events, outbox
delivery state, and generic command idempotency. Existing rows remain readable.
No destructive migration, dual-write, external event platform, or new
dependency is authorized.

Decision: FROZEN-v1.

## ACS-BLOCKER-014 decision

ACS-BLOCKER-014 remains HIGH / OPEN. s27, s54, and s57 are UNRELATED to this
freeze. s62 and s63 are RELATED BUT NON-BLOCKING. REQ-04 does not repair,
reclassify, or absorb any blocker failure.

## Contract freeze

| Contract | State |
| --- | --- |
| Agent lineage persistence | FROZEN-v1 |
| Agent revision semantics | FROZEN-v1 |
| Event persistence ownership | FROZEN-v1 |
| Transaction/outbox semantics | FROZEN-v1 |
| Idempotency | FROZEN-v1 |
| Replay | FROZEN-v1 |
| Projection rebuild | NOT REQUIRED |
| Restart/recovery | FROZEN-v1 |
| Fencing integration | FROZEN-v1 |
| IMP-01B readiness | GO |

## CTO and CEO decisions

Decisions required from CTO: None for this architecture freeze. The CTO
authority named by the request is the decision authority for this record.
IMP-01B still requires separate implementation authorization.

Decisions required from CEO: None. No treasury, settlement, economic-policy,
governance, or organizational authority decision crosses the CTO/CEO boundary
in this request.

## Implementation boundary

This record authorizes no source change. The next milestone may implement the
frozen contracts only after separate authorization:

ACS-V2-IMP-01B — Durable Foundations Completion

That milestone must produce the gates in acceptance-gates.md and must not claim
production readiness from these documents alone.
