# EPIC-15 Agent Guide

Agents working in EPIC-15 must treat this directory as the canonical tenant governance package for the ACS Control Plane.

## Boundaries

- Keep tenant administration separate from tenant isolation primitives.
- Keep membership, authority, governance and audit distinct.
- Preserve explicit tenant scope in every proposed command, query or event.
- Reuse existing tenant-aware control-plane projections before proposing new domain objects.
- Keep runtime, deployment, worker and billing enforcement out of tenant administration work unless a milestone explicitly calls for the boundary.

## Invariants

- No cross-tenant mutation without explicit tenant scope.
- No implied tenant ownership from UI state or route state.
- No administrative authority without an explicit role and scope.
- No claim of tenant-admin readiness, production readiness or billing readiness.
- No bypass of existing isolation or governance boundaries.

## Protected areas

- src/control-plane/isolation.ts
- src/tenant-context.ts
- src/control-plane/governance-boundary.ts
- src/control-plane/product-api-client.ts
- EPIC-10 to EPIC-14 normative docs
- ./static

## Change rules

- Preserve the implemented tenant domain and membership foundations.
- Do not reopen A01 or B01 decisions without a concrete incompatibility.
- Do not add schema migrations or new production endpoints unless a milestone explicitly requires them.
- If a proposed document conflicts with current code or prior EPIC contracts, resolve the conflict in the docs before proposing code.
- Prefer bounded decisions over generic IAM or policy abstractions.

## Test expectations

- Run git diff --check.
- Run any lightweight documentation or repository checks that already exist and are relevant.
- Do not run broad product suites unless discovery shows a doc change depends on validation evidence.

## Scope expansion policy

- Expand scope only when discovery shows a real gap in the current tenant-aware boundary.
- Any open decision must remain labeled as OPEN DECISION.
- Defer billing, RBAC engines, runtime enforcement and audit storage unless the document is explicitly about those deferred boundaries.

## Compatibility and regression

- Preserve the current tenant-aware, non-tenant-admin posture.
- Do not weaken existing isolation or audit correlation language.
- Do not convert visibility into authority.
- Do not normalize unsupported states into supported ones.
- Do not conflate Agent roles with tenant administrative authority.
