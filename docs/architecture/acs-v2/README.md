# ACS v2 Architecture Discovery

**Status:** `PLANNING / DISCOVERY`
**Date:** 2026-09-09
**Owner:** ACS
**Affected consumers:** Core, Governance, BBA-Agency, Axodus product nuclei
**Implementation authorization:** none

## Purpose

This package governs the discovery and planning cycle for evolving ACS into
the **Agent Coordination System** of the Axodus ecosystem.

ACS v2 is not a rewrite authorization. It is a controlled architecture review
that must reconcile the proposal with the implemented ACS codebase, preserve
working capabilities, and produce evidence before any provider adoption or
runtime migration.

## Document status and evidence language

Every statement in this package must use one of the following interpretation
states:

| State | Meaning |
| --- | --- |
| `VERIFIED LOCAL FACT` | Supported by a cited repository path, current code, or current local validation record. |
| `HISTORICAL RECORD` | Preserved earlier documentation; it may require reconciliation with current code. |
| `PROPOSED DESIGN` | A target architecture or contract that has not been implemented as a whole. |
| `HYPOTHESIS TO VALIDATE` | A capability or integration assumption that discovery must test. |
| `PENDING DECISION` | A choice reserved for the documented review and decision gate. |

Use language such as “the current repository contains,” “ACS v2 proposes,” and
“discovery must determine whether.” Do not phrase a provider candidate,
planning artifact, or documented interface as an adopted integration, an active
runtime capability, or a production claim.

`Organization` is the user-facing label for the scoped entity that owns a
workload. Existing `tenant`, `TenantId`, and `tenantId` terms remain current
technical compatibility vocabulary unless a separately versioned migration is
approved.

## Canonical terminology

`ACS` now expands canonically to **Agent Coordination System**.

Historical documents may use **Autonomous Coordination System** or **Access
Control System**. Those expansions are legacy aliases and must not be used for
new architecture work. Existing technical identifiers such as package names,
type names, database fields, API paths, or `tenantId` are not renamed by this
documentation cycle.

On user-facing surfaces, `Organization` is the preferred label for a tenant.
Backend and protocol contracts may retain `tenant`, `TenantId`, and `tenantId`
for compatibility.

## Governing principles

1. ACS owns its canonical agent identities, agent revisions, workforce and
   workflow definitions, execution plans, provider adapters, and institutional
   execution evidence.
2. Governance remains the authority for constitutional and policy decisions.
   ACS evaluates and enforces only authority that is explicitly represented;
   it does not grant itself authority.
3. Core owns shared, typed protocol semantics. It does not implement ACS
   runtime, orchestration, agents, providers, or policy outcomes.
4. Documentation and each product nucleus remain authoritative for governed
   institutional and domain knowledge. ACS references that knowledge with
   provenance; it does not silently become its source of truth.
5. External systems are replaceable capability providers. Agenta, Eigent,
   Codex, OpenClaw, CAMEL, model providers, MCP servers, and tools must not own
   Axodus institutional identity, canonical workflows, governance, or history.
6. Agent identity, workforce composition, orchestration, execution, knowledge,
   governance, and evidence are separate concerns.
7. Migration is incremental. Existing EPIC-10 through EPIC-16 foundations must
   be reused or explicitly superseded through review; no big-bang rewrite is
   implied.

## Package map

| Document | Purpose |
| --- | --- |
| [Current-state audit](current-state-audit.md) | Evidence-backed baseline of the implemented ACS and known drift. |
| [Target architecture](target-architecture.md) | Proposed ACS v2 planes, ownership boundaries, interfaces, and trust zones. |
| [Canonical contracts](canonical-contracts.md) | Proposed agent, workforce, workflow, evidence, and provider contracts. |
| [Provider evaluation](provider-evaluation.md) | Initial evidence and unresolved questions for Agenta, Eigent, CAMEL, Codex, and OpenClaw. |
| [Decision matrix](decision-matrix.md) | Weighted comparison framework for candidate management and orchestration approaches. |
| [Migration plan](migration-plan.md) | Incremental discovery, PoC, adapter, and migration gates. |
| [Implementation backlog](implementation-backlog.md) | Ordered EPICs and tasks that remain unimplemented until separately authorized. |
| [REQ-02 extraction audit](req-02/README.md) | Completed planning audit: source extraction, capability comparison, unified-core blueprint, licensing, ADR proposals, and implementation backlog. |
| [REQ-03 native contract freeze](req-03/README.md) | ACS-owned contract semantics, state/event model, migration matrix, dependency-ordered backlog, adapter boundaries, ADRs, and implementation gate. |
| [REQ-04 durable persistence and event ownership freeze](req-04/README.md) | Evidence-driven durable Agent lineage, canonical event/outbox, idempotency, replay, recovery, fencing, migration, and IMP-01B acceptance gates. |
| [REQ-05 Agent experience and application navigation audit](req-05/README.md) | Evidence-backed current UX audit, Agenta workflow reference, target Agent information architecture, lifecycle, screen inventory, API gaps, implementation plan, and decision record. |
| [IMP-02A Application Shell & Navigation](imp-02a/README.md) | `COMPLETE` — frontend-only implementation of the REQ-05 global shell, canonical navigation, Agent-local context, route compatibility, and explicit scoped-data limitations. |
| [IMP-02B Agent Creation & Configuration](imp-02b/README.md) | `PARTIAL` — frontend-only progressive create/configuration hierarchy using existing Agent commands, catalog-backed credential references, and explicit contract gaps for unsupported metadata and prompt concepts. |
| [VAL-01 PostgreSQL durable foundations acceptance](val-01/README.md) | PostgreSQL execution evidence for IMP-01B; PASS after IMP-01C preserved canonical native idempotency and fencing errors at the public boundary. |
| [IMP-01C typed durable error surface completion](imp-01c/README.md) | Selective public error propagation repair for canonical native idempotency conflicts and stale-fencing rejections, with PostgreSQL revalidation. |
| [ACS-BLOCKER-014 remediation](blockers/acs-blocker-014/README.md) | Root-cause remediation and validation evidence for the five isolated repository regressions. |

## Existing foundations to preserve

The following implemented or documented foundations are inputs to ACS v2, not
discardable legacy by default:

- the unified agent lifecycle and `AgentRevision` fingerprinting;
- `ExecutionPlan`, deployment, runtime, and execution-run separation;
- `AgentEngine`, `AgentRunner`, provider, target, and credential boundaries;
- OpenClaw behind an ACS-owned engine adapter;
- append-oriented audit/evidence and correlation identifiers;
- tenant-scoped control-plane state and governance checks;
- named/versioned workflows and idempotent execution semantics;
- existing local, development, production, and multi-host topology evidence;
- fail-closed execution, secret redaction, and explicit human/governance gates.

## Required decision gate

Discovery may close only with an evidence-backed recommendation for:

- the canonical ACS v2 architecture;
- the agent-management approach;
- the workforce-orchestration approach;
- the role of Codex and OpenClaw;
- the disposition of Agenta and Eigent as `ADOPT`, `POC`, `DEFER`, or `REJECT`;
- migration risks and compatibility impact;
- implementation readiness: `GO`, `CONDITIONAL_GO`, or `NO_GO`.

No recommendation may be interpreted as production activation without a
separate implementation and governance authorization.

## Reading order

1. [Current-state audit](current-state-audit.md)
2. [Target architecture](target-architecture.md)
3. [Canonical contracts](canonical-contracts.md)
4. [Provider evaluation](provider-evaluation.md)
5. [Decision matrix](decision-matrix.md)
6. [Migration plan](migration-plan.md)
7. [Implementation backlog](implementation-backlog.md)
8. [REQ-03 native contract freeze](req-03/README.md)
9. [REQ-04 durable persistence and event ownership freeze](req-04/README.md)
10. [REQ-05 Agent experience and application navigation audit](req-05/README.md)
11. [VAL-01 PostgreSQL durable foundations acceptance](val-01/README.md)
12. [IMP-01C typed durable error surface completion](imp-01c/README.md)

## Non-goals

- rewriting ACS;
- migrating production workflows;
- installing or integrating Agenta, Eigent, CAMEL, or another provider;
- replacing OpenClaw immediately;
- granting agents new authority;
- moving canonical governance or institutional knowledge into a third party;
- enabling production credentials, autonomous execution, trading, treasury,
  settlement, payouts, wallet signing, or on-chain writes;
- changing portfolio maturity.

## Boundary statement

This package records an architecture direction and discovery backlog. It does
not prove provider suitability, workforce scale, production readiness,
security certification, or operational adoption.
