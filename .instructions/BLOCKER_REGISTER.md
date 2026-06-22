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

Status: RESOLVED IN `ACS-REQ-05`

Description:
Permission behavior previously existed across policy and inspection surfaces only. `ACS-REQ-05` added a dedicated local/config-first/read-only permission state model with fixtures, read functions, inspection integration, and representational action checks.

Impact:
Permission representation is now centralized as a local control-plane surface for ACS without enabling production enforcement.

Resolution path:
Keep the permission state model representational and use `ACS-REQ-06` to add the adjacent operational gate registry without reopening execution authority.

## ACS-BLOCKER-005 - Centralized Operational Gate Registry Missing

Severity: MEDIUM

Status: RESOLVED IN `ACS-REQ-06`

Description:
Blocked actions and gates previously existed across runtime, execution policy, emergency stop, and boundary modules only. `ACS-REQ-06` added a dedicated local/config-first/read-only operational gate registry and blocked action registry with inspection integration and focused tests.

Impact:
Critical no-go areas are now unified into a single local registry surface without enabling production execution.

Resolution path:
Keep the gate registry representational and use later requests for consumer contracts and validation, without reopening execution authority.

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

Status: RESOLVED IN `ACS-REQ-06`

Description:
Focused source/test coverage was added for `wallet.sign`, `provider.execute.production`, billing, settlement, and provisioning blocking through the operational gate registry and blocked action registry.

Impact:
Boundary intent is now backed by direct registry and test definitions, although current-cycle executable confirmation remains blocked by environment.

Resolution path:
Re-run executable validation in a compatible environment and extend boundary-enforcement tests in Sprint 04.

## ACS-BLOCKER-008 - Portfolio Registers Unavailable In Current Environment

Severity: LOW

Status: OPEN

Description:
The expected portfolio/global register path is not available in the inspected environment.

Impact:
Portfolio-level updates cannot be performed or validated locally in the current cycle.

Resolution path:
Treat portfolio register updates as environment-dependent and defer them to `ACS-REQ-15` only when the required directory exists.

## ACS-BLOCKER-009 - Business And Marketplace Alignment Contract Not Implemented Yet

Severity: LOW

Status: OPEN

Description:
`ACS-REQ-08` added an AxodusAPP-specific preview adapter on top of the generic consumer contract, but the Business/Marketplace-specific alignment contract remains intentionally out of scope until `ACS-REQ-09`.

Impact:
AxodusAPP preview consumption is now available locally, but Business and Marketplace still lack their own read-only alignment contract.

Resolution path:
Use `ACS-REQ-09` for Business/Marketplace alignment without reopening execution authority.

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

`ACS-REQ-09 - Business and Marketplace ACS Alignment Contract`
