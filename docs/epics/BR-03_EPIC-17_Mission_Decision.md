# BR-03 — EPIC-17 Mission Decision

**Status:** `APPROVE`
**Date:** 2026-09-13
**Decision authority:** CTO
**Nature:** strategic and normative documentation decision
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Decision

```text
EPIC-17 = Agent Genome Foundations,
Administration & Automation Platform
```

EPIC-17 extends the implemented ACS. It does not create a second canonical
Agent, Workforce, lifecycle, runtime, persistence, Evidence, Economics or
Product API model.

This decision supersedes the prior `EPIC-17: UNASSIGNED` planning state and the
choice between the former Enterprise Identity and Reliability/Fleet candidate
missions. It does not reopen or rename EPIC-16 — Production Financial
Operations, and it does not rewrite the historical post-15.5 closure.

## First authorized milestone

```text
EPIC-17 Architecture & Boundary Review
GO — DOCUMENTATION ONLY
```

The milestone must compare every proposed Genome, Administration and
Automation capability with current repository evidence and classify it as
`REUSE`, `ADAPT`, `EXTEND`, `NEW` or `REJECT`.

`NEW` identifies a demonstrated gap. It authorizes consideration during later
REQ work only; it does not authorize an entity, aggregate, schema, table, API,
service, migration or implementation.

## Frozen boundaries

- Native Agent identity, revision lineage and lifecycle remain canonical.
- Workforce v1, membership, admission, Assignment, Run, Task and Attempt remain
  canonical.
- Runtime, recovery, Evidence, Usage/Cost, Economics, shared PostgreSQL,
  events, outbox, idempotency, Product API and Control Plane are reused.
- External providers and executors, including OpenClaw, remain replaceable and
  non-canonical.
- Automation remains conceptually separate from execution.
- Delegation always relates canonical ACS Agents; no second `SubAgent` identity
  is authorized.
- Genome traits carry no operational, governance or economic authority.

## Explicit non-goals

No final Genome schema, inheritance, crossover, mutation, fitness algorithm,
autonomous evolution, breeding, tokenization, NFT representation, ownership
economics, royalties, marketplace, on-chain storage or secondary-market
mechanism is authorized.

## Closure and next authority

The review may close as:

```text
ARCHITECTURE & BOUNDARY REVIEW COMPLETE
/ READY FOR REQ DECOMPOSITION
```

Closure authorizes preparation of an evidence-derived
`EPIC-17-REQ-01 ... EPIC-17-REQ-N` decomposition. It does not authorize any
REQ, IMP, migration or production change by itself. No CEO decision is required
for this documentation-only milestone.

## Downstream acceptance and planning authority

The CTO accepted the completed review and its 76 evidence-backed dispositions
as the normative EPIC-17 planning baseline. The original Genome attachment no
longer carries presumed architecture authority.

```text
Architecture & Boundary Review: COMPLETE / ACCEPTED
REQ decomposition readiness: READY
Implementation authority: NONE

REQ Decomposition & Dependency Planning:
COMPLETE / ACCEPTED
```

The decomposition starts with the dependency graph and assigns REQ identifiers
only after grouping by ownership and boundary. Structural Agent/Profile and
configuration-snapshot seams precede Resources/Connector, Memory, Delegation
and Automation. Administration and Control Plane remain projections of accepted
contracts. No CEO escalation is required while the rejected Genome economic and
genetic scope remains excluded.

REQ execution follows the accepted dependency order. Each REQ receives one
documentation commit after its validation and waits for CTO acceptance before
dependent REQs become ready.

## Accepted REQ-01 gate

The CTO accepted `EPIC-17-REQ-01` at commit
`9696bfb37ddbaef0f59e188a1520f2016d080548`. Its nine decisions freeze the
Native Agent semantic and persistence authority for EPIC-17. Its six contract
deltas and three ADRs remain candidates, and blockers `E17-R01-B01` through
`B03` remain open for future IMP planning. The acceptance authorized REQ-02
documentation only; implementation and migration authority remain `NONE`.

## Accepted REQ-02 gate

The CTO accepted `EPIC-17-REQ-02` at commit
`0c8234a5f52d56a09da8c7b7f1e0f0b03cb8ba41`. Profile is a derived Agent
presentation projection without independent identity, aggregate or revision
stream; Persona remains revision-bearing Agent behavior; and the implemented
`GovernedProfileResource` remains a legacy operational composition preset for
REQ-04 disposition. Its eight deltas and three ADRs remain candidates, and
blockers `E17-R02-B01` through `B04` remain open. The acceptance authorized
REQ-03 documentation only; implementation authority remains `NONE`.

## Accepted REQ-03 gate

The CTO accepted `EPIC-17-REQ-03` at commit
`c6d888641c882088a30add5a0de888ba08425632`. Admission owns deterministic
class-specific resolution; each admitted binding generation uses an immutable
snapshot; retries reuse it and configuration changes require re-admission. The
eight deltas and four ADRs remain candidates and five blockers remain open.
`E17-R01-B02` has defined architectural treatment but pending implementation
remediation. Acceptance authorized REQ-04 documentation only.

## Accepted REQ-04 gate

The CTO accepted `EPIC-17-REQ-04` at commit
`a86dce7312e8f8b3e125e254707fcc88656e26d0`. Agents reference governed
resources without owning their registries; resource kinds retain separate
semantics; capability, support Evidence and authority remain distinct. Only
Role has proven durable fingerprinted lineage, so future snapshots use an exact
revision when available or an immutable verifiable observation defined by the
resource owner. The six blockers, eight contract deltas and five ADRs remain
planning inputs. Acceptance authorized parallel REQ-05 and REQ-06
documentation only; implementation authority remains `NONE`.

## Accepted REQ-05 / REQ-06 gate

The CTO jointly accepted `EPIC-17-REQ-05` at commit
`fdd0c6446491e0d367652ffd3dd081afccf0a448` and `EPIC-17-REQ-06` at commit
`5f8fcf0f55c139f0bcb0c9d375f027329f481273`. Connector definition,
Connection, Credential and Channel remain distinct; references and availability
grant no authority. Governance owns Memory policy while the Memory companion
domain owns record/store semantics; Memory remains separate from runtime state,
checkpoints, Knowledge and Evidence. Their eleven combined blockers remain
open for future IMP planning. Acceptance authorized REQ-07 documentation only;
implementation and migration authority remain `NONE`.
