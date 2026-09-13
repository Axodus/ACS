# EPIC-17 — Agent Genome Foundations, Administration & Automation Platform

**Architecture & Boundary Review:** `COMPLETE / ACCEPTED`
**REQ decomposition:** `COMPLETE / PROPOSED FOR NORMATIVE REQ AUTHORING`
**Mission decision:** [BR-03](../BR-03_EPIC-17_Mission_Decision.md) — `APPROVE`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Mission

Define how Agent identity and presentation, Administration capabilities,
delegation, memory, automation and future Genome-compatible classification can
extend the canonical ACS without creating a second Agent, Workforce,
lifecycle, runtime, persistence, Evidence, Economics or Product API model.

This package records the implemented baseline, discovered gaps, prohibited
duplication and the dependency-derived REQ sequence. It is the normative
planning reference for EPIC-17 and supersedes the original Genome attachment as
an assumed architecture. It is not an implementation specification.

## Authority boundary

```text
ACS owns canonical truth.
Providers expose capabilities.
Adapters translate.
Runtimes execute.
Applications present and request.
```

EPIC-17 may reference and later propose additive extensions to accepted
boundaries. Any incompatible requirement against a frozen contract becomes a
blocker and architecture escalation.

## Classification language

| Classification | Normative meaning |
| --- | --- |
| `REUSE` | The current owner and contract are sufficient and remain authoritative. |
| `ADAPT` | Existing semantics can serve the capability through a bounded adapter or projection. |
| `EXTEND` | The current owner remains authoritative but a later REQ may propose an additive contract. |
| `NEW` | The baseline lacks a sufficient owner or contract. This permits later REQ consideration only. |
| `REJECT` | The proposal duplicates, weakens or conflicts with an accepted ACS boundary. |

`NEW` does not authorize an entity, aggregate, schema, API, table, service,
migration or implementation. No classification in this review grants
implementation authority.

## Package map

| Document | Purpose |
| --- | --- |
| [Architecture & Boundary Review](architecture-and-boundary-review.md) | Consolidated findings, ownership boundaries, dependency graph and closure. |
| [Capability Inventory](capability-inventory.md) | Evidence-backed disposition of the original proposal. |
| [Configuration Precedence Matrix](precedence-matrix.md) | Authority and historical-resolution analysis by configuration class. |
| [Decision Register](decision-register.md) | Frozen decisions, contradictions, candidate ADRs and REQ gates. |
| [Dependency Graph](dependency-graph.md) | Hard dependencies, parallel planning windows, blockers and unlock order. |
| [REQ Decomposition](req-decomposition.md) | Dependency-derived `EPIC-17-REQ-01 ... REQ-12` planning charters. |
| [Capability-to-REQ Matrix](capability-to-req-matrix.md) | Complete mapping of all 76 dispositions and rejected scope to the planned REQs. |
| [Agent instructions](AGENTS.md) | Rules for work under this package. |

## Required reading order

1. This README.
2. [Architecture & Boundary Review](architecture-and-boundary-review.md).
3. [Capability Inventory](capability-inventory.md).
4. [Configuration Precedence Matrix](precedence-matrix.md).
5. [Decision Register](decision-register.md).
6. [Dependency Graph](dependency-graph.md).
7. [REQ Decomposition](req-decomposition.md).
8. [Capability-to-REQ Matrix](capability-to-req-matrix.md).

## Dependencies to preserve

- EPIC-10 Agent, composition, provider, credential, runtime and Product API
  foundations;
- ACS v2 Native Agent identity and durable immutable lineage;
- Workforce v1 definitions, revisions, slots, membership and admission;
- Run, Workflow, Task, Assignment, Attempt and runtime compilation;
- shared PostgreSQL, events, outbox, idempotency, leases, fencing and recovery;
- Evidence, provenance, Usage/Cost and EPIC-16 Economics boundaries;
- EPIC-14 Control Plane information architecture;
- EPIC-15 Tenant administration and governance;
- Product API as the supported application boundary.

The documentation review can complete while EPIC-16 remains independently
active. Any future EPIC-17 implementation needs separately accepted REQs and
its own execution gates.

## Frozen invariants

```text
Automation -> Activation -> execution intent
           -> existing admission boundary -> Run / Workflow target

Agent A -> bounded delegation authority -> Agent B
Agent B = canonical ACS Agent
execution = existing Run / Task / Assignment machinery
```

No distinct `SubAgent` identity is permitted.

```text
Trait != capability
Trait != permission
Trait != credential
Trait != reputation
Trait != economic right
Trait != NFT
```

A trait can classify or reference canonical state. It cannot grant authority or
alter operational truth.

Every execution must have deterministic, historically reproducible effective
configuration. A lower layer cannot exceed authority granted by an upper
layer. Precedence is defined by configuration class, not by one universal
override chain.

## Non-goals

- implementation, migration, schema, table, API, service or UI changes;
- final Genome or DNA schema;
- inheritance, crossover, mutation, fitness or autonomous evolution;
- Agent breeding;
- tokenization, NFT minting, ownership economics or royalties;
- Genome marketplace, on-chain storage or secondary-market mechanics;
- new blockchain or protocol work;
- replacement of Agent Core, Workforce, Workflow/Coordination or Runtime Core;
- replacement of Evidence, Usage/Cost, Economics or Product API;
- provider-owned Agent identity or OpenClaw-owned automation/schedules;
- unrelated global UI redesign.

## Planning closure and next milestone

The Architecture & Boundary Review is accepted. Its 76 evidence-backed
dispositions replace the original Genome attachment as the planning baseline.
The dependency graph derives twelve planned REQs; the original eleven-request
list did not determine the count or sequence.

The next milestone is normative authoring and review of `EPIC-17-REQ-01`.
Neither the decomposition nor any planned REQ grants IMP, implementation,
migration, schema, API, database or production authority.
