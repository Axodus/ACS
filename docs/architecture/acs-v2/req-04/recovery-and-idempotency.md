# REQ-04 — Recovery and Idempotency Contract

## Durable state classification

| Record or capability | Classification | Contract |
| --- | --- | --- |
| Agent identity | DURABLE REQUIRED | Reconstruct from ACS shared state. |
| Agent revision lineage and head | DURABLE REQUIRED | Current head and all committed history survive restart. |
| Runtime assignment and lease | DURABLE REQUIRED | Existing durable runtime store remains authoritative. |
| Run state | DURABLE REQUIRED | Persist canonical lifecycle and exact definition/binding references. |
| Task and Attempt state | DURABLE REQUIRED | Persist lifecycle, retry, assignment, fencing, and correlation references. |
| Checkpoint | DURABLE REQUIRED | Persist when a frozen runtime flow requires resume or approval recovery. |
| Canonical Event | DURABLE REQUIRED | Immutable event survives process and dispatcher failure. |
| Outbox delivery record | DURABLE REQUIRED | Pending/retryable delivery survives restart. |
| Audit record | DURABLE REQUIRED | Existing audit store remains durable when an audit action is recorded. |
| Evidence record | DURABLE REQUIRED | Native evidence persistence must be added when the evidence operation is in scope. |
| Usage and Cost | DURABLE REQUIRED | Records needed for run attribution survive restart and use scoped idempotency. |
| Idempotency result | DURABLE REQUIRED | Duplicate protection cannot depend on process memory. |
| Projection state | OUT OF SCOPE | No v1 projection subsystem is required. |
| Projection cursor | OUT OF SCOPE | Introduce only with a separately frozen projection contract. |
| Worker process memory | EPHEMERAL | Recovered through durable assignment, lease, checkpoint, and event state. |
| Provider/executor local cache | EPHEMERAL | Never canonical ACS recovery truth. |

## Idempotency contract

ACS owns idempotency at the command boundary. The minimum durable key is:

~~~text
scope + command_type + target_aggregate + idempotency_key + request_hash
~~~

The caller may supply an opaque idempotency_key. ACS owns its interpretation,
scope, request hash, result reference, status, and timestamps. The key is stored
in the shared PostgreSQL state with a uniqueness constraint over the command
scope and aggregate.

Behavior:

1. A first request validates authority and writes the canonical state, event,
   outbox, and result atomically.
2. A repeat with the same scope, key, and request hash returns the original
   logical result without creating a second state mutation or event.
3. A repeat with the same key but a different request hash returns a
   deterministic idempotency conflict.
4. Concurrent first requests serialize on the durable unique key. One commits;
   the other observes the committed result or returns the same conflict.
5. Process restart does not remove keys or results.

Runtime job idempotency and economic record idempotency remain specialized
implementations under this general contract. Their existing identity,
tenant-scoping, conflict, and fencing behavior must be preserved.

## Restart and recovery

On restart, ACS reopens the shared PostgreSQL state, checks schema health, and
reconstructs canonical records from durable rows. It does not trust process
memory, provider state, or an external executor's local journal.

Recovery sequence for a pending operation:

1. inspect durable state and idempotency records;
2. resolve committed versus rolled-back transaction outcome;
3. recover active or expired runtime leases using existing fencing rules;
4. resume pending outbox delivery after its lease is absent or expired;
5. restore checkpoint and event cursors only for explicitly supported ACS flows;
6. preserve prior attempts, events, evidence, usage, and cost records.

An unknown external outcome is recorded as unknown or reconciliation-required.
ACS does not infer success from a lost acknowledgement.

## Fencing integration

The existing runtime ownership validation remains authoritative. A canonical
runtime mutation must validate job, assignment, lease, worker identity,
instance identity, service principal, fencing token, assignment status, and
lease validity before writing state.

The event/outbox write belongs to the same transaction as the accepted runtime
mutation. Therefore:

- a stale worker cannot commit a state mutation;
- a stale worker cannot create the event that would represent that mutation;
- a late result is rejected under the existing stale-owner error path;
- lease expiry creates recovery work and a new fencing token;
- recovery never rewrites the previous attempt;
- a checkpoint is tied to its run/task/attempt and assignment context.

An ACS-authenticated control-plane component may record a fencing rejection as a
canonical observation after the rejected command, but the stale worker cannot
author that event by bypassing the control plane.

## Replay contract

Replay source is the canonical ACS event store, supplemented by durable
canonical state when a command's state transition is not event-complete in the
current legacy data. The target is ACS reconstruction, diagnostics, or an
explicitly introduced read model.

Replay must define:

- stream scope and sequence ordering;
- starting cursor and ending boundary;
- consumer identity and durable cursor when replay is resumable;
- event schema compatibility mapper;
- duplicate event_id handling;
- failure point and restart behavior;
- whether writes are isolated to a rebuild target;
- completion evidence.

Replay is append/read-model work. It must not dispatch external work, call a
provider, invoke a tool, send a webhook, or repeat an irreversible side effect.
An external retry is a new command and is outside replay.

Partial replay leaves the target marked incomplete or rebuilding. A rerun from
the same cursor or from a clean rebuild target must be safe under consumer
idempotency.

## Projection decision

Projection rebuild is NOT REQUIRED for the v1 durable foundation. The inspected
ACS shared-state contracts expose repositories for canonical entities and
runtime events, but no generic projection ownership, cursor, rebuild, or stale
read-model contract. REQ-03 places reporting projections after the foundation.

If a later Product API or reporting surface needs projections, it requires a
separate contract defining source, owner, cursor, stale behavior, rebuild
evidence, and side-effect isolation. IMP-01B must mark this gate NOT
APPLICABLE rather than invent a projection system.

## Failure analysis

| Failure point | Expected durable state | Recovery | Duplication/data-loss risk | Protection |
| --- | --- | --- | --- | --- |
| 1. Process dies before state transaction | No new state, event, outbox, or result | Retry command with same key | No committed mutation; request may be retried | Transaction starts only at command boundary; durable idempotency |
| 2. Process dies during transaction | PostgreSQL commits all writes or rolls all back | Reconnect and inspect durable key/state; retry if absent | No partial canonical operation after database recovery | One transaction for state/event/outbox/result |
| 3. Dies after state commit before delivery | State, event, outbox, result committed; delivery pending | Dispatcher scans pending rows after restart | Delivery may be repeated; canonical data is not lost | Outbox durable after commit |
| 4. Delivery succeeds but acknowledgement is lost | Consumer may have applied event; outbox remains retryable/leased | Retry with event_id; consumer deduplicates | Duplicate transport or processing attempt | Consumer idempotency |
| 5. Consumer processes same event twice | One canonical consumer result | Return stored result on second event_id | At-least-once repeat; no duplicate logical effect | Scoped event_id/request idempotency |
| 6. Projection rebuild stops midway | Target marked incomplete or cursor remains before failed event | Resume or clean rebuild from canonical source | Partial read model can be stale | Cursor/checkpoint and rebuild status |
| 7. Stale worker state mutation | No accepted state change | Existing stale-owner rejection and recovery | Late result ignored; no canonical corruption | Lease, worker identity, fencing token |
| 8. Stale worker event creation | No canonical event for rejected mutation | Control plane may record rejection observation | No unauthorized event; caller sees conflict | Event insert is inside accepted mutation transaction |
| 9. Concurrent Agent revisions | One head advance; loser receives conflict | Reread and resubmit new revision | No silent fork or lost history | Expected-head compare-and-swap and unique lineage keys |
| 10. Restart with pending outbox | Event and pending delivery row remain | Claim after lease expiry and retry | At-least-once delivery | Durable status, lease, attempt count, idempotent consumer |

## Usage and Cost recovery

Usage and Cost records are correlated to the Run, Task, Attempt, Agent
revision, and canonical event that produced or measured them. A duplicate
usage observation uses the existing scoped idempotency contract. A duplicate
cost calculation returns the prior result or creates an explicit correction
according to the economic contract.

REQ-04 does not define prices, settlement, treasury, or policy. If a partial
usage/reservation operation is discovered, the record remains reconcilable and
must not be silently counted twice.

## Security review

The selected model:

- keeps canonical write authority in ACS;
- rejects stale-worker writes and event creation;
- binds idempotency to scope and request hash;
- treats replay as side-effect isolated;
- keeps provider/executor identity as an observation or binding reference;
- validates persisted schema and fingerprints;
- excludes credentials and secret material from canonical payloads;
- prevents cross-Agent confusion through aggregate and scope checks.

Malformed durable data is an integrity failure and must fail closed for
canonical mutation. No external system receives direct database ownership.

## Final decision

Idempotency: FROZEN-v1.

Replay: FROZEN-v1.

Projection rebuild: NOT REQUIRED.

Restart/recovery: FROZEN-v1.

Fencing integration: FROZEN-v1.
