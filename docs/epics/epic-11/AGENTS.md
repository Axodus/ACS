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
- Keep Economics boundary-open until the planning/refinement phase explicitly resolves it.
- Treat multi-tenancy, advanced administration, fleet scaling, and advanced observability as likely EPIC-12 or later unless a doc explicitly pulls them into scope.

## Documentation responsibilities

- Keep the charter canonical and aligned with the milestone docs.
- Keep boundary review explicit whenever scope is ambiguous.
- Keep dependency order visible in each milestone doc.
- Keep the stories document as the traceable request index for coder agents.

## Handoff rule

If a requested change conflicts with the EPIC-11 charter, resolve the doc conflict first and do not silently reinterpret scope.
