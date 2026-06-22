# ACS Current State Baseline

## 1. Scope

Confirmed local evidence:
- This report covers `ACS-REQ-01` only: current-state inspection and evidence baseline for the local ACS repository.
- The inspection was limited to local repository structure, `.instructions`, `package.json`, `src/`, `tests/`, `scripts/`, `.acs/`, and existing reports.
- No code was edited.
- No production endpoint was called.
- No secrets were used.
- No destructive commands were executed.
- Validation commands were inspected and environment availability was checked.

Assumptions / unknowns:
- Global portfolio state outside this repository is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.
- Prior validation results recorded in local documents are historical evidence only and were not re-executed in this cycle.

## 2. Repository Location

Confirmed local evidence:
- ACS root path: `/mnt/d/Rede/Github/Axodus/ACS`
- Repository-local operational paths exist:
- `.instructions/`
- `.instructions/reports/`
- `.acs/receipts/execution.jsonl`
- `.acs/telemetry/events.jsonl`

Assumptions / unknowns:
- External portfolio registers under `/opt/Axodus/.instructions/` are `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED` in this environment.

## 3. Directory Inventory

Confirmed local evidence:
- Top-level relevant directories:
- `.acs/`
- `.instructions/`
- `scripts/`
- `src/`
- `tests/`
- `dist/`
- `node_modules/`
- `src/` file count: `64`
- `tests/` file count: `32`
- `src/schemas/` file count: `5`
- `src/fixtures/` file count: `7`
- `src/http/services/` file count: `1`
- `.instructions/` file count: `80`
- `scripts/` file count: `4`
- Notable ACS operational sandbox subtree:
- `.instructions/acs/trading/hummingbot-sandbox/`
- `.instructions/acs/trading/hummingbot-capabilities.yaml`
- `.instructions/acs/trading/hummingbot-strategy-policy.yaml`

Assumptions / unknowns:
- `dist/` is present and appears to contain built artifacts, but its freshness versus current `src/` is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.

## 4. Instruction Files Inventory

Confirmed local evidence:
- Operational files required for ACS operations are present:
- `.instructions/STATUS.md`
- `.instructions/ROADMAP.md`
- `.instructions/TASKS.md`
- `.instructions/VALIDATION.md`
- `.instructions/HANDOFF.md`
- `.instructions/BLOCKER_REGISTER.md`
- `.instructions/SECURITY.md`
- Existing ACS-specific guidance is extensive and includes:
- `.instructions/ACS_POLICY_MATRIX.md`
- `.instructions/ACS_OPERATIONAL_STATES.md`
- `.instructions/ACS_SECURITY_REQUIREMENTS.md`
- `.instructions/ACS_HTTP_API_CONTRACTS.md`
- `.instructions/ACS_TRINITY_INTAKE_BOUNDARY.md`
- `.instructions/ACS_TRADING_INTENT_CLASSIFIER.md`
- `.instructions/ACS_HUMMINGBOT_STRATEGY_POLICY.md`
- `.instructions/ACS_HUMMINGBOT_STRATEGY_VALIDATION_GATE.md`
- `.instructions/ACS_SECRET_STORAGE_REQUIREMENTS.md`
- `.instructions/ACS_MATURITY_ASSESSMENT.md`
- Existing report inventory under `.instructions/reports/` currently contains:
- `.instructions/reports/ACS_GATE_01_L4_CANDIDATE_EVIDENCE_REVIEW.md`

Assumptions / unknowns:
- Documentation coherence is not yet normalized; there are conflicting maturity statements that require follow-up in `ACS-REQ-02`.

## 5. Stack and Runtime

Confirmed local evidence:
- Package name: `@axodus/acs-core`
- Language: TypeScript
- Module mode: ESM (`"type": "module"`)
- Compiler target: `ES2022`
- Module resolution: `NodeNext`
- Build output path: `dist/`
- Runtime model: local Node.js package with local JSONL telemetry and receipt persistence
- Declared dev dependencies:
- `typescript`
- `@types/node`
- Local runtime contracts and entry points are present in:
- `src/runtime.ts`
- `src/orchestrator.ts`
- `src/providers.ts`
- `src/telemetry.ts`
- `src/receipts.ts`

Assumptions / unknowns:
- Actual installed `node` and `npm` binaries are not available in this session, so runtime validation is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.

## 6. Package Scripts

Confirmed local evidence:
- `npm run build`
- `npm test`
- `npm run check`
- `npm run acs`
- `npm run http`
- `npm run smoke:openclaw`
- `npm run smoke:runtime`

Assumptions / unknowns:
- No dedicated lint script exists in `package.json`.
- No dedicated standalone typecheck script exists beyond `npm run build`.

## 7. Source Modules Inventory

Confirmed local evidence:
- Core runtime and orchestration:
- `src/runtime.ts`
- `src/orchestrator.ts`
- `src/policy.ts`
- `src/providers.ts`
- `src/agents.ts`
- `src/types.ts`
- `src/receipts.ts`
- `src/telemetry.ts`
- Readiness and operational state:
- `src/readiness.ts`
- `src/operational-state.ts`
- `src/operational-state-machine.ts`
- `src/http/services/operational-status-service.ts`
- Capability, policy, access, and inspection:
- `src/acs-policy-matrix.ts`
- `src/capability-registry.ts`
- `src/product-access-registry.ts`
- `src/tenant-service-registry.ts`
- `src/inspection.ts`
- `src/user-status.ts`
- `src/emergency-stop.ts`
- Execution and guarded command boundaries:
- `src/execution-policy.ts`
- `src/redhat-mcp.ts`
- Security and secret-handling surfaces:
- `src/api-safety.ts`
- `src/secret-storage.ts`
- `src/acs-receipts.ts`
- HTTP inspection surface:
- `src/http/auth.ts`
- `src/http/rate-limit.ts`
- `src/http/responses.ts`
- `src/http/routes/acs-routes.ts`
- `src/http/server.ts`
- Trinity / Trading / Hummingbot boundaries:
- `src/trinity-intake-boundary.ts`
- `src/trading-intent-classifier.ts`
- `src/trinity-acs-roundtrip-protocol.ts`
- `src/trinity-telegram-response-contract.ts`
- `src/trinity-hummingbot-diff-only-flow.ts`
- `src/hummingbot-strategy-validation-gate.ts`
- `src/hummingbot-sandbox-lifecycle.ts`
- Schemas:
- `src/schemas/trading-intent-classifier.schema.yaml`
- `src/schemas/trinity-acs-roundtrip.schema.yaml`
- `src/schemas/hummingbot-diff-proposal.schema.yaml`
- `src/schemas/hummingbot-sandbox-lifecycle.schema.yaml`
- `src/schemas/hummingbot-strategy-validation-gate.schema.yaml`
- Fixtures:
- `src/fixtures/acs-fixtures.ts`
- `src/fixtures/trading-intent-fixtures.ts`
- `src/fixtures/trinity-roundtrip-fixtures.ts`
- `src/fixtures/trinity-telegram-response-fixtures.ts`
- `src/fixtures/hummingbot-diff-proposal-fixtures.ts`
- `src/fixtures/hummingbot-sandbox-lifecycle-fixtures.ts`
- `src/fixtures/hummingbot-strategy-validation-fixtures.ts`

Assumptions / unknowns:
- There is no dedicated module named `permission-state` or `gate-registry`; equivalent behavior is currently spread across policy, runtime blocked actions, inspection, emergency stop, and boundary modules.

## 8. Tests Inventory

Confirmed local evidence:
- Test suite files present:
- `tests/acs-policy-matrix.test.mjs`
- `tests/api-safety.test.mjs`
- `tests/execution-policy.test.mjs`
- `tests/http.test.mjs`
- `tests/http-auth-rate-limit.test.mjs`
- `tests/inspection.test.mjs`
- `tests/operational-hardening.test.mjs`
- `tests/operational-state.test.mjs`
- `tests/operational-state-machine.test.mjs`
- `tests/openclaw.test.mjs`
- `tests/orchestrator.test.mjs`
- `tests/readiness.test.mjs`
- `tests/receipts.test.mjs`
- `tests/redhat-mcp.test.mjs`
- `tests/runtime.test.mjs`
- `tests/tenant-consumption.test.mjs`
- `tests/trading-intent-classifier.test.mjs`
- `tests/trinity-acs-roundtrip-protocol.test.mjs`
- `tests/trinity-intake-boundary.test.mjs`
- `tests/trinity-telegram-response-contract.test.mjs`
- `tests/hummingbot-strategy-policy.test.mjs`
- `tests/hummingbot-strategy-validation-gate.test.mjs`
- `tests/hummingbot-sandbox-workspace.test.mjs`
- `tests/hummingbot-sandbox-lifecycle.test.mjs`
- `tests/trinity-strategy-sandbox-pilot.test.mjs`
- Tests clearly target:
- policy matrix and authority denial
- readiness and operational state
- HTTP inspection and hardening
- secret redaction and mock secret storage
- Trinity intake boundaries
- trading intent classification and default-deny behavior
- Hummingbot sandbox policy and validation gates
- guarded execution blocking
- runtime bootstrapping and local provider/agent discovery

Assumptions / unknowns:
- Exact current passing count is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED` in this cycle because tests were not executed.

## 9. Existing Readiness/Permission/Gate Capabilities

Confirmed local evidence:
- Readiness capability exists in `src/readiness.ts` as a checklist model with explicit checks such as:
- `wallet.connected`
- `license.attached`
- `api.withdrawals.disabled`
- `api.connection.validated`
- Mock readiness exposure exists in `src/http/services/operational-status-service.ts` and is surfaced through:
- `GET /acs/readiness/:wallet`
- `GET /acs/status/:wallet`
- Operational state capability exists in:
- `src/operational-state.ts`
- `src/operational-state-machine.ts`
- Permission and authority representation exists in:
- `src/acs-policy-matrix.ts`
- `src/capability-registry.ts`
- `src/product-access-registry.ts`
- `src/tenant-service-registry.ts`
- Inspection-oriented policy exposure exists in:
- `src/inspection.ts`
- `src/http/routes/acs-routes.ts`
- Guard and blocked-action behavior already exists in multiple places:
- `src/runtime.ts` default blocked actions:
- `treasury.transfer`
- `wallet.sign`
- `provider.execute.production`
- `permissions.escalate`
- `src/execution-policy.ts` default command execution disabled, sandbox blocked, no allowlist, no approval tokens
- `src/emergency-stop.ts` block-on-stop behavior
- `src/trinity-intake-boundary.ts` direct side effects blocked for Telegram-originated requests
- `src/trading-intent-classifier.ts` no-go for live trading, secret access, and treasury requests

Assumptions / unknowns:
- A dedicated `permission state model` matching the target states from `ACS-EPIC-01` does not yet exist as a first-class isolated module.
- A dedicated `operational gate registry` matching the target gate list from `ACS-EPIC-01` does not yet exist as a first-class isolated module.
- Billing, settlement, provisioning, and production-provider gates exist only partially or indirectly and require explicit consolidation.

## 10. Existing Integration Boundaries

Confirmed local evidence:
- OpenClaw integration boundary:
- `src/openclaw.ts`
- `src/runtime.ts`
- discovery is local and does not execute agent code
- RedHat MCP boundary:
- `src/redhat-mcp.ts`
- planning-only and blocked guarded execution contract
- HTTP integration boundary:
- `src/http/routes/acs-routes.ts`
- inspection-only, GET-only, local JSON envelope
- Trinity intake boundary:
- `src/trinity-intake-boundary.ts`
- `src/trinity-acs-roundtrip-protocol.ts`
- `src/trading-intent-classifier.ts`
- Telegram-originated mutation, shell, network, provider, exchange, and secret access remain blocked
- Hummingbot sandbox boundary:
- `src/hummingbot-strategy-validation-gate.ts`
- `.instructions/acs/trading/hummingbot-sandbox/`
- sandbox-only, no runtime mutation, no direct exchange calls, no secrets
- Consumer/read-only integration surfaces already exposed for local consumption:
- capabilities
- tenant services
- product access
- policy matrix
- policy check
- readiness
- operational state
- user status
- emergency stops
- secret storage status
- observability status

Assumptions / unknowns:
- A formal AxodusAPP-specific preview adapter is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.
- A formal Business/Marketplace alignment contract is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.

## 11. Security and No-Go Areas

Confirmed local evidence:
- Secrets:
- source evidence in `src/api-safety.ts`, `src/secret-storage.ts`, `src/acs-receipts.ts`, `src/inspection.ts`
- tests in `tests/api-safety.test.mjs`, `tests/operational-hardening.test.mjs`, `tests/http-auth-rate-limit.test.mjs`, `tests/hummingbot-strategy-validation-gate.test.mjs`, `tests/trinity-strategy-sandbox-pilot.test.mjs`
- Credentials:
- source evidence in `src/trading-intent-classifier.ts`, `src/trinity-telegram-response-contract.ts`, `src/hummingbot-strategy-validation-gate.ts`
- tests in `tests/trading-intent-classifier.test.mjs`, `tests/trinity-telegram-response-contract.test.mjs`, `tests/hummingbot-sandbox-workspace.test.mjs`
- Wallet / signing:
- source evidence in `src/readiness.ts`, `src/product-access-registry.ts`, `src/runtime.ts`, `src/execution-policy.ts`
- explicit blocked action exists for `wallet.sign`
- direct explicit test for `wallet.sign` is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Treasury:
- source evidence in `src/runtime.ts`, `src/execution-policy.ts`, `src/trading-intent-classifier.ts`
- tests in `tests/trading-intent-classifier.test.mjs`, `tests/trinity-acs-roundtrip-protocol.test.mjs`, `tests/acs-policy-matrix.test.mjs`
- Trading execution:
- source evidence in `src/trading-intent-classifier.ts`, `src/trinity-intake-boundary.ts`, `src/hummingbot-strategy-validation-gate.ts`
- tests in `tests/trading-intent-classifier.test.mjs`, `tests/trinity-acs-roundtrip-protocol.test.mjs`, `tests/hummingbot-strategy-policy.test.mjs`, `tests/hummingbot-strategy-validation-gate.test.mjs`
- Settlement:
- local documentation references exist
- explicit source-level settlement gate module or explicit settlement-blocking test is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Billing:
- indirect evidence exists via `tests/orchestrator.test.mjs` missing-permission case with `billing.settle`
- explicit billing execution blocked-action test is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Provisioning:
- documentation references exist
- explicit provisioning gate module or provisioning-blocking test is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Production providers:
- source evidence in `src/runtime.ts` blocked action `provider.execute.production`
- boundary evidence in `src/trinity-intake-boundary.ts` provider/exchange no-go
- explicit test that targets `provider.execute.production` by name is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Global execution no-go:
- `src/execution-policy.ts` defaults to `executionEnabled: false`
- `src/redhat-mcp.ts` never executes commands
- tests in `tests/execution-policy.test.mjs` and `tests/redhat-mcp.test.mjs`

Assumptions / unknowns:
- No real secrets were discovered in the inspected repository content, but this is a repository-content observation only and not a host-wide secret audit.

## 12. Validation Commands

Confirmed local evidence:
- `npm run build`
- `npm test`
- `npm run check`
- `npm run smoke:openclaw`
- `npm run smoke:runtime`
- CLI/inspection scripts also exist:
- `npm run acs`
- `npm run http`

Assumptions / unknowns:
- No `lint` command exists in `package.json`.

## 13. Validation Result

Confirmed local evidence:
- Validation command availability was inspected.
- Local environment check result:
- `node`: not available
- `npm`: not available
- Validation status for this cycle:
- `NOT_EXECUTED_ENVIRONMENT_BLOCKER`

Assumptions / unknowns:
- Historical local documents claim prior `npm test` and `npm run check` success with `152` tests, but those results were not re-executed in this cycle and must not be treated as current-cycle proof.

## 14. Gaps

Confirmed local evidence:
- No dedicated `ACS_CURRENT_STATE_BASELINE` report existed before this file.
- No dedicated permission-state module matching `ACS-EPIC-01` target states was found.
- No dedicated operational gate registry module matching `ACS-EPIC-01` target gates was found.
- No explicit first-class registry for:
- billing execution gate
- settlement gate
- provisioning gate
- production database gate
- credentials gate
- external provider production gate
- Test coverage is strong for secrets, treasury, trading no-go, runtime mutation, and read-only boundaries.
- Test coverage is weaker or indirect for:
- `wallet.sign`
- `provider.execute.production`
- settlement
- billing execution blocking
- provisioning blocking

Assumptions / unknowns:
- Cross-nucleus consumer contracts for AxodusAPP, Business, and Marketplace are only partially implied by current inspection surfaces and remain `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED` as explicit dedicated contracts.

## 15. Blockers

Confirmed local evidence:
- Environment blocker:
- validation commands could not be executed because `node` and `npm` are unavailable
- Existing documented blockers still present in local evidence:
- execution authority not approved
- Hummingbot runtime blocked
- production credentials blocked
- secrets access blocked
- live/paper trading runtime blocked
- treasury movement blocked
- Local documentation also shows maturity-state inconsistency between `KEEP_L3_CANDIDATE` and `PROMOTE_TO_L4_CANDIDATE`, which is a documentation blocker for the next phase

Assumptions / unknowns:
- Whether additional blockers exist outside this repository is `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`.

## 16. Preliminary L/D Assessment

Confirmed local evidence:
- Existing local documentation states ACS is `L4 Candidate`.
- Existing code, tests, and docs show meaningful local functional maturity in:
- readiness modeling
- policy and authority representation
- inspection/read-only HTTP surfaces
- secret redaction
- guarded execution blocking
- Trinity/Trading/Hummingbot boundaries
- Current-cycle validation was not executed, so this report does not re-affirm or upgrade maturity.

Assumptions / unknowns:
- Preliminary L-Level for this cycle:
- `L4 Candidate` by inherited local documentation only
- Preliminary D-Level for this cycle:
- `NOT_CONFIRMED_LOCAL_EVIDENCE_REQUIRED`
- Working assumption from the approved planning report:
- `D2` or `D3`
- This assumption is not promoted to confirmed evidence in `ACS-REQ-01`.

## 17. Recommendation for ACS-REQ-02

Confirmed local evidence:
- `ACS-REQ-02` should normalize documentation only after preserving the findings in this baseline.
- The highest-value normalization targets are:
- reconcile `STATUS.md`, `VALIDATION.md`, `HANDOFF.md`, and `BLOCKER_REGISTER.md`
- separate L-Level from D-Level explicitly
- record the current-cycle validation blocker as `NOT_EXECUTED_ENVIRONMENT_BLOCKER`
- add a single authoritative ACS authority/boundary view consistent with current code
- document where permission/gate behavior already exists and where dedicated registries are still missing

Assumptions / unknowns:
- `ACS-REQ-02` should not claim `L4 Consolidated` unless later cycles add current evidence for dedicated registries, explicit gap closure, and successful local validation in a compatible environment.
