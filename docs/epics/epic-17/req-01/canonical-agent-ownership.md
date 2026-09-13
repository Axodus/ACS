# REQ-01 Canonical Agent Ownership

**Decision state:** `CTO ACCEPTED`

## 1. Ownership decision

ACS owns Agent identity and lineage. The Native Agent contracts define the
canonical semantics, and the shared PostgreSQL Native Core repository owns
durable state.

| Concern | Canonical owner | Normative rule |
| --- | --- | --- |
| Agent identity | `AgentDefinitionV2.agent_id` | Opaque, stable ACS identity; never derived from provider, executor, model, runtime or UI IDs. |
| Scope and ownership | `AgentDefinitionV2.scope`, `ownership_ref`, `sharing_mode` | ACS/Tenant/governance authority; sharing does not imply authority or resource sharing. |
| Lifecycle vocabulary | `NativeAgentStatus` | `draft`, `active`, `disabled`, `archived` remain the only canonical Agent lifecycle states. |
| Current head | `AgentDefinitionV2.current_revision` | Points to the current committed Native revision. |
| Revision content | `AgentRevisionV2` | Immutable fingerprinted behavior/configuration references and commit provenance. |
| Durable head/history | `AsyncNativeCoreRepository` through `PostgresNativeCoreRepository` | Shared PostgreSQL `native_v2` rows are the durable authority. |
| Concurrency | `advanceAgentLineage.expectedHead` | Exactly one expected-head advance wins; no automatic merge or fork. |
| Events and dispatch | Native event/outbox/idempotency transaction | State, canonical event, outbox and idempotency commit under one shared transaction. |
| Application representation | Existing Product API | Projection of canonical Agent state; it does not own the aggregate. |

`AgentDefinitionV2` and `AgentRevisionV2` are parts of one Agent aggregate. They
are not separate Agent identities or competing revision authorities.

## 2. Stable and revision-bearing state

The following identity fields are stable for the life of the canonical Agent:

```text
agent_id
scope identity and Tenant boundary
ownership_ref
created_at
```

Changing an Agent never changes `agent_id` and never converts a provider,
executor or external identity into the canonical reference.

The current Native contract separates head fields from fingerprinted behavior:

```text
AgentDefinitionV2 head:
name, status, sharing_mode, current_revision, updated_at

AgentRevisionV2 fingerprinted content:
role, instructions, capability requirements, constraints,
knowledge, resources, runtime preferences, governance,
economics and Evidence policy
```

This separation does not create two lineages. Any future mutation of either
group must pass one canonical Agent command authority, produce canonical
history/evidence and preserve exact historical interpretation.

## 3. Revision and lineage rules

- Revision 1 is the root and has no predecessor.
- Every later revision advances exactly one expected canonical head and records
  `supersedes_revision` equal to that head.
- ACS computes and validates the revision fingerprint from normalized semantic
  content.
- A committed revision is append-only.
- A Run, Workforce membership or other historical reference binds
  `agent_id + revision + fingerprint`.
- A failed CAS returns a conflict; ACS does not merge or silently fork.
- Restart reconstruction validates the head, contiguous history, predecessor
  chain and fingerprint agreement.
- Native historical revisions are not physically deleted by an ordinary Agent
  lifecycle operation.

## 4. Lifecycle rule

`NativeAgentStatus` remains authoritative. Archive and disable are state
transitions inside the same canonical Agent aggregate. Restore or adoption of
historical behavior creates a new canonical commit; it does not move the head
backward or edit an old revision.

The repository currently lacks a native public lifecycle command and does not
fingerprint the head fields. Before implementation, an accepted additive
contract must make `name`, `status` and `sharing_mode` historically
reconstructable through the same aggregate event/lineage authority. A separate
lifecycle database, mutable shadow record or second revision stream is
rejected.

## 5. Canonical reference rule

Downstream EPIC-17 REQs use:

```text
current identity reference:
  agent_id

historical operational reference:
  AgentRevisionRef = agent_id + revision + fingerprint
```

Profile, Persona, Memory, Delegation, Automation and Genome traits may reference
that identity or exact revision as their accepted owner requires. None may
redefine Agent identity, lifecycle or lineage.
