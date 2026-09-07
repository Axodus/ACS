# EPIC-11 Agent Guide

This directory contains the normative documentation package for EPIC-11. Agents working here must treat the EPIC-11 charter and its supporting docs as the execution boundary for the epic.

## Local source of truth

Read these files first when working on EPIC-11:

- `EPIC-11_Strategic_Operational_Plan.md`
- `architecture.md`
- `contracts.md`
- `boundary-review.md`
- `stories.md`
- `milestones/README.md`

## EPIC-11 execution rules

- Plan and implement by operational flow, not by UI module.
- Keep the sequence intact: `Operational Awareness -> Agent Lifecycle -> Composition Surface -> Operational Execution -> Operational Evidence & Economics -> Control Plane Hardening`.
- Treat `S01–S39` as traceable request groups, not fixed architectural boundaries.
- Preserve loading, empty, error, pending, warning, blocked, and recovery states in every surface.
- Do not reimplement EPIC-10 domains in the surface docs or implementation guidance.
- Treat `./static` as out of scope for EPIC-11 execution unless a request explicitly calls for it; keep the epic centered on the Control Plane app and backend.
- Keep Economics boundary-open until the planning/refinement phase explicitly resolves it.
- Treat multi-tenancy, advanced administration, fleet scaling, and advanced observability as likely EPIC-12 or later unless a doc explicitly pulls them into scope.

## Documentation responsibilities

- Keep the charter canonical and aligned with the milestone docs.
- Keep boundary review explicit whenever scope is ambiguous.
- Keep dependency order visible in each milestone doc.
- Keep the stories document as the traceable request index for coder agents.

## Handoff rule

If a requested change conflicts with the EPIC-11 charter, resolve the doc conflict first and do not silently reinterpret scope.

## AXODUS_WORKSPACE_COORDINATION

This workspace is part of the federated Axodus portfolio. Read the root
[`AGENTS.md`](../../../../AGENTS.md) and the
[Agent Coordination Protocol](../../../../.instructions/AGENT_COORDINATION_PROTOCOL.md) before starting work.

Keep this file's local rules authoritative for this repository. For every
completed or materially blocked task, provide the required **Global Coordination
Handoff**: workspace, scope, local status, validation, local records changed,
dependencies, blockers or risks, priority impact, requested portfolio action,
and preserved boundaries.

Update this repository's existing local status, roadmap, task, validation,
blocker, or report records when the authorized task requires it. Do not edit
root portfolio records directly; the root Axodus orchestrator consolidates
validated handoffs into global status, priorities, blockers, dependencies, and
reports.
