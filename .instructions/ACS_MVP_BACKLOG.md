# ACS Tenant-Aware Core MVP Backlog

# Current MVP Target

ACS Tenant-Aware Core MVP:
- Core/Service/Product consumption model
- tenant-aware context model
- capability registry
- policy matrix extension
- agent role alignment
- tenant service mock registry
- product access mock registry
- Trading Ignition mapped as ACS capability
- telemetry/receipts scoped by tenant and level
- tests for tenant isolation and policy decisions

Trading execution remains mock/restricted.

---

# Phase -1 - Tenant-Aware Alignment

- [x] Add ACS Consumption Model.
- [x] Add Tenant Service Model.
- [x] Add Core Operations model.
- [x] Add Product Layer model.
- [x] Add ACS Agent Roles by level.
- [x] Add consumption-level types.
- [x] Add tenant context model.
- [x] Add capability registry.
- [x] Add tenant service access evaluator.
- [x] Add product access evaluator.
- [x] Map Trading Ignition as ACS capability.
- [x] Add tenant/level telemetry and receipt metadata.
- [x] Add tests for tenant isolation and consumption policy.
- [x] Add read-only tenant-aware inspection layer.
- [x] Add CLI command: `capabilities`.
- [x] Add CLI command: `tenant-services`.
- [x] Add CLI command: `product-access`.
- [x] Add CLI command: `policy-matrix`.
- [x] Add CLI command: `policy-check`.

# Phase 0 - Planning Reset

- [x] Define Operational States.
- [x] Define ACS Policy Matrix.
- [x] Define What ACS Is Not.
- [x] Confirm OpenClaw should remain local/configurable instead of ACS submodule.
- [ ] Align README and existing `.instructions` with Trading Ignition MVP.

---

# Phase 1 - Core Contracts

- [x] Add TypeScript `OperationalState` contract.
- [x] Add TypeScript ACS Policy Matrix contract.
- [x] Add tests for activation-blocking states.
- [x] Add tests ensuring withdrawals are never allowed.
- [x] Add state-change receipt model.
- [x] Add state-change telemetry event types.
- [x] Add operational state machine.
- [x] Add readiness checklist contract.
- [x] Add mock license validator.
- [x] Add mock API safety validator.
- [x] Add risk preset schema.
- [x] Add conservative default preset.
- [x] Add risk limit evaluator.

---

# Phase 2 - Eligibility and License

- [x] Define readiness checklist contract.
- [x] Add mock license validator.
- [x] Add license loss handling.
- [x] Add user status summary model.

---

# Phase 3 - API Safety

- [x] Define exchange API safety contract.
- [x] Add mock API permission validator.
- [x] Reject withdrawal-enabled API scopes.
- [x] Add UI recommendations for disabling withdrawals and using IP permission.
- [x] Define encrypted secret storage requirement before real integration.

---

# Phase 4 - Risk and Trading Ignition

- [x] Define risk preset schema.
- [x] Add conservative default preset.
- [x] Add risk limit evaluator.
- [x] Add emergency stop workflow.
- [x] Add performance record schema.

# Phase 5 - Operational Hardening Foundation

- [x] Add tenant-scoped ACS receipt contract.
- [x] Add receipt metadata redaction for secrets.
- [x] Add emergency stop records, telemetry and receipts.
- [x] Add emergency stop policy-check blocking.
- [x] Add performance record schema and Trading Ignition mock records.
- [x] Add user status summary endpoint.
- [x] Add license loss blocked reasons.
- [x] Add mock encrypted secret storage contract.
- [x] Add HTTP response envelope with correlation id and structured errors.
- [x] Add HTTP hardening placeholders for schema validation, rate limit, tenant auth and observability.
- [x] Add CLI inspection for user status.
- [x] Add CLI inspection for mock performance records.
- [x] Add CLI inspection for ACS audit receipt previews.
- [x] Add wallet-aware policy-check inspection for emergency stop context.
- [x] Add read-only emergency stop inspection endpoint and CLI command.
- [x] Add read-only secret storage contract status endpoint and CLI command.
- [x] Add read-only observability contract status endpoint and CLI command.
- [x] Add policy decision context metadata to policy-check responses.
- [x] Add HTTP query/path schema validation foundation.
- [x] Add auth placeholder context and response metadata.
- [x] Add rate-limit placeholder context and mock exceeded response.
- [x] Add shared ACS fixtures for tenants, receipts, stops, user status, and performance records.
- [x] Add API examples documentation.
- [x] Add MVP readiness checklist.

# Sprint 68 - Trinity ACS Intake Boundary

- [x] Document Trinity Telegram intake boundary.
- [x] Add `TrinityIntentCapture` schema.
- [x] Add `ACSIntentRequest` schema.
- [x] Add Telegram request to allowed response mode matrix.
- [x] Add side-effect No-Go reason codes.
- [x] Block direct file/runtime/Hummingbot/backtest/MCP/shell/network/provider/exchange/secret actions from Telegram by contract.
- [x] Add tests for ACS-routed Hummingbot mutation intents.

# Sprint 69 - ACS Trading Intent Classifier

- [x] Add trading intent classifier documentation.
- [x] Add `trading-intent-classifier.schema.yaml`.
- [x] Add Telegram trading request fixtures.
- [x] Add classifications for research, artifact, strategy mutation, backtest, trading execution, secrets, and treasury.
- [x] Add decision matrix and reason codes.
- [x] Ensure live trading, treasury, API keys, Hummingbot runtime, and strategy mutation remain blocked.
- [x] Add tests proving Trinity does not decide alone.

# Sprint 70 - Trinity ACS Roundtrip Protocol

- [x] Document Trinity ↔ ACS roundtrip protocol.
- [x] Add `ACSDecision` schema.
- [x] Add `TrinityUserResponse` schema.
- [x] Add roundtrip fixtures.
- [x] Add roundtrip reason code table.
- [x] Implement default deny when ACS response is missing.
- [x] Implement default deny when mandatory decision fields are missing.
- [x] Ensure Telegram never becomes direct execution channel.
- [x] Require ACS execution ticket for execution-capable modes.
- [x] Keep real file writes, Hummingbot mutation, runtime mutation, shell, MCP, network, provider, API key, trading, and treasury actions disabled.

# Sprint 71 - Hummingbot Strategy Control Surface Inventory

- [x] Map Hummingbot strategy control surface without mutation.
- [x] Add strategy source, script, controller, config, backtest, logs, credential, connector, runtime, database, Docker/compose, API and MCP surfaces.
- [x] Add path matrix.
- [x] Add operation matrix.
- [x] Add risk matrix.
- [x] Add forbidden paths.
- [x] Add allowed candidate paths.
- [x] Mark connectors, credentials, API keys, accounts, wallets, runtime state and databases as forbidden.
- [x] Keep Hummingbot bot/backtest/API/MCP/network execution blocked.

# Sprint 72 - Hummingbot Strategy Policy and Capability Registry

- [x] Add Hummingbot strategy policy documentation.
- [x] Add Hummingbot capability registry YAML.
- [x] Add Hummingbot strategy policy YAML.
- [x] Register research and backtest design as report-only Go.
- [x] Register diff proposal as limited no-write Go.
- [x] Register sandboxed create/edit/disable as pending approval with ticket required.
- [x] Register sandboxed remove as high risk with human review, rollback and ticket required.
- [x] Keep paper trading and live trading as No-Go.
- [x] Keep secrets and connector configs blocked.
- [x] Register Trinity as conditional executor only.
- [x] Add tests validating policy files and dangerous-action blocks.

# Sprint 73 - Trinity Hummingbot Diff-Only Proposal Flow

- [x] Add Trinity Hummingbot diff-only flow documentation.
- [x] Add diff proposal schema.
- [x] Add diff proposal fixture.
- [x] Add ACS output allowlist for diff proposal artifacts.
- [x] Generate textual diff, rationale, risk assessment and rollback notes.
- [x] Save proposal markdown, sidecar JSON, proof report and console snapshot.
- [x] Add audit/evidence metadata.
- [x] Deny apply patch attempts.
- [x] Deny secret/API key/connector access attempts.
- [x] Keep real Hummingbot files, runtime, backtest, shell, network, MCP, paper trading and live trading untouched.

---

# Deferred

- real exchange execution
- public launch
- strategy marketplace
- advanced AI recommendations
- compute network integration
- DAO-controlled live parameter updates
