# ACS Blocker Register

Last updated: 2026-06-22

## ACS-BLOCKER-001 - Execution Authority Not Approved

Severity: CRITICAL

Status: OPEN

Description:
ACS can model readiness, permissions, inspection, and guarded policy, but it is not approved for autonomous or production execution.

Impact:
ACS cannot operate as a production execution layer.

Resolution path:
Keep execution gates closed until a later approved cycle provides explicit authority, security review, and validation evidence.

## ACS-BLOCKER-002 - Hummingbot Runtime Blocked

Severity: HIGH

Status: OPEN

Description:
Hummingbot strategy/runtime/API/backtest/paper/live paths remain blocked except for sandbox-only and report-only boundaries.

Impact:
No real trading or bot lifecycle can be executed through ACS.

Resolution path:
Preserve sandbox-only and no-go boundaries until a separate approved execution-sensitive request exists.

## ACS-BLOCKER-003 - Current-Cycle Validation Blocked By Environment

Severity: HIGH

Status: OPEN

Description:
Current-cycle build/test validation could not be executed because `node` and `npm` are unavailable in the environment.

Impact:
Current-cycle runtime health, build health, and test pass status remain unconfirmed.

Resolution path:
Re-run `npm run build`, `npm test`, and `npm run check` in a compatible environment before using validation as maturity evidence.

## ACS-BLOCKER-004 - Dedicated Permission State Model Missing

Severity: MEDIUM

Status: OPEN

Description:
Permission behavior exists across policy and inspection surfaces, but there is no dedicated permission state model matching `ACS-EPIC-01`.

Impact:
Permission representation is not yet centralized for cross-nucleus consumption.

Resolution path:
Address in `ACS-REQ-05` after `ACS-REQ-04` establishes the readiness registry.

## ACS-BLOCKER-005 - Centralized Operational Gate Registry Missing

Severity: MEDIUM

Status: OPEN

Description:
Blocked actions and gates exist across runtime, execution policy, emergency stop, and boundary modules, but there is no centralized operational gate registry yet.

Impact:
Critical no-go areas are documented and partially enforced, but not yet unified into a single registry.

Resolution path:
Address in `ACS-REQ-06` after `ACS-REQ-05` formalizes permission-state requirements.

## ACS-BLOCKER-006 - Dedicated Readiness Registry Target Format Missing

Severity: MEDIUM

Status: RESOLVED IN `ACS-REQ-04`

Description:
Readiness previously existed as a checklist and mock inspection surface only. `ACS-REQ-04` added a dedicated local/config-first/read-only readiness registry with fixtures, read functions, inspection integration, and tests.

Impact:
Readiness is now normalized as a local control-plane registry surface for ACS, while remaining non-executive and non-production.

Resolution path:
Keep the registry read-only and use `ACS-REQ-05` / `ACS-REQ-06` to add adjacent control-plane models without reopening execution authority.

## ACS-BLOCKER-007 - Coverage Indirect For Some Critical Gates

Severity: MEDIUM

Status: OPEN

Description:
Coverage is indirect for `wallet.sign`, `provider.execute.production`, billing, settlement, and provisioning blocking.

Impact:
Boundary intent is present, but some no-go areas are not yet backed by direct focused coverage.

Resolution path:
Address in later implementation and validation requests, starting from `ACS-REQ-05`, `ACS-REQ-06`, and Sprint 04 boundary enforcement work.

## ACS-BLOCKER-008 - Portfolio Registers Unavailable In Current Environment

Severity: LOW

Status: OPEN

Description:
The expected portfolio/global register path is not available in the inspected environment.

Impact:
Portfolio-level updates cannot be performed or validated locally in the current cycle.

Resolution path:
Treat portfolio register updates as environment-dependent and defer them to `ACS-REQ-15` only when the required directory exists.

## Current No-Go Areas

Active blocked areas:
- real ACS provisioning
- real credentials
- wallet/signing
- treasury movement
- trading execution
- settlement
- payouts
- billing execution
- production DB
- production APIs
- external providers in production

## Next Recommended Request

`ACS-REQ-05 - ACS Permission State Model`
