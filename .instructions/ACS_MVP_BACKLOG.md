# ACS MVP Backlog

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
- [ ] Add license loss handling.
- [ ] Add user status summary model.

---

# Phase 3 - API Safety

- [x] Define exchange API safety contract.
- [x] Add mock API permission validator.
- [x] Reject withdrawal-enabled API scopes.
- [x] Add UI recommendations for disabling withdrawals and using IP permission.
- [ ] Define encrypted secret storage requirement before real integration.

---

# Phase 4 - Risk and Trading Ignition

- [x] Define risk preset schema.
- [x] Add conservative default preset.
- [x] Add risk limit evaluator.
- [ ] Add emergency stop workflow.
- [ ] Add performance record schema.

---

# Deferred

- real exchange execution
- public launch
- strategy marketplace
- advanced AI recommendations
- compute network integration
- DAO-controlled live parameter updates
