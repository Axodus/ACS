# EPIC-17-REQ-06 — Memory Policy & Memory Store Boundary

**Status:** `COMPLETE / ACCEPTED`
**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `5f8fcf0f55c139f0bcb0c9d375f027329f481273`
**Baseline:** `fdd0c6446491e0d367652ffd3dd081afccf0a448`
**Dependencies:** `REQ-01 COMPLETE / ACCEPTED`; `REQ-03 COMPLETE / ACCEPTED`; `REQ-04 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
Governance policy authority
  -> versioned rules for scopes, read/write, retention, deletion and provenance

Memory companion domain
  -> governed records, scope isolation, lifecycle and content addressing

Agent / Workforce / operation
  -> exact references and attenuating requests
  -> never Memory ownership or implicit authority

admission / execution
  -> effective policy snapshot + retrieval/write Evidence
  -> never raw Memory content in the configuration snapshot
```

Governance remains the semantic authority for Memory policy, while the concrete
versioned policy contract is a demonstrated gap. Memory is a missing companion
domain. It does not become part of Agent or
Workforce identity, and it cannot replace runtime state, checkpoints, Knowledge,
events or Evidence. Store technology and persistence representation remain
future contract decisions.

## Capability dispositions

| Capability | Class | REQ-06 disposition |
| --- | --- | --- |
| `E17-C26` Memory policy | `NEW` | Extend Governance policy authority with a versioned contract behind the existing `memory_policy_ref`; absent required policy fails closed. |
| `E17-C30` Working Memory | `NEW` | Define short-lived Run/Task-scoped records outside canonical runtime state and checkpoints. |
| `E17-C31` Agent Memory | `NEW` | Define persistent Agent-scoped companion records referencing canonical `agent_id`; no Agent aggregate expansion. |
| `E17-C32` Workforce Shared Memory | `NEW` | Define companion records scoped by exact Workforce/Run references; no field or mutable state in Workforce Core. |
| `E17-C33` User/context Memory | `NEW` | Require Tenant, subject, purpose, consent/privacy and deletion authority. |
| `E17-C34` Knowledge Memory | `ADAPT` | Use provenance-bearing Knowledge sources for retrieval; Memory may hold retrieval/index state but cannot become source truth. |
| `E17-C35` Historical/episodic Memory as Evidence/history alias | `REJECT` | Memory may reference or summarize history but cannot replace canonical events or Evidence. |

## Documents

- [Evidence and taxonomy](evidence-and-taxonomy.md)
- [Authority and access matrix](authority-and-access.md)
- [Retention, deletion and reconstruction](retention-and-reconstruction.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

```text
REQ-05: COMPLETE / ACCEPTED
REQ-06: COMPLETE / ACCEPTED
REQ-07: READY / GO
Implementation authority: NONE
```
