# REQ-04 — Event and Outbox Contract

## Problem

The native EventLedger is currently in memory. ACS also has durable audit
events and runtime events, but neither is proven to be the generic immutable
EventEnvelopeV2 plus delivery outbox required by the frozen v2 state machine.
The architecture must prevent a committed state mutation from losing its
canonical event.

## Existing ACS capability

The repository provides:

- PostgreSQL acs_audit_events with unique event_id, correlation_id, payload,
  and database sequence;
- PostgreSQL acs_runtime_events written with durable runtime state;
- a shared withTransaction callback that performs BEGIN, COMMIT, and rollback;
- runtime job idempotency, assignment leases, fencing, retry, recovery, and
  event listing;
- native EventEnvelopeV2 validation and an in-process append ledger.

There is no generic ACS outbox table or repository with pending, claim, retry,
acknowledgement, and delivery-attempt semantics. Eigent's local outbox is
desktop-owned and is not an ACS authority.

## Decision framework

### Option A — Add canonical native event and outbox records to shared PostgreSQL

Extend the existing migration and repository session with canonical immutable
native events, delivery records, and command idempotency. Commit state, event,
outbox, and idempotency result in one PostgreSQL transaction.

### Option B — Reuse acs_audit_events as both audit and canonical event/outbox

Store native events in the existing audit table and add delivery fields there.

### Evidence

The existing transaction wrapper is already used by runtime state changes.
acs_audit_events is durable and append-oriented but has audit-specific fields
and no delivery state. acs_runtime_events has runtime-specific payload and
ownership semantics. The REQ-03 contract explicitly keeps Event, Evidence, and
Audit distinct.

### Trade-offs

Option A adds a small number of ACS-owned tables and preserves clear semantic
boundaries. Option B reduces table count but couples audit retention and
delivery lifecycle to canonical event semantics, making future replay and
evidence queries ambiguous.

### Security impact

Option A makes ACS the only canonical writer and keeps external delivery as a
separate observation. Option B increases the chance that an audit or delivery
writer can mutate canonical event meaning.

### Migration impact

Option A needs an additive migration. Existing audit and runtime rows remain
readable and are not silently converted into native events.

### Dependency impact

Option A uses PostgreSQL only. No broker, external event platform, provider SDK,
or second dispatcher is required.

## Frozen ownership and atomicity

ACS control plane owns canonical events and outbox records. PostgreSQL is the
durable owner. External executors, providers, planners, tools, and clients may
submit observations or requests, but cannot author canonical ACS history
outside an authenticated ACS command.

For one logical canonical command, the shared transaction contains:

~~~text
validate scope, expected revision, and fencing ownership
resolve durable idempotency key
mutate canonical ACS state
append immutable canonical event
insert pending outbox record
record idempotency result
COMMIT
~~~

The external dispatch or notification starts only after COMMIT. A transaction
failure rolls back state, event, outbox, and idempotency result together. A
successful commit makes all four durable before delivery is attempted.

The native command boundary must use the transaction session, not independent
pool calls. Existing runtime methods retain their current transaction and
fencing behavior.

## Event contract

The minimum canonical event contains:

~~~yaml
event_id: ACS-generated opaque identifier
event_type: stable event name
schema_version: major.minor
occurred_at: authoritative ACS timestamp
stream_scope: aggregate or stream identifier
sequence: monotonic within stream_scope
organization_id: scoped owner
product_domain: ACS domain
tenant_id: compatibility field when applicable
aggregate_type: Agent | Run | Task | Attempt | ...
aggregate_id: canonical entity identifier
aggregate_revision: state revision when applicable
correlation_id: operation correlation
causation_id: preceding event or command reference
idempotency_key: command key when applicable
actor: ACS actor reference and kind
source: acs | executor | provider | planner | tool | product | human
payload: typed safe details
~~~

event_id is globally unique and immutable. sequence is ordered only within the
declared stream_scope. ACS makes no global ordering claim across unrelated
aggregates.

Payloads exclude raw credentials, access tokens, private keys, unredacted
provider prompts, and unrestricted tool output. Controlled references may be
stored instead.

## Outbox contract

An outbox record points to exactly one canonical event and contains:

~~~yaml
outbox_id: ACS-generated opaque identifier
event_id: canonical event reference
status: pending | leased | delivered | retryable | dead_lettered
available_at: next eligible delivery time
attempt_count: non-negative count
lease_owner: ACS dispatcher identity
lease_expires_at: timestamp?
last_error_code: safe classification?
last_attempt_at: timestamp?
delivered_at: timestamp?
~~~

The outbox is a delivery work record, not a second event. It may be claimed
after commit, retried after lease expiry, and acknowledged after the consumer
accepts the event. Delivery metadata does not alter the canonical event.

Outbox ordering follows event stream_scope and sequence where a consumer
requires ordering. Independent streams may be delivered in any order. A
consumer may defer a later sequence until its predecessor is available.

Canonical events and their provenance are retained independently of outbox
delivery cleanup. A failed or exhausted delivery creates retry/dead-letter
evidence and never deletes the canonical event.

## Delivery semantics

| Boundary | Guarantee |
| --- | --- |
| Durable event creation | Atomic with the canonical state mutation in one transaction. |
| Internal outbox processing | At-least-once; leases can expire and work can repeat. |
| Consumer processing | Effectively-once only when the consumer persists event_id and scope idempotency. |
| External publication | At-least-once attempt semantics; acknowledgement loss may cause a repeat. |
| External side effect | No exactly-once guarantee. Unknown outcomes require reconciliation. |

ACS must not use exactly-once language for external effects.

## Audit, Evidence, and runtime event boundaries

An Event is a canonical fact in the ACS event stream. An Audit record describes
an actor or control action. Evidence is an append/correction-aware record
supporting an operational or decision claim. A runtime event is a durable
runtime observation/state-transition record under the existing runtime
authority.

They may reference one another by event_id, correlation_id, entity references,
or evidence source references. They are not interchangeable. Event creation
does not automatically create Evidence, and Evidence creation does not rewrite
the canonical event.

## Usage and Cost

Usage and Cost records remain ACS-native records correlated to Run, Task,
Attempt, Agent revision, and event references. A command that logically changes
state and records a usage fact may commit both in the same transaction. An
asynchronous usage consumer may instead process a canonical event with its own
durable idempotency key.

The existing economic repository's scoped idempotency and reservation
correlation are reused. REQ-04 does not redesign pricing, settlement, or
economic policy, and it does not fix the separately tracked s63 failure.

## Replay boundary

Replay reads canonical events in stream order and may rebuild ACS state,
diagnostics, or a future read model. Replay records its consumer scope and
cursor and handles duplicate event_id values idempotently.

Replay never calls an executor, provider, tool, webhook, or irreversible
external action as an implicit consequence of reading historical events.
External re-execution requires a new authorized command, new idempotency key,
new binding, and explicit reconciliation of the prior outcome.

## Final decision

Event persistence ownership: FROZEN-v1.

Transaction/outbox semantics: FROZEN-v1.

Recommendation: extend the existing shared PostgreSQL state with separate
canonical event, outbox, and generic idempotency records. Keep audit and
runtime event mechanisms in their current semantic roles.
