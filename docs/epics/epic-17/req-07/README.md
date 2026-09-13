# EPIC-17-REQ-07 — Delegation & Agent-to-Agent Authority Boundary

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `5f8fcf0f55c139f0bcb0c9d375f027329f481273`
**Dependencies:** `REQ-01` through `REQ-06 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
canonical Agent A
  -> bounded Delegation Grant
     = authority intersection
     + policy/scope/time constraints
     + provenance/chain
  -> canonical Agent B
  -> existing admission
  -> Run / Task / Assignment machinery
```

Governance remains the authority owner. Delegation is a governed authorization
artifact that conveys only an attenuated subset of authority already available
to its delegator. It does not mint authority, create an Agent, assign work,
bypass admission or transfer data and credentials.

The logical grant semantics are required. Whether the grant is represented as
an entity, relation, policy record or separate aggregate remains open for a
future accepted contract decision.

## Capability dispositions

| Capability | Class | REQ-07 disposition |
| --- | --- | --- |
| `E17-C36` Agent-to-Agent delegation | `NEW` | Define a governed, bounded grant between two canonical Agent identities; representation remains deferred. |
| `E17-C37` Delegation permissions | `NEW` | Effective authority is the intersection of delegator authority, grant, policy, scope and time. |
| `E17-C38` Depth/recursion policy | `NEW` | Require explicit depth, onward-delegation permission and canonical Agent cycle rejection. |
| `E17-C39` Delegation history | `ADAPT` | Reuse events, Decision, Approval and Evidence with a grant/chain subject reference. |
| `E17-C40` Sub-Agent identity | `REJECT` | Delegator and delegate remain canonical Agents; legacy sub-Agent flags grant nothing. |
| `E17-C41` Workforce | `REUSE` | Preserve Workforce definitions, revisions, slots and governance unchanged. |
| `E17-C42` Workforce membership and Run admission | `REUSE` | Preserve exact admitted Agent revisions, membership snapshots, authority decisions and existing execution machinery. |

## Package

- [Evidence and owner boundary](evidence-and-boundary.md)
- [Grant and attenuation semantics](grant-and-attenuation.md)
- [Chain, lifecycle and reconstruction](chain-lifecycle-and-reconstruction.md)
- [Workforce, runtime and resource interaction](workforce-runtime-and-resources.md)
- [Representation analysis](representation-analysis.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

```text
REQ-07: COMPLETE / READY FOR CTO ACCEPTANCE
REQ-08: BLOCKED_BY_REQ-07_ACCEPTANCE
Implementation authority: NONE
```
