# ACS-BLOCKER-018

## STATUS

RESOLVED / ACCEPTED

## TITLE

Shared-Host Integration & Full Regression Acceptance

## AFFECTED MILESTONE

ACS-V2-IMP-03E — Workforce Product API & Operational Projections

## CURRENT DECISION

IMP-03E was **PARTIAL / IMPLEMENTATION ACCEPTED** pending the two gates below. Both gates now pass.

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

The Gate A integration test proves the complete path with the real shared PostgreSQL nativeCore: HTTP request → canonical HTTP host → `ControlPlaneContext` → `state.nativeCore` → canonical PostgreSQL repository → Product API response. It covers Workforce list/detail, admitted Run membership, Task coordination/current assignment/history, and Task runtime/Attempt linkage.

The canonical configuration is `ACS_SH_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/acs_imp_03a`; container `acs-imp03a-pg` publishes `127.0.0.1:55433 → 5432/tcp` and accepted connections during validation. Historical Workforce, Run membership, assignment, and runtime revision bindings were preserved.

## GATE 2 — FULL REGRESSION ACCEPTANCE

Reconfirm the current repository state and close these failures:

`s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`

Required result:

```text
0 failed
0 skipped
```

The current full repository run is `724 total, 724 passed, 0 failed, 0 skipped`. The eight previously affected socket suites (`s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`) are green in the socket-capable run.

## SCOPE CLASSIFICATION

Shared-host native-core composition was part of IMP-03E acceptance and is now proven. IMP-03F is ready for authorization; no implementation or authorization decision is made by this blocker.

## DECISION AUTHORITY

CTO decision: close ACS-BLOCKER-018 as RESOLVED / ACCEPTED and promote IMP-03E to COMPLETE / ACCEPTED.

No CEO decision is required.

## PROMOTION CONDITION

```text
ACS-V2-IMP-03E
COMPLETE / ACCEPTED
        ↓
ACS-BLOCKER-018
RESOLVED / ACCEPTED
        ↓
ACS-V2-IMP-03F
READY FOR AUTHORIZATION
```
