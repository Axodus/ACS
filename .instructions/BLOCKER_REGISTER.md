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

## ACS-BLOCKER-003 - Current-Cycle Local Validation

Severity: HIGH

Status: RESOLVED IN `ACS-REQ-12`

Description:
`ACS-REQ-12` fixed the literal-type inference error at `src/consumer-contract.ts:314` and the additional validation defects exposed after compilation resumed. Fresh `npm run build`, `npm test`, and `npm run check` runs pass.

Impact:
Current-cycle local build, test, and check health is confirmed.

Resolution path:
Keep `.instructions/reports/ACS_LOCAL_VALIDATION_REPORT.md` as the current-cycle evidence. Re-open this blocker if later changes break build, tests, or check.

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

Status: RESOLVED IN `ACS-REQ-09`

Description:
`ACS-REQ-08` added an AxodusAPP-specific preview adapter on top of the generic consumer contract, but the Business/Marketplace-specific alignment contract remains intentionally out of scope until `ACS-REQ-09`.

Impact:
AxodusAPP preview consumption is now available locally, but Business and Marketplace still lack their own read-only alignment contract.

Resolution path:
Use `ACS-REQ-09` for Business/Marketplace alignment without reopening execution authority.

## ACS-BLOCKER-010 - Boundary Enforcement Tests Not Implemented Yet

Severity: MEDIUM

Status: RESOLVED IN `ACS-REQ-10`

Description:
Read-only registries and consumer-facing contracts now exist for ACS, but explicit Sprint 04 boundary-enforcement coverage has not been added yet.

Impact:
Boundary intent is represented in code and docs, but current-cycle enforcement proof for the full execution/no-go surface is still incomplete.

Resolution path:
Use `ACS-REQ-10` to add explicit boundary-enforcement tests without reopening execution authority.

## ACS-BLOCKER-011 - Security Review And Secret Safety Audit Not Implemented Yet

Severity: MEDIUM

Status: RESOLVED IN `ACS-REQ-11`

Description:
`ACS-REQ-11` completed the local security review, secret safety audit, and production endpoint audit. No real secret, credential leak, production endpoint, production database connection, mutating HTTP route, or external production runtime call was found.

Impact:
The security posture now has dedicated evidence reports. Production use remains blocked by other active blockers and failed current-cycle validation.

Resolution path:
Keep the audit reports current and repeat the review if later work adds credentials, public endpoints, databases, providers, or mutation authority.

## ACS-BLOCKER-012 - Production Security Controls Intentionally Unavailable

Severity: HIGH

Status: OPEN

Description:
The local HTTP surface uses mock/placeholder authentication and rate limiting, emits wildcard CORS, and has no production KMS/Vault-equivalent secret adapter or approved deployment boundary.

Impact:
ACS must not be exposed or treated as a production service even though its current routes are GET-only and inspection-focused.

Resolution path:
Keep ACS local and non-production. Any later production proposal requires separately approved identity, authorization, rate limiting, origin restrictions, secret storage, deployment controls, and a renewed security review.

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

## ACS-REQ-13 Assessment Note

`ACS-REQ-13` does not close any active execution or production blockers. It recommends `PROMOTE_TO_L4_READINESS`, not `PROMOTE_TO_L4_CONSOLIDATED`, because final handoff and portfolio/global register closure remain pending by scope and environment.

## Next Recommended Request

`ACS-REQ-14 - Final ACS EPIC handoff`
