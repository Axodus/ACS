# ACS Authority Boundary Report

## 1. Scope

Confirmed local evidence:
- This report covers `ACS-REQ-03` only.
- The work was limited to ACS-local documentation under `.instructions`.
- No source code, tests, schemas, fixtures, services, adapters, or package files were changed.
- No portfolio/global registers were created or modified.
- No maturity promotion to `L4 Consolidated` was performed.

## 2. Files Reviewed

- `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`
- `.instructions/reports/ACS_INSTRUCTION_NORMALIZATION_REPORT.md`
- `.instructions/ACS_POLICY_MATRIX.md`
- `.instructions/ACS_OPERATIONAL_STATES.md`
- `.instructions/ACS_SECURITY_REQUIREMENTS.md`
- `.instructions/ACS_HTTP_API_CONTRACTS.md`
- `.instructions/ACS_SECRET_STORAGE_REQUIREMENTS.md`
- `.instructions/ACS_MATURITY_ASSESSMENT.md`
- `.instructions/STATUS.md`
- `.instructions/BLOCKER_REGISTER.md`
- `.instructions/SECURITY.md`
- `src/policy.ts`
- `src/acs-policy-matrix.ts`
- `src/capability-registry.ts`
- `src/readiness.ts`
- `src/inspection.ts`
- `src/api-safety.ts`
- `src/secret-storage.ts`
- `src/emergency-stop.ts`
- `src/trading-intent-classifier.ts`
- `src/trinity-intake-boundary.ts`
- `src/trinity-acs-roundtrip-protocol.ts`
- `src/http/routes/acs-routes.ts`
- `src/runtime.ts`

## 3. Files Changed

- `.instructions/ACS_AUTHORITY_BOUNDARY_MATRIX.md`
- `.instructions/BLOCKER_REGISTER.md`
- `.instructions/SECURITY.md`
- `.instructions/HANDOFF.md`
- `.instructions/TASKS.md`
- `.instructions/reports/ACS_AUTHORITY_BOUNDARY_REPORT.md`

## 4. Authority Model Summary

Confirmed local evidence:
- ACS may represent readiness, policy, capability, access, emergency stop, and intent classification state.
- ACS may expose read-only inspection, telemetry status, and receipt summaries.
- ACS may block or signal unsafe, unauthorized, or out-of-scope actions.
- ACS must not execute real provisioning, credentials, wallet/signing, treasury, trading, settlement, payouts, billing, production API mutation, production DB access, smart-contract mutation, or external-provider production execution.

## 5. Matrix Summary

The matrix classifies ACS authority into four strict categories:
- `MAY_REPRESENT`
- `MAY_EXPOSE_READ_ONLY`
- `MAY_BLOCK_OR_SIGNAL`
- `MUST_NOT_EXECUTE`

Covered domains include:
- readiness state
- permission state
- operational gates
- capability registry
- policy matrix
- inspection API
- local telemetry
- local receipts
- emergency stop state
- Trinity intake
- MCP adapter boundaries
- trading intent classification
- Hummingbot sandbox policy
- secrets and credentials
- provider execution
- production APIs
- production database
- wallet/signing
- treasury
- settlement
- payouts
- billing execution
- provisioning
- mutation authority
- smart contracts
- external providers
- portfolio/global registers
- AxodusAPP consumption
- Business consumption
- Marketplace consumption
- governance approval semantics

## 6. Blocked Actions Summary

The blocked action registry now explicitly documents ACS-local blocked actions for:
- `acs.provision.real`
- `credentials.issue.real`
- `credentials.read.secret`
- `wallet.create.real`
- `wallet.sign.real`
- `treasury.execute.real`
- `trading.execute.real`
- `settlement.execute.real`
- `payouts.execute.real`
- `billing.execute.real`
- `database.production.connect`
- `api.production.mutate`
- `provider.external.production.execute`
- `smart_contract.deploy_or_mutate`
- `permission.enforce.production`
- `state.mutate.production`

Every blocked action is documented with:
- action id
- domain
- status `BLOCKED`
- allowed representation
- reason
- related evidence
- required future gate as `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`

## 7. Source Evidence

Key evidence used:
- `src/acs-policy-matrix.ts` for represented capability authority and `withdraw.funds` no-go
- `src/capability-registry.ts` for capability exposure and governance requirement semantics
- `src/readiness.ts` for readiness representation
- `src/inspection.ts` and `src/http/routes/acs-routes.ts` for read-only exposure
- `src/runtime.ts` for default blocked actions
- `src/execution-policy.ts` and `src/redhat-mcp.ts` for guarded execution blocking
- `src/api-safety.ts` and `src/secret-storage.ts` for secrets/credentials boundaries
- `src/emergency-stop.ts` for block-or-signal emergency stop behavior
- `src/trinity-intake-boundary.ts`, `src/trading-intent-classifier.ts`, and `src/trinity-acs-roundtrip-protocol.ts` for no-go execution channels and blocked trading/treasury/secret requests

## 8. Consistency Updates

Consistency updates applied:
- `BLOCKER_REGISTER.md` next recommended request now points to `ACS-REQ-04`
- `SECURITY.md` now references the existence of the authority boundary matrix and points next to `ACS-REQ-04`
- `HANDOFF.md` now records `ACS-REQ-03` as completed and points next to `ACS-REQ-04`
- `TASKS.md` now marks `ACS-REQ-03` complete

## 9. Remaining Gaps

- no dedicated readiness registry in the exact target EPIC format
- no dedicated permission state model
- no centralized operational gate registry
- direct focused coverage remains missing for:
- `wallet.sign`
- `provider.execute.production`
- billing execution
- settlement
- provisioning
- global portfolio register path remains unavailable in the current environment

## 10. Out-of-Scope Items Not Changed

- source code
- tests
- schemas
- fixtures
- services
- adapters
- package files
- lockfiles
- portfolio/global registers
- maturity promotion beyond `L4 Candidate`

## 11. Recommendation for ACS-REQ-04

Recommended next request:
- `ACS-REQ-04 - ACS Readiness Registry Implementation`

Reason:
- the authority boundary is now explicit enough to start the first technical registry implementation
- readiness is the least ambiguous next control-plane artifact and is already partially represented in local code

## Validation

Safe inspection commands executed:
- `git diff -- .instructions`
- `git status --short`

Environment note:
- `node` and `npm` remain unavailable
- executable validation remains environment-blocked
