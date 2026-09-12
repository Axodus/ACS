# ACS-BLOCKER-018

## STATUS

OPEN / ACCEPTANCE BLOCKER

## TITLE

Shared-Host Integration & Full Regression Acceptance

## AFFECTED MILESTONE

ACS-V2-IMP-03E — Workforce Product API & Operational Projections

## CURRENT DECISION

IMP-03E is **PARTIAL / IMPLEMENTATION ACCEPTED**. The implementation may not be promoted to COMPLETE until both acceptance gates below pass.

## GATE 1 — CANONICAL HTTP HOST INTEGRATION

Prove the real production-shaped path:

```text
HTTP request
  → canonical HTTP host
  → ControlPlaneContext
  → shared PostgreSQL nativeCore
  → Product API adapter
  → PostgreSQL-backed response
```

The existing route test injects `nativeCore` directly into `createControlPlaneContext`. That proves the route boundary, but does not yet prove that the canonical shared HTTP host supplies `state.nativeCore` to that context.

Required evidence must show the response comes from canonical PostgreSQL state and preserves historical Workforce, Run membership, assignment, and runtime revision bindings.

## GATE 2 — FULL REGRESSION ACCEPTANCE

Reconfirm the current repository state and close these failures:

`s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`

Required result:

```text
0 failed
0 skipped
```

The prior recorded run was `122 total, 114 passed, 8 failed, 0 skipped`.

## SCOPE CLASSIFICATION

Shared-host native-core composition is part of IMP-03E acceptance and is not deferred to IMP-03F+. IMP-03F remains unauthorized.

## DECISION AUTHORITY

CTO decision remains active: keep IMP-03E PARTIAL until both gates pass.

No CEO decision is required.

## PROMOTION CONDITION

```text
ACS-V2-IMP-03E
PARTIAL / IMPLEMENTATION ACCEPTED
        ↓
ACS-BLOCKER-018
Shared-Host Integration & Full Regression Acceptance
        ↓
IMP-03E COMPLETE / ACCEPTED
```
