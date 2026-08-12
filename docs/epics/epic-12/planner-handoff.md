# EPIC-12 Planner Handoff

This handoff is for the Planner that produces and maintains the
[EPIC-12 Executive Plan](./EPIC-12_Executive_Plan.md). It converts the S00
baseline into decisions, outputs, and acceptance constraints.

S01 completion artifact: [EPIC-12_Executive_Plan.md](./EPIC-12_Executive_Plan.md).
The executive plan is now the governing source for milestone order and the
first executable request package; this handoff remains the decision checklist
for future refinements.

## Strategic Decision

The Planner must decide the final EPIC-12 formulation. The default formulation
is:

```text
ACS Control Plane Production Readiness & Operational Hardening
```

The Planner may narrow this formulation only if the scope cut is explicit,
evidence-backed, and reflected in the milestone order, dependency graph,
deferred scope register, and validation strategy.

## Mandatory Open Decisions

1. Economics: dedicated flow or operational evidence sublayer?
2. Administration: operator-only, tenant-aware, or limited tenant-admin?
3. Browser acceptance: smoke, visual, accessibility, cross-viewport, or a staged
   combination?
4. Auth/RBAC: what minimum actor, role, permission, denied-state, and audit
   baseline is required?
5. Secrets: what productive boundary is required for storage, injection,
   redaction, disclosure, logs, and evidence?
6. Observability: what depth is required for logs, diagnostics, traces, alerts,
   health, retention, and evidence correlation?
7. Production readiness: which blockers does EPIC-12 actually close, and which
   remain deferred?

## Required Planner Outputs

- final mission;
- macro-phases;
- milestone order;
- refined candidate inventory;
- dependency graph;
- final EPIC boundary review;
- deferred scope register;
- validation strategy;
- first executable milestone;
- first complete sprint/request package.

## AEES Application

EPIC-12 must apply AEES as milestone-first execution planning:

- plan by complete milestones, not isolated request fragments;
- execute later implementation by cohesive blocks that preserve the epic
  boundary;
- declare `PASS` only at milestone closure after validation and caveat review;
- register formal caveats when evidence is partial, blocked, or environment
  limited;
- keep commits scoped to cohesive blocks or explicitly marked sub-deliveries;
- do not treat an isolated request as milestone `PASS`;
- keep approval, readiness, activation, and evidence as separate labels.

## First Executable Milestone

The accepted first executable milestone is:

```text
M01 - Production Readiness Foundation
```

The executive plan records the default dependency order. A later Planner may
reorder milestones only if the dependency graph justifies it, the executive
plan is updated, and the rationale preserves `Readiness > Control > Visibility
> Hardening`.

## Inputs To Read Before Planning

1. [AGENTS.md](./AGENTS.md)
2. [README.md](./README.md)
3. [EPIC-12 Strategic Operational Plan](./EPIC-12_Strategic_Operational_Plan.md)
4. [Architecture](./architecture.md)
5. [Contracts](./contracts.md)
6. [Boundary Review](./boundary-review.md)
7. [Stories](./stories.md)
8. [Candidate Inventory](./candidate-inventory.md)
9. [Milestones Index](./milestones/README.md)
10. [Milestone Files](./milestones/)

## Planning Constraints

- Keep EPIC-11 closed.
- Do not reimplement EPIC-10.
- Do not change `src/`, `.design/`, `static/`, `contracts/`, `engines/`, or
  runtime code during planning.
- Do not claim `Production Ready`, `Billing Ready`, `Administration Ready`, or
  `Tenant Governance Ready`.
- Do not decide Economics as billing unless the Planner explicitly creates and
  justifies that future boundary outside EPIC-12.
- Do not decide Administration as a tenant console unless explicitly approved
  and scoped.
- Do not treat Browser Acceptance as complete without browser evidence.

## Handoff Completion Test

The Planner output is complete when a coder can start the first executable
milestone without reinterpreting the normative package, guessing open decisions,
or violating EPIC-10/EPIC-11 boundaries.
