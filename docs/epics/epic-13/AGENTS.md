# EPIC-13 Agent Guide

This directory is the planning boundary for EPIC-13. Agents working here must
produce planning artifacts, not implementation.

## Required behavior

- Treat this directory as planning-only.
- Do not implement billing logic, invoices, payment rails, or tenant billing.
- Do not re-open EPIC-12.
- Do not reimplement EPIC-10, EPIC-11, or EPIC-12 domains.
- Keep Product API as source of truth.
- Keep financial truth conservative.
- Make compliance, tax, and payment-rail decisions explicit.
- Any billing claim requires evidence.

## Read first

1. `../epic-12/epic-12-closure-report.md`
2. `../epic-12/EPIC-12_Executive_Plan.md`
3. `../epic-12/boundary-review.md`
4. `../epic-12/contracts.md`
5. `./README.md`
6. `./EPIC-13_Strategic_Operational_Plan.md`
7. `./architecture.md`
8. `./contracts.md`
9. `./boundary-review.md`
10. `./stories.md`
11. `./milestones/README.md`

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
