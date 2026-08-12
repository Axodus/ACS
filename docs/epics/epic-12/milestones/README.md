# EPIC-12 Milestones Index

This directory contains the planning-oriented breakdown of EPIC-12 by
readiness and hardening flow.

The governing executive definition is the [EPIC-12 Executive Plan](../EPIC-12_Executive_Plan.md).
It resolves the S01 decisions, sets the default dependency order, and defines
the first executable milestone and request package.

These files are **planning docs**, not final sprint specifications. They give
the Planner candidate milestones, dependencies, risks, validation expectations,
and open decisions for the next executive planning pass.

## Read order

1. [M01 - Production Readiness Foundation](./M01-production-readiness-foundation.md)
2. [M02 - Governance and Administration Boundary](./M02-governance-and-administration-boundary.md)
3. [M03 - UX and Browser Acceptance Hardening](./M03-ux-and-browser-acceptance-hardening.md)
4. [M04 - Operational Reliability and Visibility](./M04-operational-reliability-and-visibility.md)
5. [M05 - Observability and Evidence Expansion](./M05-observability-and-evidence-expansion.md)
6. [M06 - Economics Boundary Closure](./M06-economics-boundary-closure.md)
7. [M07 - Final Hardening and Acceptance](./M07-final-hardening-and-acceptance.md)

## Status

| Milestone | Status | Planning role |
| --- | --- | --- |
| M01 - Production Readiness Foundation | PLANNING | Define minimum production blockers and readiness gates. |
| M02 - Governance and Administration Boundary | PLANNING | Decide operator/admin/tenant limits before mutation scope. |
| M03 - UX and Browser Acceptance Hardening | PLANNING | Define browser, visual, accessibility, and responsive acceptance scope. |
| M04 - Operational Reliability and Visibility | PLANNING | Harden long-running operations and operational visibility. |
| M05 - Observability and Evidence Expansion | PLANNING | Expand logs, diagnostics, traces, alerts, and evidence correlation. |
| M06 - Economics Boundary Closure | PLANNING | Decide Economics as dedicated flow or operational evidence sublayer. |
| M07 - Final Hardening and Acceptance | PLANNING | Consolidate gates, caveats, validation, and final acceptance evidence. |

## Dependency Shape

```text
M01 Production Readiness Foundation
  -> M02 Governance and Administration Boundary
  -> M03 UX and Browser Acceptance Hardening
  -> M04 Operational Reliability and Visibility
  -> M05 Observability and Evidence Expansion
  -> M06 Economics Boundary Closure
  -> M07 Final Hardening and Acceptance
```

The Planner may reorder milestones if the dependency graph justifies it, but it
must preserve the `Readiness > Control > Visibility > Hardening` principle and
record the rationale.

## Purpose

Each milestone doc should be used as a planning aid for the next coder agents.
The documents must be read together with:

- [EPIC-12 Planning Entrypoint](../README.md)
- [EPIC-12 Strategic & Operational Plan](../EPIC-12_Strategic_Operational_Plan.md)
- [Architecture](../architecture.md)
- [Contracts](../contracts.md)
- [Boundary Review](../boundary-review.md)
- [Stories](../stories.md)
- [Candidate Inventory](../candidate-inventory.md)
- [Planner Handoff](../planner-handoff.md)

## Relationship To Candidate Inventory

[candidate-inventory.md](../candidate-inventory.md) is the cross-milestone
source for candidate scope. Milestone files should not be treated as a frozen
implementation backlog until the Planner reconciles inventory priority,
dependencies, technical evidence needs, and deferred scope.

## Relationship To Planner Handoff

[planner-handoff.md](../planner-handoff.md) defines the decisions and outputs
the next Planner must produce. The milestone files provide candidate structure;
the handoff defines what must be finalized before implementation.

## Rule

The milestone docs follow the readiness and hardening agenda of the ACS Control
Plane. They do not reopen EPIC-11, and they do not imply production readiness
without evidence.
