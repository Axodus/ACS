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

---

# Deferred

- real exchange execution
- public launch
- strategy marketplace
- advanced AI recommendations
- compute network integration
- DAO-controlled live parameter updates
