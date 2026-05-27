# Proof Report: acs-rsi-sandbox-pilot

Request: `synthetic-sprint75-hb-create-001`

Capability: `trading.hummingbot.strategy.create_sandboxed`

Executor: `trinity`

Mode: `acs_sandbox_only`

Execution ticket: `acs-ticket-sprint75-sandbox-create`

---

# Strategy Artifact

```text
.instructions/acs/trading/hummingbot-sandbox/strategies/acs_rsi_sandbox_pilot.py
```

SHA-256:

```text
4757a96ee1bd6163fc332592bd8a255aa7c656fcd53b2705fe92289971fe2ed6
```

---

# Proof Statements

- Exactly one sandbox strategy source file was created.
- The file lives under `.instructions/acs/trading/hummingbot-sandbox/strategies/`.
- The file is not in `/mnt/d/Rede/Github/Axodus/tradingbot`.
- The file is not in `/mnt/d/Rede/Github/Axodus/hummingbot-api`.
- The file is not mounted into live Hummingbot.
- The file does not include connector config.
- The file does not include API keys or secrets.
- No Hummingbot API call was made.
- No Hummingbot MCP call was made.
- No real runtime was touched.
- No backtest was executed.
- No paper trading was executed.
- No live trading was executed.
- No service restart, deploy or package install was executed.

---

# Hashability

The strategy artifact can be verified by hashing the file content and comparing it with the sidecar/evidence hash.

---

# Rollbackability

Rollback is sandbox-only and consists of deleting the one sandbox strategy file. No live path is part of rollback.
