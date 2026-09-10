# REQ-04 — Agent Lineage Contract

## Problem

IMP-01 defines ACS-native AgentRevision values and fingerprints, but the
durable owner of the canonical Agent head and immutable historical lineage was
left open. The current repository already has current and history tables, yet
the generic save/remove interface still describes mutable current state.

## Existing ACS capability

The ACS control plane owns the Agent repository through
PostgresSharedAuthoritativeState. The existing schema has:

- acs_agents, keyed by agent_id, with a current revision and payload;
- acs_agent_history, keyed by agent_id and revision;
- repository methods for create, get, list, save, history, and remove;
- optimistic revision conflict errors;
- native AgentRevision fingerprint validation and deterministic serialization.

REQ-03 already freezes stable Agent identity, immutable integer revisions,
fingerprints, supersedes_revision, and provider-neutral references. External
provider, executor, model, runtime, and worker IDs are not ACS Agent identity.

## Decision framework

### Option A — Adapt the existing ACS Agent repository and tables

The shared PostgreSQL Agent repository remains the owner. Add an
append-revision-and-advance-head command, enforce historical immutability, and
couple the command to the canonical event, outbox, and idempotency transaction.

### Option B — Create a separate native Agent database or lineage service

Move native Agent lineage to a new database or service and bridge it to the
existing control plane.

### Evidence

Option A uses already implemented ACS-owned tables, transactions, migrations,
revision conflict handling, and repository composition. Option B would
duplicate identity and transaction authority and would violate the REQ-02
reuse-first boundary without evidence that PostgreSQL is insufficient.

### Trade-offs

Option A requires an additive schema and interface change, but preserves
existing data and operational ownership. Option B could isolate a new model but
would introduce cross-store atomicity, migration, recovery, and authority
problems.

### Security impact

Option A keeps identity, scope, history, and authorization in ACS. Option B
would increase identity-confusion and cross-store write risks.

### Migration impact

An additive migration is required to add lineage constraints and any durable
command/idempotency support. Historical data is not destructively converted.

### Dependency impact

Option A introduces no new dependency. Option B would require a new database,
service, or coordination mechanism and is rejected.

## Frozen contract

### Canonical owner

ACS control plane owns the canonical Agent aggregate. The durable owner is the
existing shared PostgreSQL state behind PostgresSharedAuthoritativeState. The
native-core Agent types define the shape and validation rules; they do not own
durable storage.

### Identity

agent_id is an opaque ACS-generated stable identifier. It is scoped according
to the existing ACS tenant/organization boundary and is never replaced by a
provider, executor, model, harness, worker, or runtime identifier.

The minimum stable reference is:

~~~text
AgentRevisionRef = agent_id + revision + fingerprint
~~~

### Revision

revision is a positive monotonic integer within one Agent lineage. Revision 1
is the root and has no predecessor. Every later revision records
supersedes_revision equal to the prior canonical head.

The current row in acs_agents represents the canonical head. The history table
contains every committed revision, ordered by revision. A run stores the exact
revision reference it admitted; advancing the head cannot change that run's
historical reference.

### Fingerprint

ACS computes fingerprint from canonical normalized AgentRevision content. The
fingerprint excludes timestamps and other fields that do not change meaning.
The stored value must be recomputed and compared at write and read boundaries.

Fingerprint uniqueness is required within one Agent lineage:

~~~text
(agent_id, fingerprint) is unique
~~~

Global fingerprint uniqueness is not required. Equal content may legitimately
be shared by different Agents while their ACS identities remain distinct.

### Immutability

A committed historical revision is append-only. No native Agent operation may
change its payload, fingerprint, predecessor, creator, or commit metadata.
A repeated write for the same revision and identical content is idempotent; a
different payload for the same Agent and revision is a conflict.

The native contract does not physically delete historical revisions. An Agent
is disabled or archived through a new canonical state/revision. The existing
remove method is not used by the native lineage path; it must be rejected,
deprecated, or restricted to an explicitly non-native compatibility path.

### Create and update

Creating an Agent creates the stable identity, revision 1, current head, and
history row in one transaction.

Updating an Agent means:

~~~text
create immutable revision
        +
advance canonical head
~~~

It never edits a committed revision in place. The command accepts an expected
head revision. The create case uses expected head 0; update uses the observed
head. The write inserts the new history row and advances the current row
atomically.

The same transaction also appends the canonical event, creates its outbox
record, and records the idempotency result when the operation is event-bearing.

### Concurrency

Two writers that submit against the same expected head are serialized by the
database. One succeeds. The other receives a deterministic revision conflict
and must reread and resubmit a new revision if authorized. ACS does not merge
competing revisions automatically and does not silently fork the canonical
head.

The conflict includes the Agent identity and expected/current head where
available. A provider or executor cannot bypass the compare-and-swap boundary.

### Restart reconstruction

After process restart, the Agent is reconstructed from the durable current row
and history rows. The reconstruction must verify:

1. the head row exists;
2. the head revision exists in history;
3. revisions are contiguous from 1 through the head;
4. each fingerprint matches normalized content;
5. each predecessor reference points to the immediately prior revision;
6. the current head equals the greatest committed revision.

Failure of these checks is a repository integrity error and prevents a
canonical write until repaired under a separate operational procedure.

### Provenance

Each revision records created_by, committed_at, change_reason, correlation
context, and the authority/scope references required by REQ-03. The canonical
revision may reference an audit record and an EventEnvelopeV2 event. Those
references explain creation; they do not turn the revision into an audit
record or evidence record.

### Retention

Historical revisions are retained for the life of the native contract. Any
future retention or legal deletion policy requires a separately reviewed
contract that preserves run references and provenance. REQ-04 authorizes no
destructive retention action.

## Final decision

Agent lineage persistence: FROZEN-v1.

Agent revision semantics: FROZEN-v1.

Recommendation: adapt the existing ACS PostgreSQL Agent repository and schema;
do not create a new lineage database or service.
