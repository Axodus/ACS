# ACS-V2-REQ-06 — Workforce Core Contract Completion

**Status:** COMPLETE — FROZEN-v1 ARCHITECTURE PACKAGE  
**Date:** 2026-09-11  
**Owner:** Axodus CTO  
**Implementation authorization:** none

## Decision

ACS Workforce v1 is frozen as an ACS-owned, revisioned composition aggregate.
It owns Workforce identity, immutable composition, member slots, role bindings,
and the historic composition selected by a Run. It does not own a scheduler,
task graph, runtime queue, executor process, provider session, or retry loop.

Agent, Workforce, Workflow/Coordination, Run/Task, Runtime, and Executor are
separate contracts. A future coordination adapter may propose work planning or
assignment decisions, but ACS validates and commits all canonical changes.

## Scope and non-goals

This is a documentation-only contract freeze. It does not implement Workforce,
Workflow, an adapter, CAMEL, Eigent, migrations, API endpoints, a UI, provider
integration, or production activation. It preserves the accepted Agent lineage,
native runtime, event/outbox, evidence, and accounting foundations.

The mandatory Eigent audit used a dedicated read-only sub-agent for source
mapping and evidence collection, then the main Agent Coder independently
validated the cited local paths before freezing ACS decisions. Neither audit
path modified ACS or Eigent, installed dependencies, or integrated Eigent.

## Reading order

1. [ACS current-state audit](acs-current-state-audit.md)
2. [Eigent extraction audit](eigent-workforce-extraction-audit.md)
3. [Traceability matrix](eigent-acs-traceability-matrix.md)
4. [Workforce boundary](workforce-boundary.md)
5. [Workforce v1 contract](workforce-v1-contract.md)
6. [Membership and Agent revision semantics](agent-workforce-membership.md)
7. [Revision semantics](workforce-revision-semantics.md)
8. [Run and Task ownership](workforce-run-task-ownership.md)
9. [Coordination boundary](coordination-boundary.md)
10. [Adapter sovereignty](coordination-adapter-boundary.md)
11. [Events, evidence, and cost](events-evidence-cost.md)
12. [Persistence and concurrency](persistence-concurrency.md)
13. [Product API requirements](product-api-requirements.md)
14. [Conformance plan](conformance-plan.md)
15. [Decision record](decision-record.md)
16. [Implementation plan](implementation-plan.md)

## Contract status

FROZEN-v1 applies to the Workforce aggregate boundary, identity, immutable
revision model, member-slot semantics, Run admission snapshot, authority split,
and adapter sovereignty. It does not claim that the corresponding durable
implementation already exists. Workforce-specific persistence, repositories,
Product API, Workflow graph realization, and coordination execution remain
future authorized work.

**Precedence:** this package resolves the former `PARTIAL` WorkforceDefinition,
WorkforceRevision, and WorkforceRunMembership semantic proposal in
REQ-03. It supersedes only those Workforce semantics, including the former
placement of coordinator/workflow policy in a Workforce revision. It does not
alter any implemented contract or other accepted REQ-03 decision.

## Acceptance invariant

Removing ~/.eigent or CAMEL MUST NOT prevent ACS from storing Workforce
definitions, admitting a Run with a Workforce snapshot, reconstructing
historical membership, recording evidence, or attributing usage and cost.
