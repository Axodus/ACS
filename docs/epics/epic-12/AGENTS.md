# EPIC-12 Agent Guide

This directory is the planning boundary for EPIC-12. Agents working here must
produce a planning package, not implementation. The output should make the next
execution sprint unambiguous for coder agents.

## Read first

- `../epic-11/epic-11-closure-report.md`
- `../epic-11/README.md`
- `../epic-11/AGENTS.md`
- `../epic-11/boundary-review.md`
- `../epic-11/milestones/README.md`
- `../epic-10/EPIC-10.md`

## Planning mission

EPIC-12 should be planned as the next controlled expansion of the ACS Control
Plane after EPIC-11. The planner must determine what belongs in the next epic
without reopening EPIC-11 scope or reimplementing EPIC-10 domains.

## Required planning outputs

The planning package should answer, explicitly and in writing:

1. What is EPIC-12 trying to achieve?
2. What user or operational problem justifies the epic?
3. What is in scope now, and what is deferred again?
4. What remains out of scope by design?
5. Which EPIC-11 surfaces are reused as-is?
6. Which EPIC-11 caveats become EPIC-12 work?
7. What are the milestone gates and their execution order?
8. What evidence is required before any implementation starts?

## Boundary rules

- Keep EPIC-11 closed. Do not revise its scope except to reference its outcomes.
- Do not reimplement EPIC-10 domains in the new epic.
- Do not expand into production billing, production administration, or tenant
  governance unless the new epic explicitly chooses that as its core mission.
- Treat `./static` as out of scope unless the planning outcome explicitly says
  otherwise.
- Preserve the distinction between control plane, runtime state, and external
  execution targets.
- Keep economics decisions explicit: either a dedicated flow or part of
  operational evidence, but not both by accident.

## Decision order

The planner should resolve scope in this order:

1. mission
2. boundary
3. user-facing flows
4. capability inventory
5. milestones
6. validation and acceptance
7. deferred scope

## Expected tone of the plan

- honest about readiness gaps
- explicit about what is deferred
- conservative about production claims
- traceable to concrete docs and committed evidence
- usable by a coder agent without reinterpretation

