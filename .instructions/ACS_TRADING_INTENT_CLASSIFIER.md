# ACS Trading Intent Classifier

Sprint: 69 - ACS Trading Intent Classifier

Status: implemented as classification contract. No Hummingbot runtime, strategy mutation, backtest execution, paper trading, live trading, secret access, provider access, exchange access or treasury operation is enabled.

---

# Objective

Classify Trading requests received through Trinity before any plan, artifact, strategy mutation or execution can be considered.

Trinity does not decide alone. Trinity captures intent; ACS classifies and returns the decision surface.

---

# Delivered Files

```text
src/trading-intent-classifier.ts
src/fixtures/trading-intent-fixtures.ts
src/schemas/trading-intent-classifier.schema.yaml
tests/trading-intent-classifier.test.mjs
```

---

# Classifications

```text
research_only
artifact_request
strategy_diff_proposal
strategy_sandbox_write
strategy_disable_request
strategy_remove_request
backtest_design
backtest_dry_run
paper_trading_request
live_trading_request
secret_access_request
treasury_request
```

---

# Decision Matrix

| Intent | Decision | Response Mode |
|---|---|---|
| `research_only` | allow report-only | `report_only` |
| `artifact_request` | route to ACS docs/artifact flow | `acs_routed` |
| `strategy_diff_proposal` | allow only after gate | `acs_routed` |
| `strategy_sandbox_write` | pending approval | `acs_routed` |
| `strategy_disable_request` | pending approval | `acs_routed` |
| `strategy_remove_request` | high risk / pending approval | `acs_routed` |
| `backtest_design` | allow report-only | `report_only` |
| `backtest_dry_run` | future caution | `acs_routed` |
| `paper_trading_request` | No-Go for now | `no_go` |
| `live_trading_request` | No-Go | `no_go` |
| `secret_access_request` | No-Go | `no_go` |
| `treasury_request` | No-Go | `no_go` |

---

# Reason Codes

```text
trinity_must_route_to_acs
report_only_allowed
artifact_flow_required
strategy_diff_gate_required
strategy_sandbox_write_pending_approval
strategy_disable_pending_approval
strategy_remove_high_risk_pending_approval
backtest_design_report_only
backtest_dry_run_future_caution
paper_trading_no_go_current_phase
live_trading_no_go
secret_access_no_go
treasury_no_go
hummingbot_runtime_no_go
api_keys_out_of_context
no_strategy_mutation_this_sprint
```

---

# Hard Constraints

- live trading remains `No-Go`;
- treasury remains `No-Go`;
- API keys remain out of context;
- Hummingbot runtime must not be touched;
- no strategy may be created, edited, disabled or removed in this sprint;
- dry-run/backtest execution is not enabled;
- paper trading is not enabled;
- Trinity must route decisions through ACS.

---

# Output Shape

The classifier returns:

- request id;
- source;
- requester ref;
- classification;
- decision;
- response mode;
- reason codes;
- dangerous flag;
- `trinityMayDecideAlone: false`;
- `directSideEffectsAllowed: false`;
- `TrinityIntentCapture`;
- `ACSIntentRequest`;
- warnings.

---

# Acceptance Criteria

Delivered:

- research, artifact, strategy mutation and execution intents are differentiated;
- dangerous requests are denied or routed through ACS;
- permitted intents generate an ACS object;
- Trinity does not decide alone;
- no strategy mutation, Hummingbot runtime access, backtest run, trading, secret access or treasury operation is implemented.
