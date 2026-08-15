# EPIC-15.5 Agent Guide

This directory governs work for **EPIC-15.5 — ACS Operational Readiness & Gap Elimination**. Read `README.md`, `operational-gap-inventory.md`, `production-readiness-baseline.md`, the relevant milestone report and the root `AGENTS.md` before changing code.

## Boundaries

- Preserve the Product API as the supported Control Plane boundary.
- Preserve EPIC-10 isolation/runtime contracts and EPIC-15 Tenant, Membership, Authority and Governance invariants.
- Do not infer trusted identity from request bodies, client-selected headers or Agent Roles.
- Do not move domain decisions into HTTP routes, UI components or low-level workers.
- Keep development/test adapters available where useful, but never select them silently for an operational or production profile.
- Treat `static` and `.design/app-standalone` as separate existing surfaces until a milestone explicitly consolidates them.

## Protected areas

Any change to tenant scope resolution, administrative authority, secret redaction, governance default-deny, sandbox deployment guards, audit attribution, economic receipts or worker lease semantics requires explicit regression evidence. Do not weaken a safety gate merely to make readiness appear green.

## Change rules

- Resolve one or more named `ACS-ORG-*` findings; do not introduce broad platform rewrites.
- Record target adapter selection, migration/compatibility, failure semantics and rollback before implementation.
- Scope expansion requires an explicit architectural decision in the milestone documentation.
- No new billing, generic IAM/RBAC/ABAC, policy DSL, SIEM, generic observability platform or production target is implied by this EPIC.
- No hardcoded credentials, synthetic production evidence or permissive fallback is acceptable.

## Validation expectations

Use the smallest meaningful checks during implementation, then run the milestone regression matrix. Adapter work requires restart and failure tests; shared-state work requires multi-instance tests; identity work requires forged-context negative tests; worker work requires real cross-process or network dispatch evidence; UX work requires Product API integration and browser acceptance. A unit test of an interface is not operational proof.

If the official build is blocked by `EROFS`, report it as an environment blocker and compile to `/tmp` without changing project configuration. Preserve unrelated workspace changes and stage only milestone files. Never push without explicit user instruction.

## Documentation expectations

Update finding status and evidence, the production baseline, affected stories and milestone report in the same change. Use `READY`, `PARTIAL`, `BLOCKED`, `NOT PROVEN` and `DEFERRED` truthfully. A finding closes only when its required acceptance evidence exists; code complete without operational proof remains partial.
