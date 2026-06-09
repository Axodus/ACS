# ACS Blocker Register

Last updated: 2026-06-08

## ACS-BLOCKER-001 - Execution Authority Not Approved

Severity: CRITICAL

Status: OPEN

Description: ACS can model guarded policy and readiness, but autonomous or trading-adjacent execution is not approved.

Impact: ACS cannot operate as a production execution layer.

Resolution path: Require Governance/Core approval, risk review, credential vault policy and sandbox validation before execution planning.

## ACS-BLOCKER-002 - Hummingbot Runtime Blocked

Severity: HIGH

Status: OPEN

Description: Hummingbot strategy/runtime/API/backtest/paper/live paths remain blocked except for sandbox-only report/design work.

Impact: No real trading or bot lifecycle can be executed.

Resolution path: Keep sandbox-only gates until a separate approved execution request exists.

## ACS-BLOCKER-003 - Validation Refresh Required

Severity: MEDIUM

Status: RESOLVED

Description: Current cycle normalized status but did not initially rerun the full ACS validation suite.

Impact: Maturity remains L3 candidate.

Resolution path: PORTFOLIO-REQ-02 ran `npm run check` successfully with 152 tests passing.

## ACS-BLOCKER-004 - L4 Candidate Gate Review Pending

Severity: MEDIUM

Status: RESOLVED

Description: ACS required explicit evidence review before promotion because it is execution-sensitive.

Impact: Resolved for L4 candidate classification only.

Resolution path: ACS-GATE-01 reviewed validation, product structure, security and governance evidence. Final decision: PROMOTE_TO_L4_CANDIDATE.

## PORTFOLIO-REQ-02 Blocker Review

| Blocker | Status |
|---|---|
| Execution authority not approved | ACTIVE |
| Hummingbot runtime blocked | ACTIVE |
| Validation refresh required | RESOLVED |

## ACS-GATE-01 Blocker Review

| Blocker | Status |
|---|---|
| Execution authority not approved | ACTIVE |
| Hummingbot runtime blocked | ACTIVE |
| Production credentials blocked | ACTIVE |
| Secrets access blocked | ACTIVE |
| Live/paper trading runtime blocked | ACTIVE |
| Treasury movement blocked | ACTIVE |
| Validation refresh required | RESOLVED |
| L4 candidate gate review pending | RESOLVED |
