# EPIC-17-IMP-03B — Persistence & Migration Design Candidate

**Status:** `RECONCILED / PHYSICAL DESIGN COMPLETE / CTO ACCEPTED; ADR-023 REQUIRED`
**Schema authority:** none
**Migration execution:** prohibited
**Current schema:** 8
**Candidate target:** schema 9 only if a Durable Memory Store receives separate CTO authorization

## Design conclusions requiring approval

This document is a candidate, not migration SQL. It answers the persistence questions before a functional slice begins.

1. **Memory Policy needs its own durable immutable revision lineage.** An exact Agent `memory_policy_ref` must resolve under Governance authority and be reconstructible at its original revision.
2. **Memory Record needs immutable successor semantics.** Correction, semantic change or permitted content replacement creates a successor; historical content is never mutated in place.
3. **Memory Record has no revision lineage or mutable current head.** Each immutable content-bearing Record has a stable identity. Changed remembered content creates a separately identified successor; active versus tombstoned state is derived from content/tombstone presence.
4. **Retention/deletion semantics must freeze before migration.** The chosen schema must permit physical content deletion without raw content surviving in history, Event, Evidence, outbox, logs or derived persistence.

## Existing inventory and insufficiency

| Existing structure | Current owner | Why it is insufficient |
| --- | --- | --- |
| `acs_agents`, `acs_agent_history` | Agent identity/revisions | The Policy reference seam does not make Agent the Policy or Record owner. |
| Workforce durable state | Membership/constraints/governance | Workforce Shared Memory is companion data; adding fields changes accepted Workforce ownership. |
| Runs, intents, attempts, checkpoints | Runtime/recovery state | Working Memory cannot replace operation/recovery truth. |
| `acs_native_events`, `acs_native_evidence`, `acs_native_outbox` | Fact, proof, delivery | They cannot store Memory content, especially after deletion. |
| `acs_native_idempotency` | Successful command replay | It can be reused for operations but is not Memory persistence. |
| Schema-8 Integration tables | REQ-05 Connection/Channel lineages | Their owner and semantics are unrelated. |

No existing table, repository or JSON/document field is a canonical Memory owner. Storing it incidentally in Agent, Runtime, Event, Evidence or Product API state is prohibited.

## Physical-design authority

The CTO accepted the logical conclusions above and authorized a concrete, documentation-only physical review. The authoritative proposed table shape, constraints, transactions and schema-8-to-9 compatibility plan are in [schema-9 physical persistence design](imp-03b-schema-9-physical-design.md).

The older Record-head and `acs_memory_record_revisions` candidate below is withdrawn. It must not be implemented. The accepted direction is one immutable `MemoryRecord` per `memory_id`, successor lineage between Records, separate content residence and a content-free tombstone.

### Policy head and revisions

`acs_memory_policies` is a head projection with `current_revision`, `current_fingerprint`, `current_lifecycle`, `created_at` and `updated_at`. It is Tenant-owned and has a deferrable composite foreign key to `(memory_policy_id, tenant_id, current_revision, current_fingerprint)` in the revision table.

`acs_memory_policy_revisions` stores immutable semantics: permitted Memory classes/scopes/actions/purposes; bounds; retention/deletion precedence; required provenance/Evidence; adapter eligibility; creator, timestamp, reason, correlation and Event ref. It contains no Memory content, secret, credential, token, consent value or user identity material. Revision 1 has no predecessor; later revisions immediately supersede the preceding revision.

CAS is `expected_revision + expected_fingerprint`. A stale operation changes no head, no revision, no Event and no outbox. A policy idempotency scope is `memory.policy:<tenant>:<policy>`.

### Record identity and immutable successors

Each `acs_memory_records` row is one immutable Memory Record with a stable `memory_id`, Tenant, class, closed scope, exact Policy revision/fingerprint and provenance. It does not carry a `revision`, `current_revision`, `current_fingerprint` or mutable content field. Active versus tombstoned state is derived from content/tombstone presence. Candidate initial classes are `working`, `agent`, `workforce_shared` and `knowledge_backed`; `user_context` is excluded while B03 remains open.

A changed remembered content creates a new `memory_id` with a Tenant-bound predecessor ref. A historical snapshot references that exact immutable identity and, where the calling contract permits it, its permitted digest. It never follows a successor or reads a current head. The physical design defines Tenant-safe predecessor integrity, insert-only enforcement and cycle prevention.

### Content residence and deletion

The physical design uses `acs_memory_contents` as the only candidate raw-content residence. It is keyed by the exact immutable `memory_id` and Tenant, holds protected bytes, digest and encryption-key reference, and must not serialize through normal domain/event/evidence/API/log paths.

The schema-9 proposal fixes the content residence as protected PostgreSQL bytes in `acs_memory_contents`. The [ADR-023 package](imp-03b-adr-023-encryption-erasure.md) recommends the governed encryption-key owner, opaque protection metadata and truthful backup/WAL erasure posture required before migration. Neither may make an internal content relation or key reference a reusable read credential.

Deletion deletes the content row. Immutable Record metadata retains neither a content reference nor a digest; the content-free tombstone retains a digest only when the exact Policy permits it. The implementation must also clear raw content from derived/index persistence and reject any attempt to recover deleted content through an internal relation or backup path outside the approved erasure policy.

## Foreign references, indexes and retention

Every Policy and Record table has `tenant_id` and references `acs_tenants`. Each immutable Record references its exact Policy revision via `(policy_id, tenant_id, revision, fingerprint)`. Agent, Workforce, Run/Task/Attempt and Knowledge references are checked at the domain boundary and, where the existing schema permits, protected by Tenant-compatible foreign keys. A future schema must not invent authority by adding a reference.

Recommended indexes are current Policy-head Tenant/lifecycle lookup, immutable `(tenant_id, memory_id, fingerprint)` lookup, `(tenant_id, policy_id, revision)` lookup, and bounded scope indexes. Content digest has no index after deletion; a tombstone carries it only when Policy permits retention. No unbounded content, semantic-rank or cross-Tenant index is authorized. Vector/index providers remain replaceable adapters under ADR-024.

Physical deletion/retention is a lifecycle operation, not a row drop. Record identity, tombstone, digest, policy decision, provenance and Event/Evidence refs remain according to policy. Legal hold and consent semantics are not implemented by this candidate; User Context Memory remains blocked by B03.

## CAS, idempotency, Event, Evidence and outbox

A future successful mutation uses one PostgreSQL transaction:

```text
validated command + expected head + idempotency claim
  -> immutable Policy revision and head update, or a new immutable Record/successor
  -> canonical Event
  -> outbox
  -> Evidence when Policy requires it
  -> commit
```

Any failure rolls back all mutations and idempotency completion. Same scope/key/request hash replays the canonical result; same key with a different intent returns a typed conflict. Event and Evidence are distinct: Event records the canonical fact; Evidence records proof/provenance. Neither may carry raw content, a readable content location, secrets or reusable authorization material.

## Event subject recommendation

The Event envelope has closed existing subjects and accepted Integration additions. Memory must not be represented as an Agent, Workforce, Run or Task event to reuse the store.

**CTO decision:** extend the existing closed vocabulary additively with `memory_policy` and `memory_record`. Use the stable Policy/Record ID as `subject_id`; Event type distinguishes Policy creation/revision/lifecycle from Record creation/successor/tombstone. The envelope/store change is deferred until a Slice 2 mutation emits canonical Memory Events. It extends neither Event-store ownership nor schema structure unless the current validation/constraint requires an additive compatible update. No generic fallback subject is allowed.

## Candidate schema-9 migration plan

| Concern | Candidate plan |
| --- | --- |
| Current -> target | Additive `8 -> 9`; no destructive rewrite. The concrete candidate is in the physical design. |
| Forward migration | Create approved Memory tables, Tenant/FK/check constraints and indexes. Implement the already-approved Event vocabulary only in the authorized Slice that emits Memory Events. |
| Bootstrap | Existing migration runner reaches 9 for fresh PostgreSQL. |
| Legacy data | Development data is disposable; no SQLite import, backfill, mapping or fabricated provenance is proposed. |
| Old code/new schema | Safe: additive tables are ignored. |
| New code/old schema | Fail closed: durable Memory commands refuse to run; no JSON fallback or dual owner. |
| Deployment ordering | Migrate, deploy repositories/contracts, validate PostgreSQL, then enable commands. |
| Rollback | Before writes, code rollback leaves additive tables unused. After writes, roll forward preserves canonical Records/tombstones; dropping tables is prohibited. |
| Failure atomicity | Existing migration runner plus one transaction per domain mutation. |

This does not authorize schema 9, the migration, content storage, Event vocabulary expansion or any code change.

## Required validation after a separate GO

Before migration authorization, approve ADR-023's encryption-key ownership, backup/WAL erasure policy, external-reference Tenant validation, and immutable-row enforcement. Durable validation must cover Policy CAS/fingerprint mismatch; Record successor immutability; Tenant/scope substitution; distinct idempotency scopes; Event/Evidence/outbox rollback; exact Policy/Record reconstruction; deleted-content non-recovery; Knowledge source provenance; redaction; and schema-9 `npm run acceptance:postgres`. Full regression requires `A = 0` and `D = 0`; listener validation only applies if a listener surface is added.
