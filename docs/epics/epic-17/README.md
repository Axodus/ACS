# EPIC-17 — Agent Genome Foundations, Administration & Automation Platform

**Architecture & Boundary Review:** `COMPLETE / ACCEPTED`
**REQ decomposition:** `COMPLETE / ACCEPTED`
**REQ-01:** `COMPLETE / ACCEPTED`
**REQ-02:** `COMPLETE / ACCEPTED`
**REQ-03:** `COMPLETE / ACCEPTED`
**REQ-04:** `COMPLETE / ACCEPTED`
**REQ-05:** `COMPLETE / ACCEPTED`
**REQ-06:** `COMPLETE / ACCEPTED`
**REQ-07:** `COMPLETE / ACCEPTED`
**REQ-08:** `COMPLETE / ACCEPTED`
**REQ-09:** `COMPLETE / ACCEPTED`
**REQ-10:** `COMPLETE / ACCEPTED`
**REQ-11:** `COMPLETE / ACCEPTED`
**REQ-12:** `COMPLETE / ACCEPTED`
**Architecture/specification:** `COMPLETE / ACCEPTED`
**Current gate:** `IMP-08 — COMPLETE / CTO ACCEPTED / CLOSED`
**Current implementation state:** Freeze, S1, S2 and S4 are `COMPLETE / CTO ACCEPTED / PUBLISHED`; S3 is `SKIPPED / NOT REQUIRED`; S5 final conformance is `COMPLETE / CTO ACCEPTED / CLOSED`
**Mission decision:** [BR-03](../BR-03_EPIC-17_Mission_Decision.md) — `APPROVE`
**Scope:** architecture accepted; IMP-01 through IMP-07 complete and accepted; IMP-08 is in progress through accepted S1 and S2 boundaries
**Implementation authority:** no further implementation is authorized by this reconciliation
**Migration authority:** Schema 12 canonical; Schema 13 not required or authorized
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
| [REQ-01 — Canonical Agent Seam](req-01/README.md) | Canonical Agent ownership, Native/legacy seam, compatibility and implementation gates. |
| [REQ-02 — Profile, Persona & Presentation](req-02/README.md) | Profile projection, Persona ownership, naming conflict, provenance and implementation gates. |
| [REQ-03 — Effective Configuration & Snapshot](req-03/README.md) | Class-specific authority, admission resolution, immutable snapshot and reconstruction gates. |
| [REQ-04 — Governed Resources](req-04/README.md) | Resource owners, exact references, models, Skills, Tools, MCP and legacy Profile preset. |
| [REQ-05 — Connectors, Connections & Channels](req-05/README.md) | Connector projection, configured Connections, secret authority, Channels and admission boundaries. |
| [REQ-06 — Memory Policy & Store](req-06/README.md) | Memory ownership, scopes, access, retention, deletion, provenance and reconstruction boundaries. |
| [REQ-07 — Delegation](req-07/README.md) | Governed Agent-to-Agent grants, attenuation, chains, revocation and execution boundaries. |
| [REQ-08 — Automation](req-08/README.md) | Automation identity, authored revisions, lifecycle, target, authority and attribution boundaries. |
| [REQ-09 — Activation & Runtime Admission](req-09/README.md) | Trigger/Schedule observations, idempotent Activation, recovery, admission, runtime and attribution boundaries. |
| [REQ-10 — Product API, Administration & Control Plane](req-10/README.md) | Domain projections, owner-routed actions, class-owned settings and Control Plane information architecture. |
| [REQ-11 — Genome Traits, Assets & Verification](req-11/README.md) | Descriptive traits, presentation assets, Evidence-backed verification and performance-view boundaries. |
| [REQ-12 — Cross-Domain Conformance & IMP Readiness](req-12/README.md) | Canonical ownership audit, 76-disposition closure, blocker consolidation and dependency-ordered candidate IMP plan. |
| [CTO Implementation Gate](implementation-gate/README.md) | Current milestone index: IMP-01 through IMP-08 closed; IMP-09 is released for evaluation only. |
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
9. [REQ-01 — Canonical Agent Seam](req-01/README.md).
10. [REQ-02 — Profile, Persona & Presentation](req-02/README.md).
11. [REQ-03 — Effective Configuration & Snapshot](req-03/README.md).
12. [REQ-04 — Governed Resources](req-04/README.md).
13. [REQ-05 — Connectors, Connections & Channels](req-05/README.md).
14. [REQ-06 — Memory Policy & Store](req-06/README.md).
15. [REQ-07 — Delegation](req-07/README.md).
16. [REQ-08 — Automation](req-08/README.md).
17. [REQ-09 — Activation & Runtime Admission](req-09/README.md).
18. [REQ-10 — Product API, Administration & Control Plane](req-10/README.md).
19. [REQ-11 — Genome Traits, Assets & Verification](req-11/README.md).
20. [REQ-12 — Cross-Domain Conformance & IMP Readiness](req-12/README.md).
21. [CTO Implementation Gate](implementation-gate/README.md).

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
The accepted dependency graph derives twelve REQs; the original eleven-request
list did not determine the count or sequence.

`EPIC-17-REQ-01` through `REQ-12` and the architecture/specification phase are
complete and accepted. The [gate package](implementation-gate/README.md) records IMP-01 through
IMP-07 as complete and closed. IMP-08 is complete and closed: its
architecture/semantic freeze, S1/S2 contracts, S4 administrative projection and
S5 final conformance are accepted; S3 is skipped as not required. IMP-09 is
released for evaluation only and IMP-10 remains dependency-gated. Schema 12
remains canonical; Schema 13, database expansion and production authority
remain outside this gate.
