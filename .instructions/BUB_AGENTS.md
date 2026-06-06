# BUB_AGENTS.md

Operational guidance for using bub-agents inside the ACS workspace.

## Purpose

Bub-agents are advisory execution-support agents for planning, architecture review, security review, QA, documentation, and implementation analysis. They do not override the latest user instruction, this workspace `.instructions`, repository reality, security constraints, or Axodus architecture principles.

The Coding Execution Agent remains responsible for final decisions, edits, validation, commit, and report.

## Workspace Context

Workspace: `ACS`

Repository root: `/mnt/d/Rede/Github/Axodus/ACS`

Primary responsibility: access-control semantics, policy resolution, authorization references, restriction metadata, capability/condition consumption, and enforcement boundaries outside Core.

## When To Use Bub-Agents

Use bub-agents for multi-file changes, architecture decisions, security-sensitive access flows, ACS policy semantics, API/service behavior, Web3/wallet boundaries, data model changes, test planning, documentation updates, or sprint-level execution.

Do not use bub-agents for typo fixes, simple text changes, trivial imports, isolated formatting, or obvious one-line fixes.

## Roles

- Planner: task decomposition, affected files, execution order, risks, acceptance criteria.
- Architect: module boundaries, ACS/Core/Governance separation, data flow, coupling risks.
- Backend: services, routes, validation, persistence, adapters, errors.
- Frontend: routes, layouts, guarded UI, access states, loading/error/empty states.
- Web3: wallet/contract/adapter boundaries, read-only vs execution separation.
- Security: authorization, secrets, permissions, unsafe execution paths, input validation.
- QA: regression scope, tests, edge cases, manual validation checklist.
- Documentation: `.instructions`, README, decisions, workflow, readiness notes.

## Delegation Template

```md
# Bub-Agent Task
Role:
Workspace: ACS
Repository: /mnt/d/Rede/Github/Axodus/ACS
Task:
Relevant context:
Expected output:
- findings
- risks
- affected files
- recommended steps
- acceptance criteria
Constraints:
- Follow workspace `.instructions`.
- Preserve ACS/Core/Governance boundaries.
- Mark uncertainty clearly.
```

## Workspace-Specific Rules

- ACS owns access policy resolution and enforcement runtime; Core only provides metadata and references.
- Do not make Core grant authority, enforce access, issue credentials, or decide authorization.
- Distinguish access request, policy context, authorization decision, denial metadata, and enforcement action.
- Capability and condition metadata must remain explicit and auditable.
- Restricted tenant behavior must preserve Governance standing and constitutional restriction metadata.
- Never introduce auth provider behavior, permission engine behavior, production storage, or execution paths without explicit instruction.
- Execution decisions must route through ACS policy when applicable.

## Conflict Resolution

Resolve conflicts in this order: latest user instruction, workspace `.instructions`, repository architecture, security requirements, smallest safe change, maintainability, bub-agent recommendation.

If unresolved, stop and report the blocker.

## Final Report

State whether bub-agents were used, roles used, key findings, accepted recommendations, rejected recommendations, tests run, and remaining risks.

## Commit Behavior

When a sprint is completed, run practical validation, check `git status`, commit the completed sprint, and report the commit hash.

Recommended commit format: `acs: <short description>`

