# ACS Agent Guide

This repository is the ACS control-plane workspace. Agents working here must treat the Product API and the EPIC documentation as the source of truth, and must preserve the distinction between control plane, runtime state, and external execution targets.

## Execution rules

- Read the relevant EPIC docs before changing code or documentation.
- Prefer incremental, flow-based work over module-by-module rewrites.
- Keep backend domain truth in the control plane; do not reimplement EPIC-10 domains in the surface layer.
- Validate each change with the smallest useful test or check before moving on.
- Do not assume Production Readiness unless the docs and evidence explicitly support it.

## EPIC-11 guidance

EPIC-11 is the first operational surface of the ACS Control Plane. Agents implementing EPIC-11 work must follow these priorities:

1. Operational Awareness
2. Agent Lifecycle
3. Composition Surface
4. Operational Execution
5. Operational Evidence and Economics
6. Control Plane Hardening

When working EPIC-11 requests:

- Keep the flow boundary intact: `Fluxo > Módulo > Tela`.
- Treat `S01–S39` as conceptual request groups, not immutable architecture.
- Preserve explicit loading, empty, error, pending, and recovery states.
- Keep Economics open as either its own flow or part of operational evidence until refinement decides otherwise.
- Avoid expanding scope into multi-tenancy, production administration, fleet scaling, or advanced observability unless the request explicitly says so.

## Future EPIC guidance

For future EPICs, reuse the same planning standard:

- define mission first;
- describe the operational flow boundary;
- list consolidated domains that must not be reimplemented;
- document dependencies and boundary review;
- identify what belongs to the current EPIC, what belongs to the next one, and what is continuous hardening.

If a task conflicts with existing documentation, pause and resolve the conflict in docs before implementation.
