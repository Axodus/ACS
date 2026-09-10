# ACS-V2-REQ-04 — Durable Persistence & Event Ownership Freeze

**Status:** COMPLETE — architecture audit and contract freeze

**Decision date:** 2026-09-10

**Authority:** Axodus CTO

**Implementation authorization:** NO

**Next separately authorized milestone:** ACS-V2-IMP-01B — Durable Foundations Completion

## Purpose

REQ-04 closes the durable-persistence questions left open by IMP-01. It records
the smallest ACS-owned persistence and event contracts that can be implemented
without inventing a second authority, changing provider boundaries, or
introducing a new infrastructure platform.

The audit inspected the current repository and working implementation. It
preserves the distinction between:

- ACS canonical state;
- canonical ACS events;
- audit records;
- operational evidence;
- external delivery attempts;
- executor and provider observations.

The frozen direction is to reuse the existing PostgreSQL
PostgresSharedAuthoritativeState, its transaction wrapper, migration mechanism,
repository abstractions, and durable runtime ownership controls. The native
Agent, Event, and Evidence ledgers remain contract/conformance layers until a
separately authorized implementation adds durable adapters.

## Evidence posture

Statements in this package are classified as:

| State | Meaning |
| --- | --- |
| VERIFIED LOCAL FACT | Supported by current source, tests, or repository documentation. |
| FROZEN-v1 | Architecture is stable enough for independent implementation. |
| PROPOSED IMPLEMENTATION DETAIL | A later implementation choice constrained by this freeze. |
| NOT REQUIRED | Deliberately excluded from the v1 foundation because repository evidence does not require it. |
| OUT OF SCOPE | Not changed or resolved by REQ-04. |

REQ-04 is documentation-only. It does not implement schemas, repositories,
dispatchers, consumers, migrations, or production changes.

## Frozen outcome

| Contract | Decision |
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

GO means that a separately authorized IMP-01B can implement the durable
foundations from these contracts without making an architectural ownership
decision. It does not mean that implementation exists, that production is
ready, or that ACS-BLOCKER-014 is closed.

## Findings

1. ACS already owns a shared durable PostgreSQL state boundary. The repository
   exposes asynchronous repositories, explicit BEGIN/COMMIT/ROLLBACK handling,
   advisory-locked migrations, and durable tables for Agent history, audit,
   economics, runtime jobs, assignments, workers, and runtime events.
2. The existing Agent repository stores a current row and history rows, but its
   save operation is mutable and its remove operation can delete the current
   row. It is a compatible substrate, not yet the complete immutable lineage
   contract.
3. ACS runtime mutations already use transaction-scoped durable state,
   idempotency, leases, fencing tokens, retry recovery, and runtime event
   records. These guarantees are reused and extended; a second lease or queue
   authority is prohibited.
4. The native EventLedger and EvidenceLedger are in-process ledgers. They
   validate semantics and are useful conformance fixtures, but they are not
   restart-safe canonical storage.
5. No generic ACS transactional outbox with delivery state was found. The
   required adaptation is additive tables and repository methods in the
   existing PostgreSQL schema, committed with canonical state and a durable
   idempotency result.
6. ACS v2 does not require a projection subsystem for the durable native
   foundation. Projection rebuild is therefore NOT REQUIRED in v1. Replay is
   limited to ACS reconstruction and future read-model consumers; it never
   re-executes irreversible external work.

## Required reading

| Document | Purpose |
| --- | --- |
| [Persistence inventory](persistence-inventory.md) | Existing mechanisms, evidence, and reuse classifications. |
| [Agent lineage contract](agent-lineage-contract.md) | Canonical identity, immutable revisions, head advancement, and concurrency. |
| [Event/outbox contract](event-outbox-contract.md) | Canonical events, atomic persistence, delivery, audit/evidence boundaries, and economics. |
| [Recovery and idempotency](recovery-and-idempotency.md) | Restart, retry, replay, fencing, failure behavior, and durable idempotency. |
| [Acceptance gates](acceptance-gates.md) | Exact evidence required from IMP-01B. |
| [Decision record](decision-record.md) | Options considered, decisions, migration, dependencies, security, and final freeze. |

Authoritative inputs:

- [REQ-02](../req-02/README.md)
- [REQ-02 unified core architecture](../req-02/unified-core-architecture.md)
- [REQ-03](../req-03/README.md)
- [REQ-03 contracts](../req-03/contracts.md)
- [REQ-03 state machine and events](../req-03/state-machine-and-events.md)
- [IMP-01](../imp-01/README.md)
- [IMP-01 traceability](../imp-01/implementation-traceability.md)

## ACS-BLOCKER-014 boundary

ACS-BLOCKER-014 remains HIGH / OPEN and is not fixed by REQ-04.

| Failure area | REQ-04 relationship | Reason |
| --- | --- | --- |
| s27 operational evidence HTTP behavior | UNRELATED | No selected persistence ownership depends on its HTTP behavior. |
| s54 observability/rate limiting | UNRELATED | Rate-limit storage is an existing separate repository concern. |
| s57 production target process resolution | UNRELATED | Target process resolution is outside canonical persistence ownership. |
| s62 missing createControlPlaneContext export | RELATED BUT NON-BLOCKING | IMP-01B may use shared construction paths, but the freeze does not require this export. |
| s63 usage/reservation correlation | RELATED BUT NON-BLOCKING | Usage and cost remain idempotent and correlated; the existing economic failure is not changed here. |

The blocker remains a separate validation and remediation workstream.

## Non-goals

REQ-04 does not authorize implementation, production migration, database
replacement, broker deployment, provider or executor integration, Agenta,
Eigent, CAMEL, Workforce completion, Product API completion, governance or
economic redesign, protocol changes, treasury changes, or credential changes.

## Final decision

The ACS control plane owns canonical Agent lineage, canonical state mutations,
canonical EventEnvelopeV2 records, outbox records, idempotency results, and
recovery cursors where introduced. PostgreSQL remains the durable owner.
Delivery is at-least-once with durable consumer idempotency. Exactly-once
external effects are not claimed. IMP-01B is GO for separately authorized
implementation.
