# EPIC-12 Planning Entrypoint

## Mission

EPIC-12 prepares the ACS Control Plane for executive planning of **Control Plane
Production Readiness and Operational Hardening**. It converts the initial
normative package into a planner-consumable baseline before functional
implementation starts.

EPIC-12 does not claim production readiness yet.

```text
Production Ready: NO / not yet claimed
```

## Organizing Principle

```text
Readiness > Control > Visibility > Hardening
```

The epic must be decomposed through the established ACS planning boundary:

```text
Fluxo > Módulo > Tela
```

Planner output should start from readiness blockers, control authority,
operator visibility, and hardening gates rather than from isolated UI modules.

## Relationship To EPIC-10

EPIC-10 remains the domain consolidation baseline. EPIC-12 may reference
Product API truth, Control Plane domains, runtime/workers, execution targets,
and economic contracts, but it must not reimplement those domains in planning
or in the surface layer.

## Relationship To EPIC-11

EPIC-11 remains closed. EPIC-12 consumes the EPIC-11 operational surface,
closure report, and formal caveats as inputs for the next readiness phase. If a
candidate item is actually an EPIC-11 caveat, the Planner must label it as such
instead of reopening EPIC-11.

## Read Order

1. [AGENTS.md](./AGENTS.md)
2. [README.md](./README.md)
3. [EPIC-12 Strategic Operational Plan](./EPIC-12_Strategic_Operational_Plan.md)
4. [Architecture](./architecture.md)
5. [Contracts](./contracts.md)
6. [Boundary Review](./boundary-review.md)
7. [Stories](./stories.md)
8. [Candidate Inventory](./candidate-inventory.md)
9. [Planner Handoff](./planner-handoff.md)
10. [Milestones Index](./milestones/README.md)
11. [Milestone Files](./milestones/)

## What Is Already Decided

- EPIC-12 is a documentation/planning baseline until the Planner produces the
  final executive plan and first executable milestone.
- The mission remains Control Plane Production Readiness and Operational
  Hardening unless the Planner explicitly narrows it.
- `Readiness > Control > Visibility > Hardening` is the organizing principle.
- `Fluxo > Módulo > Tela` remains the planning boundary.
- EPIC-10 domain truth must not be reimplemented.
- EPIC-11 must not be reopened.
- Production readiness, billing readiness, administration readiness, and tenant
  governance readiness are not claimed.

## Open Decisions

- Economics: dedicated flow or operational evidence sublayer.
- Administration/Tenants: operator-only, tenant-aware, or limited tenant-admin
  boundary.
- Browser Acceptance: smoke, visual, accessibility, and/or cross-viewport scope.
- Auth/RBAC: minimum actor, role, permission, and denied-state baseline.
- Secrets: production boundary for storage, injection, redaction, and
  disclosure.
- Persistence: what must be durable before any readiness claim.
- Observability: required depth for logs, diagnostics, traces, alerts, health,
  and evidence correlation.

## Guardrails

- Restrict EPIC-12 S00 work to `docs/epics/epic-12/**`.
- Treat `./static` as out of scope.
- Do not modify EPIC-10 or EPIC-11 documents.
- Do not add Product API, frontend, runtime, worker, auth, RBAC, secrets,
  observability, economics, or administration implementation.
- Preserve explicit loading, empty, error, pending, recovery, blocked, and
  unsupported states in the planning language.
- Keep secret leakage, unsupported success simulation, and production claim
  inflation out of scope and out of language.

## What EPIC-12 Must Not Do

- Reopen EPIC-11 as a generic feature backlog.
- Reimplement EPIC-10 domains in the UI, planning package, runtime, or workers.
- Convert Economics into billing without an explicit Planner decision.
- Convert Administration into a tenant console without an explicit Planner
  decision.
- Treat Browser Acceptance as passed without browser evidence.
- Declare `Production Ready`, `Billing Ready`, `Administration Ready`, or
  `Tenant Governance Ready` before gates are defined and proven.

## Applying AEES

EPIC-12 should use AEES as a milestone-first planning discipline:

- plan complete milestones before executable sprint slicing;
- execute later work in cohesive blocks tied to readiness gates;
- declare milestone `PASS` only at milestone closure, not per isolated request;
- record formal caveats when validation is partial;
- keep commits scoped to coherent blocks or explicitly marked sub-deliveries;
- preserve evidence labels separately from approval, readiness, and activation.

## Planning Exit Criteria

S00 is complete when a new Planner can answer:

- what mission EPIC-12 serves;
- what is already decided;
- what must still be decided;
- which documents must be read and in what order;
- which candidates likely belong to each milestone;
- which boundaries cannot be violated;
- what the next expected artifact is.

## Next Expected Step

The next step after S00 is the **EPIC-12 Executive Plan**. The Planner should use
[planner-handoff.md](./planner-handoff.md) and
[candidate-inventory.md](./candidate-inventory.md) to produce final mission,
macro-phases, milestone order, dependency graph, validation strategy, deferred
scope register, first executable milestone, and first sprint/request package.
