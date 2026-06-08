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

Status: OPEN

Description: Current cycle normalized status but did not initially rerun the full ACS validation suite.

Impact: Maturity remains L3 candidate.

Resolution path: Run `npm test`/`npm run check` in an ACS validation request if dependencies are present.
