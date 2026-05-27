# ACS Hummingbot Strategy Policy

Sprint: 72 - Hummingbot Strategy Policy and Capability Registry

Status: policy/capability registry only. No Hummingbot file is edited, no strategy is created, no sandbox mutation is enabled, no paper trading is enabled, no live trading is enabled, no connector config is opened and no secret is accessible.

---

# Objective

Define ACS-specific capabilities and policy decisions for Hummingbot strategy work before Trinity can ever become an ACS-authorized executor.

This policy wraps the Sprint 71 control surface inventory and the Sprint 70 Trinity roundtrip protocol.

---

# Registry Files

```text
.instructions/acs/trading/hummingbot-capabilities.yaml
.instructions/acs/trading/hummingbot-strategy-policy.yaml
```

These files are normative planning artifacts. They are not runtime execution permissions.

---

# Capabilities

| Capability | Initial decision | Automation level | Trinity role |
|---|---|---|---|
| `trading.hummingbot.strategy.research` | Go | assisted | intake, analysis, report-only |
| `trading.hummingbot.strategy.diff_proposal` | Limited Go | manual_approval | intake, no-write diff proposal after ACS decision |
| `trading.hummingbot.strategy.create_sandboxed` | Pending approval | manual_approval | conditional executor only with ACS ticket |
| `trading.hummingbot.strategy.edit_sandboxed` | Pending approval | manual_approval | conditional executor only with ACS ticket |
| `trading.hummingbot.strategy.disable_sandboxed` | Pending approval | manual_approval | conditional executor only with ACS ticket |
| `trading.hummingbot.strategy.remove_sandboxed` | High risk / pending approval | manual_approval | conditional executor only with ACS ticket and human review |
| `trading.hummingbot.strategy.backtest_design` | Go | assisted | report-only design |
| `trading.hummingbot.strategy.backtest_dry_run` | Caution | manual_approval | no execution until future sandbox gate |
| `trading.hummingbot.strategy.paper_trade` | No-Go | blocked | no execution |
| `trading.hummingbot.strategy.live_trade` | No-Go | blocked | no execution |

---

# Policy Rules

Initial ACS behavior:

- research and backtest design can be answered as report-only;
- diff proposal can be allowed only as no-write diff, with audit/evidence;
- sandboxed create/edit/disable require approval and an ACS execution ticket;
- sandboxed remove requires human review, approval, rollback plan and ticket;
- backtest dry run remains caution and cannot execute in this sprint;
- paper trading remains blocked;
- live trading remains blocked;
- secrets remain blocked;
- connector configs remain blocked;
- runtime, bot lifecycle, Docker/compose, MCP and Hummingbot API calls remain blocked.

---

# Trinity Executor Registration

Trinity is registered only as a conditional executor:

- allowed to classify and route Telegram requests into ACS;
- allowed to produce report-only responses when ACS returns `allow_report_only`;
- allowed to prepare no-write diff proposals when ACS returns `allow_diff_only`;
- not allowed to act on missing ACS response;
- not allowed to write files without explicit sandbox capability, approval and ticket;
- not allowed to touch live Hummingbot runtime;
- not allowed to access secrets, connector configs, accounts, wallets, provider, exchange, network, MCP or treasury.

---

# Hard Constraints

- Paper trading remains blocked.
- Live trading remains blocked.
- Secrets remain blocked.
- Connector configs remain blocked.
- No real file is edited in this sprint.
- No Hummingbot bot/backtest/API/MCP/network command is executed.

---

# Acceptance Criteria

Delivered:

- Hummingbot capability registry exists;
- Hummingbot strategy policy YAML exists;
- dangerous actions are marked No-Go;
- sandboxed mutations require approval and ticket;
- Trinity is explicitly registered as a conditional executor;
- no real strategy, config, connector, secret, runtime or API mutation is enabled.
