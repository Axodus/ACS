# ACS Authority Boundary Matrix

Last updated: 2026-06-22

## Purpose

This matrix defines what ACS may represent, expose, block, or signal in the current phase.

Strict boundary:
- ACS may represent state.
- ACS may expose read-only state.
- ACS may block or signal unsafe or unauthorized actions.
- ACS must not execute real actions.

Current posture:
- local-first
- config-first
- read-only/mock when applicable
- integration-ready
- execution-gated
- non-production
- without mutation authority

## Authority Categories

### MAY_REPRESENT

| Domain | Current authority | Evidence | Notes |
| --- | --- | --- | --- |
| Readiness state | ACS may represent readiness as checklist and mock status state | `src/readiness.ts`, `src/http/services/operational-status-service.ts`, `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md` | Dedicated readiness registry in the exact EPIC format is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Permission state | ACS may represent policy and access state through policy, capability, tenant, and product models | `src/acs-policy-matrix.ts`, `src/capability-registry.ts`, `src/product-access-registry.ts`, `src/tenant-service-registry.ts` | Dedicated permission state model is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Operational gates | ACS may represent gate intent through blocked actions, emergency stop, and intent boundaries | `src/runtime.ts`, `src/execution-policy.ts`, `src/emergency-stop.ts`, `src/trinity-intake-boundary.ts` | Centralized operational gate registry is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Capability registry | ACS may represent capabilities, levels, and consumption metadata | `src/capability-registry.ts`, `src/inspection.ts` | Current capability registry is local and read-only. |
| Policy matrix | ACS may represent authority and allowed-state rules | `src/acs-policy-matrix.ts`, `.instructions/ACS_POLICY_MATRIX.md` | This is authority representation, not execution authority. |
| Emergency stop state | ACS may represent emergency stop records and stop decisions | `src/emergency-stop.ts`, `src/inspection.ts` | Current inspection mode is mock/read-only. |
| Trinity intake | ACS may represent Trinity-originated requests as captured intents and ACS intent requests | `src/trinity-intake-boundary.ts`, `src/trinity-acs-roundtrip-protocol.ts` | Direct side effects remain blocked. |
| Trading intent classification | ACS may represent trading requests as classified intents and policy decisions | `src/trading-intent-classifier.ts` | Classification does not grant execution. |
| Hummingbot sandbox policy | ACS may represent Hummingbot sandbox capability and mutation policy | `.instructions/acs/trading/hummingbot-capabilities.yaml`, `.instructions/acs/trading/hummingbot-strategy-policy.yaml`, `.instructions/ACS_HUMMINGBOT_STRATEGY_POLICY.md` | Sandbox policy remains non-production. |
| Governance approval semantics | ACS may represent whether governance approval is required by capability or action type | `src/acs-policy-matrix.ts`, `src/capability-registry.ts`, `src/inspection.ts` | Representation is allowed; governance execution is not delegated to ACS. |
| Portfolio/global register status | ACS may represent that portfolio/global registers are unavailable in the current environment | `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`, `.instructions/BLOCKER_REGISTER.md` | Global portfolio mutation remains out of scope. |

### MAY_EXPOSE_READ_ONLY

| Domain | Current authority | Evidence | Notes |
| --- | --- | --- | --- |
| Inspection API | ACS may expose read-only inspection state through local HTTP endpoints | `src/http/routes/acs-routes.ts`, `.instructions/ACS_HTTP_API_CONTRACTS.md` | API must remain inspection-only. |
| Local telemetry | ACS may expose local telemetry visibility and status | `src/runtime.ts`, `src/inspection.ts`, `.acs/telemetry/events.jsonl` | Telemetry exposure is local and non-production. |
| Local receipts | ACS may expose local receipts and audit summaries | `src/runtime.ts`, `src/inspection.ts`, `.acs/receipts/execution.jsonl` | Receipt exposure is read-only. |
| Readiness state | ACS may expose read-only readiness surfaces | `src/http/routes/acs-routes.ts`, `src/http/services/operational-status-service.ts` | Current readiness exposure is mock/local. |
| Policy and access checks | ACS may expose read-only policy, capability, product, and tenant checks | `src/inspection.ts`, `src/http/routes/acs-routes.ts` | Inspection surfaces do not mutate state. |
| Secret storage status | ACS may expose read-only secret-storage status and safety rules | `src/inspection.ts`, `.instructions/ACS_SECRET_STORAGE_REQUIREMENTS.md` | ACS may expose status only, never raw secret values. |
| Emergency stop status | ACS may expose read-only emergency stop status | `src/inspection.ts`, `src/emergency-stop.ts` | Current execution impact is inspection-block-only. |
| AxodusAPP consumption | ACS may expose read-only data for AxodusAPP consumption | `.instructions/ACS_HTTP_API_CONTRACTS.md`, `README.md`, `src/http/routes/acs-routes.ts` | Dedicated preview adapter is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Business consumption | ACS may expose read-only policy/capability status suitable for future Business consumption | `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`, `src/inspection.ts` | Dedicated Business contract is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Marketplace consumption | ACS may expose read-only policy/capability status suitable for future Marketplace consumption | `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`, `src/inspection.ts` | Dedicated Marketplace alignment contract is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |

### MAY_BLOCK_OR_SIGNAL

| Domain | Current authority | Evidence | Notes |
| --- | --- | --- | --- |
| Unsafe API permissions | ACS may block or signal unsafe exchange API permissions | `src/api-safety.ts`, `.instructions/ACS_SECURITY_REQUIREMENTS.md` | Withdrawal, transfer, frontend secret exposure, and plaintext logging are blocked or warned. |
| Execution-sensitive commands | ACS may block or signal guarded command execution | `src/execution-policy.ts`, `src/redhat-mcp.ts` | Default policy disables execution. |
| Policy-denied actions | ACS may block or signal actions denied by capability policy | `src/acs-policy-matrix.ts`, `src/inspection.ts` | `withdraw.funds` is always forbidden. |
| Emergency stop impact | ACS may block or signal active emergency stop state | `src/emergency-stop.ts`, `src/inspection.ts` | Stop state blocks matching scopes. |
| Trinity-originated mutation | ACS may block or signal direct file, runtime, network, provider, exchange, or secret actions from Trinity intake | `src/trinity-intake-boundary.ts`, `src/trinity-acs-roundtrip-protocol.ts` | Telegram-originated execution channel remains blocked. |
| Trading execution requests | ACS may block or signal live trading, paper trading, treasury, and secret-access requests | `src/trading-intent-classifier.ts`, `src/trinity-acs-roundtrip-protocol.ts` | No-go responses are explicit. |
| Hummingbot runtime mutation | ACS may block or signal unsafe Hummingbot strategy mutations or runtime actions | `src/hummingbot-strategy-validation-gate.ts`, `.instructions/ACS_HUMMINGBOT_STRATEGY_VALIDATION_GATE.md`, `.instructions/ACS_HUMMINGBOT_STRATEGY_POLICY.md` | Sandbox-only and diff-only boundaries remain in force. |
| Production-provider execution | ACS may block or signal production-provider execution requests | `src/runtime.ts`, `src/trinity-intake-boundary.ts` | `provider.execute.production` is blocked in runtime defaults. |
| Governance requirement | ACS may block or signal that governance approval is required | `src/acs-policy-matrix.ts`, `src/capability-registry.ts`, `src/inspection.ts` | ACS may signal requirement, not grant production authority. |

### MUST_NOT_EXECUTE

| Domain | Current authority | Evidence | Notes |
| --- | --- | --- | --- |
| Provider execution | ACS must not execute external providers in production | `src/runtime.ts`, `src/trinity-intake-boundary.ts`, `README.md` | Local providers are observational/routing contracts only. |
| Production APIs | ACS must not mutate production APIs | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | Inspection API is read-only. |
| Production database | ACS must not connect to or mutate production databases | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | No production DB integration is evidenced locally. |
| Wallet/signing | ACS must not create wallets or sign transactions | `src/runtime.ts`, `src/execution-policy.ts`, `.instructions/SECURITY.md` | `wallet.sign` is blocked; wallet creation is not authorized. |
| Treasury | ACS must not execute treasury movement | `src/runtime.ts`, `src/trading-intent-classifier.ts`, `src/acs-policy-matrix.ts` | Treasury requests are blocked/no-go. |
| Settlement | ACS must not execute settlement | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `.instructions/BLOCKER_REGISTER.md` | Execution remains blocked; direct centralized registry is `PLANNED_NOT_IMPLEMENTED_IN_REQ_03`. |
| Payouts | ACS must not execute payouts | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | No payout authority exists locally. |
| Billing execution | ACS must not execute billing | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `.instructions/BLOCKER_REGISTER.md` | Billing references are roadmap/planning only. |
| Provisioning | ACS must not perform real provisioning | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | Provisioning remains blocked. |
| Smart contracts | ACS must not deploy or mutate smart contracts | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | Smart-contract execution authority is out of scope. |
| Permission enforcement in production | ACS must not enforce production permissions | `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`, `.instructions/STATUS.md` | Current state is representational, not production enforcement. |
| Production state mutation | ACS must not mutate production state | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `src/http/routes/acs-routes.ts` | HTTP and inspection surfaces are read-only. |
| Portfolio/global registers | ACS must not mutate portfolio/global registers in the current environment | `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md`, `.instructions/BLOCKER_REGISTER.md` | Global path unavailable locally. |

## Blocked Action Registry

| Action ID | Domain | Status | Allowed representation | Reason | Related evidence | Required future gate |
| --- | --- | --- | --- | --- | --- | --- |
| `acs.provision.real` | provisioning | `BLOCKED` | ACS may represent provisioning status as blocked or unavailable | Real ACS provisioning is outside the current EPIC boundary and current environment | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `.instructions/BLOCKER_REGISTER.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `credentials.issue.real` | credentials | `BLOCKED` | ACS may represent credential-policy state and credential risk only | Real credential issuance is out of scope and not authorized | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `credentials.read.secret` | secrets and credentials | `BLOCKED` | ACS may expose redacted `secretRef` status only | Raw secret reads are forbidden; current secret adapter is mock/redacted | `src/secret-storage.ts`, `src/inspection.ts`, `.instructions/ACS_SECRET_STORAGE_REQUIREMENTS.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `wallet.create.real` | wallet | `BLOCKED` | ACS may represent wallet-related readiness context only | Real wallet creation is not part of ACS authority | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `src/readiness.ts` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `wallet.sign.real` | wallet/signing | `BLOCKED` | ACS may represent signing as blocked or required-no-go | Signing is blocked by boundary and runtime policy | `src/runtime.ts`, `src/execution-policy.ts`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `treasury.execute.real` | treasury | `BLOCKED` | ACS may represent treasury requests as blocked/no-go | Treasury execution is outside current ACS authority | `src/runtime.ts`, `src/trading-intent-classifier.ts`, `.instructions/ACS_POLICY_MATRIX.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `trading.execute.real` | trading execution | `BLOCKED` | ACS may represent trading intent and blocked decision state | Live and paper trading remain blocked in the current phase | `src/trading-intent-classifier.ts`, `src/trinity-acs-roundtrip-protocol.ts`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `settlement.execute.real` | settlement | `BLOCKED` | ACS may represent settlement as blocked or not available | Settlement is out of scope and lacks implementation authority | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `.instructions/BLOCKER_REGISTER.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `payouts.execute.real` | payouts | `BLOCKED` | ACS may represent payout status as blocked or unsupported | Payout execution is out of scope and non-production | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `billing.execute.real` | billing execution | `BLOCKED` | ACS may represent billing constraints and blocked status only | Billing execution authority does not exist in the current phase | `.instructions/STATUS.md`, `.instructions/SECURITY.md`, `tests/orchestrator.test.mjs` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `database.production.connect` | production database | `BLOCKED` | ACS may represent production-database access as forbidden | No production DB integration is in scope | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `api.production.mutate` | production API | `BLOCKED` | ACS may expose read-only inspection API status | HTTP/API contracts are read-only and must not mutate production systems | `src/http/routes/acs-routes.ts`, `.instructions/ACS_HTTP_API_CONTRACTS.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `provider.external.production.execute` | external providers | `BLOCKED` | ACS may represent provider identity and blocked production execution state | Runtime defaults block production provider execution | `src/runtime.ts`, `src/trinity-intake-boundary.ts`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `smart_contract.deploy_or_mutate` | smart contracts | `BLOCKED` | ACS may represent smart-contract execution as out of scope | Smart-contract execution authority is not part of current ACS scope | `.instructions/STATUS.md`, `.instructions/SECURITY.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `permission.enforce.production` | permission enforcement | `BLOCKED` | ACS may represent permission state and governance requirements | Current permission behavior is representational, not production enforcement | `src/acs-policy-matrix.ts`, `src/capability-registry.ts`, `.instructions/reports/ACS_CURRENT_STATE_BASELINE.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |
| `state.mutate.production` | production state mutation | `BLOCKED` | ACS may represent state and expose read-only mock/inspection state | Current state surfaces are local, mock, or inspection-only | `src/inspection.ts`, `src/http/routes/acs-routes.ts`, `.instructions/STATUS.md` | `PLANNED_NOT_IMPLEMENTED_IN_REQ_03` |

## Domain Notes

- ACS may represent readiness, permission, and gate intent in the current phase.
- ACS may expose read-only inspection, telemetry status, and receipt summaries.
- ACS may block or signal unsafe requests, policy-denied actions, and no-go execution domains.
- ACS must not execute provisioning, credentials, signing, treasury, trading, settlement, payouts, billing, production API mutation, production DB access, smart-contract mutation, or external-provider production execution.

## Planned But Not Implemented In REQ-03

- dedicated readiness registry in the exact `ACS-EPIC-01` target format
- dedicated permission state model
- centralized operational gate registry
- dedicated AxodusAPP preview adapter
- dedicated Business alignment contract
- dedicated Marketplace alignment contract
