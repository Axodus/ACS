# EPIC-17-IMP-03B — Persistence & Migration Design Candidate

**Status:** `CANDIDATE / CTO DECISION REQUIRED`
**Schema authority:** none
**Migration execution:** prohibited
**Current schema:** 8
**Candidate target:** schema 9 only if a Durable Memory Store receives separate CTO authorization

## Design conclusions requiring approval

This document is a candidate, not migration SQL. It answers the persistence questions before a functional slice begins.

1. **Memory Policy needs its own durable immutable revision lineage.** An exact Agent `memory_policy_ref` must resolve under Governance authority and be reconstructible at its original revision.
2. **Memory Record needs immutable successor semantics.** Correction, semantic change or permitted content replacement creates a successor; historical content is never mutated in place.
3. **A small current head is justified for each stable Record identity.** It supports lifecycle and bounded current queries only. It is not a mutable historical-content store.
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

## Candidate structures

The candidate has four lineage tables plus one content-residence table. The content separation allows content deletion without destroying the content-free integrity/provenance trail. All belong to the single canonical Memory Store; this is not a second database or authority.

| Structure | Purpose / owner | Identity and Tenant boundary | History / key constraints |
| --- | --- | --- | --- |
| `acs_memory_policies` | Governance-owned current Policy head | `memory_policy_id` PK, `tenant_id` FK | current revision/fingerprint/lifecycle; composite FK to exact head revision. |
| `acs_memory_policy_revisions` | Immutable Policy semantics/history | `(memory_policy_id, revision)`, Tenant-bound | fingerprint, predecessor, lifecycle, commit/correlation/Event fields. |
| `acs_memory_records` | Memory Store-owned stable identity/current lifecycle index | `memory_id` PK, `tenant_id` FK | class, scope discriminator/owner, current revision/fingerprint/lifecycle. |
| `acs_memory_record_revisions` | Immutable record successor history | `(memory_id, revision)`, Tenant-bound | exact Policy ref, scope/provenance/sensitivity, content ref/digest or tombstone. |
| `acs_memory_content_objects` | Memory Store-owned private content residence | opaque `content_ref` PK, `tenant_id` FK | protected content/pointer, digest, deletion timestamps and decision ref. |

### Policy head and revisions

`acs_memory_policies` is a head projection with `current_revision`, `current_fingerprint`, `current_lifecycle`, `created_at` and `updated_at`. It is Tenant-owned and has a deferrable composite foreign key to `(memory_policy_id, tenant_id, current_revision, current_fingerprint)` in the revision table.

`acs_memory_policy_revisions` stores immutable semantics: permitted Memory classes/scopes/actions/purposes; bounds; retention/deletion precedence; required provenance/Evidence; adapter eligibility; creator, timestamp, reason, correlation and Event ref. It contains no Memory content, secret, credential, token, consent value or user identity material. Revision 1 has no predecessor; later revisions immediately supersede the preceding revision.

CAS is `expected_revision + expected_fingerprint`. A stale operation changes no head, no revision, no Event and no outbox. A policy idempotency scope is `memory-policy:<tenant>:<policy>`.

### Record head and immutable successors

`acs_memory_records` owns stable `memory_id`, `tenant_id`, `memory_class`, `scope_kind`, `scope_owner_id`, current revision/fingerprint and lifecycle. Candidate initial classes are `working`, `agent`, `workforce_shared` and `knowledge_backed`; `user_context` is excluded while B03 remains open. Candidate lifecycle is `active`, `expired`, `forgotten`, `deleted`, `archived`, subject to ADR-023.

Its current-query index is `(tenant_id, memory_class, scope_kind, scope_owner_id, current_lifecycle, memory_id)`. This is not globally unique across Agent, Workforce, Knowledge or external sources. Exact scope references are validated as Tenant-compatible before persistence; a reference never grants access.

`acs_memory_record_revisions` is immutable. It includes Policy id/revision/fingerprint, scope/subject refs, sensitivity, Knowledge source/version/fingerprint where applicable, provenance, successor metadata and event metadata. Live content has an opaque `content_ref` and `content_digest`; a deleted record has a tombstone with deletion reason, policy/decision refs and digest but no readable content. A record idempotency scope is `memory-record:<tenant>:<memory>` and cannot collide with Policy operations.

A historical Run snapshot later references the exact Record revision/digest. A successor cannot reinterpret that use. When content is lawfully deleted, reconstruction reports the record ref, digest, tombstone and decision; it never returns raw content.

### Content residence and deletion

`acs_memory_content_objects` is the only candidate raw-content residence. It holds opaque `content_ref`, `tenant_id`, protected bytes or a provider-independent protected-object pointer, content digest/classification, creation/deletion timestamps and deletion-decision reference. It must not serialize through normal domain/event/evidence/API/log paths.

ADR-023 must select one implementation before migration: protected PostgreSQL bytes or a governed content adapter. Both remain part of one Memory Store authority, and neither may make an opaque ref a reusable read credential.

Deletion removes or cryptographically makes unavailable the bytes/pointer. Immutable Record revisions retain only an opaque reference, digest and tombstone proof. The implementation must also clear raw content from derived/index persistence and must reject any attempt to use a dangling ref to recover content.

## Foreign references, indexes and retention

Every Policy and Record table has `tenant_id` and references `acs_tenants`. A Record revision references its exact Policy revision via `(policy_id, tenant_id, revision, fingerprint)`. Agent, Workforce, Run/Task/Attempt and Knowledge references are checked at the domain boundary and, where the existing schema permits, protected by Tenant-compatible foreign keys. A future schema must not invent authority by adding a reference.

Recommended indexes are current-head Tenant/lifecycle indexes, immutable `(tenant_id, memory_id, revision)` lookup, `(tenant_id, policy_id, revision)` lookup, content digest lookup only if policy permits integrity checking, and bounded scope indexes. No unbounded content, semantic-rank or cross-Tenant index is authorized. Vector/index providers remain replaceable adapters under ADR-024.

Physical deletion/retention is a lifecycle operation, not a row drop. Record identity, tombstone, digest, policy decision, provenance and Event/Evidence refs remain according to policy. Legal hold and consent semantics are not implemented by this candidate; User Context Memory remains blocked by B03.

## CAS, idempotency, Event, Evidence and outbox

A future successful mutation uses one PostgreSQL transaction:

```text
validated command + expected head + idempotency claim
  -> immutable policy/record revision and head update
  -> canonical Event
  -> outbox
  -> Evidence when Policy requires it
  -> commit
```

Any failure rolls back all mutations and idempotency completion. Same scope/key/request hash replays the canonical result; same key with a different intent returns a typed conflict. Event and Evidence are distinct: Event records the canonical fact; Evidence records proof/provenance. Neither may carry raw content, a readable content location, secrets or reusable authorization material.

## Event subject recommendation

The Event envelope has closed existing subjects and accepted Integration additions. Memory must not be represented as an Agent, Workforce, Run or Task event to reuse the store.

**Recommendation for CTO decision before functional mutation:** extend the existing closed vocabulary additively with `memory_policy` and `memory_record`. Use the stable Policy/Record ID as `subject_id`; Event type expresses creation, revision, lifecycle, write, correction, expiry or deletion. This extends neither Event-store ownership nor schema structure unless the current validation/constraint requires an additive compatible update. If the vocabulary is rejected or deferred, Memory mutation is blocked; no generic fallback subject is allowed.

## Candidate schema-9 migration plan

| Concern | Candidate plan |
| --- | --- |
| Current -> target | Additive `8 -> 9`; no destructive rewrite. |
| Forward migration | Create approved Memory tables, Tenant/FK/check constraints and indexes. Extend Event validation only after the subject decision. |
| Bootstrap | Existing migration runner reaches 9 for fresh PostgreSQL. |
| Legacy data | Development data is disposable; no SQLite import, backfill, mapping or fabricated provenance is proposed. |
| Old code/new schema | Safe: additive tables are ignored. |
| New code/old schema | Fail closed: durable Memory commands refuse to run; no JSON fallback or dual owner. |
| Deployment ordering | Migrate, deploy repositories/contracts, validate PostgreSQL, then enable commands. |
| Rollback | Before writes, code rollback leaves additive tables unused. After writes, roll forward preserves canonical Records/tombstones; dropping tables is prohibited. |
| Failure atomicity | Existing migration runner plus one transaction per domain mutation. |

This does not authorize schema 9, the migration, content storage, Event vocabulary expansion or any code change.

## Required validation after a separate GO

Before migration authorization, close ADR-021, ADR-023, ADR-024 and the Event-subject decision. Durable validation must cover Policy CAS/fingerprint mismatch; Record successor immutability; Tenant/scope substitution; distinct idempotency scopes; Event/Evidence/outbox rollback; exact Policy/Record reconstruction; deleted-content non-recovery; Knowledge source provenance; redaction; and schema-9 `npm run acceptance:postgres`. Full regression requires `A = 0` and `D = 0`; listener validation only applies if a listener surface is added.
