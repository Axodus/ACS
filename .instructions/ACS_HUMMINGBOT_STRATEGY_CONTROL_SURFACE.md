# ACS Hummingbot Strategy Control Surface

Sprint: 71 - Hummingbot Strategy Control Surface Inventory

Status: inventory only. No Hummingbot file was changed, no bot was started, no backtest was executed, no exchange connector was opened, no API key was read, no network endpoint was called and no runtime command was executed.

---

# Objective

Map what it means to create, edit, disable or remove Hummingbot strategies in the Axodus environment before Trinity can ever become an ACS-authorized executor.

This document is a safety boundary for future sprints. It is not an authorization to mutate Hummingbot.

---

# Inventory Method

Performed static path inventory only:

- listed repository paths and filenames;
- did not inspect secret/config contents;
- did not call Hummingbot API endpoints;
- did not call MCP Hummingbot tools;
- did not run bot, backtest, Docker, compose, shell scripts or setup commands;
- did not touch connector/account/wallet/gateway secrets.

Observed but not interacted with:

- a `hummingbot-api` process is already running in the host environment. ACS must treat it as external live runtime and forbidden until a later controlled integration sprint.

---

# Environment Repositories Observed

| Path | Role | Inventory classification |
|---|---|---|
| `/mnt/d/Rede/Github/Axodus/tradingbot` | Hummingbot source/runtime-like repository | Primary strategy/control surface |
| `/mnt/d/Rede/Github/Axodus/hummingbot-api` | Hummingbot HTTP/API wrapper and bot orchestration surface | High-risk control API surface |
| `/mnt/d/Rede/Github/Axodus/mcp/hummingbot_mcp` | MCP wrapper for Hummingbot API | Forbidden for execution in current ACS phase |
| `/mnt/d/Rede/Github/Axodus/condor/mcp_servers/hummingbot_api` | Condor MCP wrapper for Hummingbot API | Forbidden for execution in current ACS phase |
| `/mnt/d/Rede/Github/Axodus/quants-lab` | Research/backtesting/controllers lab | Candidate sandbox/research surface only |

---

# Path Matrix

| Surface | Observed paths | Meaning | Current ACS status |
|---|---|---|---|
| Strategy scripts | `/mnt/d/Rede/Github/Axodus/tradingbot/scripts/**/*.py` | Script strategies and examples that can contain executable trading logic | Read-only; future diff-only candidate |
| Strategy source/controllers | `/mnt/d/Rede/Github/Axodus/tradingbot/controllers/**/*.py` | Controller strategy source files, including directional, generic and market making controllers | Read-only; future diff-only candidate |
| Hummingbot API bot scripts | `/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/scripts/**/*.py` | API-managed bot scripts | Read-only; no direct mutation |
| Hummingbot API controllers | `/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/controllers/**/*.py` | API-managed controller source files | Read-only; no direct mutation |
| Quants lab controllers | `/mnt/d/Rede/Github/Axodus/quants-lab/controllers/**/*.py` | Research controllers and strategy experiments | Candidate sandbox after explicit approval |
| Quants lab backtesting tasks | `/mnt/d/Rede/Github/Axodus/quants-lab/tasks/backtesting/**/*.py`, `/mnt/d/Rede/Github/Axodus/quants-lab/core/backtesting/**/*.py` | Backtesting engines/tasks | Read-only; no execution |
| Hummingbot strategy config placeholders | `/mnt/d/Rede/Github/Axodus/tradingbot/conf/strategies/`, `/mnt/d/Rede/Github/Axodus/tradingbot/conf/scripts/`, `/mnt/d/Rede/Github/Axodus/tradingbot/conf/controllers/` | Config directories for strategies/scripts/controllers | Forbidden for live config mutation; future sandbox copy candidate only |
| Hummingbot templates | `/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/templates/*.yml` | Template config files | Read-only reference candidate; no live mutation |
| Connector config area | `/mnt/d/Rede/Github/Axodus/tradingbot/conf/connectors/` | Connector configuration namespace | Forbidden |
| Exchange connector source | `/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/connector/**` | Exchange, gateway, auth and market connector implementation | Forbidden |
| API connector/accounts routes | `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/connectors.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/accounts.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/accounts_service.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/unified_connector_service.py` | Account and connector API surfaces | Forbidden |
| API trading routes/services | `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/trading.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/trading_service.py` | Trading action API surface | Forbidden |
| API bot orchestration | `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/bot_orchestration.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/bots_orchestrator.py` | Bot lifecycle control | Forbidden |
| API backtesting | `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/backtesting.py`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/backtesting_service.py` | Backtest execution surface | Forbidden for execution; read-only docs/code reference only |
| Docker/compose | `/mnt/d/Rede/Github/Axodus/tradingbot/Dockerfile`, `/mnt/d/Rede/Github/Axodus/tradingbot/docker-compose.yml`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/Dockerfile`, `/mnt/d/Rede/Github/Axodus/hummingbot-api/docker-compose.yml`, `/mnt/d/Rede/Github/Axodus/quants-lab/docker-compose-hbot.yml`, `/mnt/d/Rede/Github/Axodus/quants-lab/docker-compose-db.yml`, `/mnt/d/Rede/Github/Axodus/quants-lab/docker-compose-tasks.yml` | Runtime/container orchestration | Forbidden |
| Runtime databases | `/mnt/d/Rede/Github/Axodus/hummingbot-api/database/**`, possible `*.db`, `*.sqlite` files | Persistent bot/API state and trading records | Forbidden |
| Logs/runtime state | expected `logs/`, archived bots, executor logs, runtime state files | Operational evidence and mutable runtime state | Forbidden |
| MCP Hummingbot wrappers | `/mnt/d/Rede/Github/Axodus/mcp/hummingbot_mcp/**`, `/mnt/d/Rede/Github/Axodus/condor/mcp_servers/hummingbot_api/**` | Tooling surface that can inspect/operate Hummingbot API | Forbidden in current ACS phase |
| Quants lab config | `/mnt/d/Rede/Github/Axodus/quants-lab/conf/conf_client.yml` | Research/lab client config | Forbidden until sanitized |

---

# Operation Matrix

| Operation | Path class | Required future gate | Current decision |
|---|---|---|---|
| Generate strategy diff | Source/controller/script candidate path | ACS intent classification, policy check, no-write diff mode, audit receipt | Candidate: low/medium risk |
| Create strategy file in sandbox | Dedicated sandbox path only, not live Hummingbot path | Sandbox path allowlist, approval, execution ticket, test plan | Blocked now; future medium risk |
| Edit strategy in sandbox | Dedicated sandbox path only | Sandbox path allowlist, approval, execution ticket, test plan | Blocked now; future medium risk |
| Remove strategy in sandbox | Dedicated sandbox path only | Human review, snapshot, rollback plan, execution ticket | Blocked now; medium/high risk |
| Change live strategy config | `conf/strategies`, `conf/scripts`, `conf/controllers`, API config routes | Governance/operator approval, maintenance window, rollback, emergency stop ready | Blocked; high risk |
| Restart bot | API bot orchestration, Docker/compose, runtime process | Governance/operator approval, runtime safety checklist, ticket | Blocked; high risk |
| Run backtest | API backtesting routes/services or quants-lab task runners | Sandbox data policy, no-network mode, resource limits, ticket | Blocked; high risk |
| Paper trade | Hummingbot runtime/API trading surface | Governance maturity, account isolation, sandbox exchange, ticket | No-Go now; high risk |
| Live trade | Trading API, real connector, exchange account | Future governance, license, risk engine, emergency stop, audited execution | No-Go; critical |
| Access connectors/API keys | connector configs, account routes/services, wallet/gateway/auth files | Secret storage KMS/Vault contract and explicit authorization | No-Go; critical |
| Access treasury/funds | any account/wallet/gateway/trading transfer surface | Not an ACS authority | Never via ACS |

---

# Risk Matrix

| Surface/operation | Risk | Why |
|---|---|---|
| Diff-only strategy proposal | Low/medium | No write if enforced; still can propose unsafe trading logic. |
| Strategy source read-only review | Low/medium | No mutation; may reveal implementation details but not secrets if sensitive paths are excluded. |
| Sandbox strategy create/edit | Medium | Technical mutation, but isolated if path allowlist and tests exist. |
| Sandbox strategy remove | Medium/high | Deletion requires snapshot and rollback. |
| Live config edit | High | Can alter active bot behavior and trading parameters. |
| Bot restart/runtime orchestration | High | Can interrupt operations or trigger lifecycle side effects. |
| Backtest execution | High | Can consume compute/network/data and may mutate outputs/state. |
| Paper trading | High | Still execution path through bot and connector abstraction. |
| Live trading | Critical | Real order placement and possible financial loss. |
| Connector/account/API key access | Critical | Secret exposure and account compromise risk. |
| Gateway/wallet/treasury path | Critical | Potential custody/transfer implications. |

---

# Forbidden Paths

These paths are forbidden for Trinity and ACS mutation in the current phase. Many are also forbidden for content reads unless a later sprint explicitly introduces a sanitized inspection adapter.

```text
/mnt/d/Rede/Github/Axodus/tradingbot/conf/connectors/**
/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/connector/**
/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/core/gateway/**
/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/user/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/wallet*/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/account*/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/credential*/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/secret*/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/key*/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/logs/**
/mnt/d/Rede/Github/Axodus/tradingbot/**/*.db
/mnt/d/Rede/Github/Axodus/tradingbot/**/*.sqlite
/mnt/d/Rede/Github/Axodus/tradingbot/docker-compose*.yml
/mnt/d/Rede/Github/Axodus/tradingbot/Dockerfile
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/trading.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/connectors.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/accounts.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/bot_orchestration.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/docker.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/gateway*.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/trading_service.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/accounts_service.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/unified_connector_service.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/bots_orchestrator.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/docker_service.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/services/gateway*.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/database/**
/mnt/d/Rede/Github/Axodus/hummingbot-api/docker-compose*.yml
/mnt/d/Rede/Github/Axodus/hummingbot-api/Dockerfile
/mnt/d/Rede/Github/Axodus/mcp/hummingbot_mcp/**
/mnt/d/Rede/Github/Axodus/condor/mcp_servers/hummingbot_api/**
/mnt/d/Rede/Github/Axodus/quants-lab/conf/conf_client.yml
/mnt/d/Rede/Github/Axodus/quants-lab/core/services/**
/mnt/d/Rede/Github/Axodus/quants-lab/core/data_sources/**
/mnt/d/Rede/Github/Axodus/quants-lab/docker-compose*.yml
/mnt/d/Rede/Github/Axodus/quants-lab/Dockerfile
```

Forbidden content patterns:

```text
.env
*credential*
*secret*
*private*
*token*
*password*
*api_key*
*api_secret*
*wallet*
*account*
*connector*
*.db
*.sqlite
logs/
runtime/
state/
archive/
```

---

# Allowed Candidate Paths

These are candidates only. They are not writable yet. They may become eligible for diff-only review or sandbox-copy workflows after explicit ACS gates.

```text
/mnt/d/Rede/Github/Axodus/tradingbot/scripts/**/*.py
/mnt/d/Rede/Github/Axodus/tradingbot/controllers/generic/**/*.py
/mnt/d/Rede/Github/Axodus/tradingbot/controllers/market_making/**/*.py
/mnt/d/Rede/Github/Axodus/tradingbot/controllers/directional_trading/**/*.py
/mnt/d/Rede/Github/Axodus/tradingbot/hummingbot/templates/*.yml
/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/scripts/**/*.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/controllers/generic/**/*.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/controllers/market_making/**/*.py
/mnt/d/Rede/Github/Axodus/hummingbot-api/bots/controllers/directional_trading/**/*.py
/mnt/d/Rede/Github/Axodus/quants-lab/controllers/**/*.py
/mnt/d/Rede/Github/Axodus/quants-lab/research_notebooks/**/*.ipynb
/mnt/d/Rede/Github/Axodus/quants-lab/research_notebooks/**/*.py
```

Required before any candidate becomes writable:

- dedicated ACS sandbox root;
- tenant/user/capability context;
- path allowlist and path traversal guard;
- diff preview;
- no secret scan result;
- policy matrix approval;
- risk classification;
- audit receipt;
- rollback/snapshot plan;
- explicit execution ticket;
- tests in isolated sandbox.

---

# Hummingbot Command Surface

Command-like surfaces identified by path only:

| Surface | Path | Current status |
|---|---|---|
| Hummingbot CLI entry | `/mnt/d/Rede/Github/Axodus/tradingbot/bin/hummingbot.py` | Forbidden |
| Quickstart | `/mnt/d/Rede/Github/Axodus/tradingbot/bin/hummingbot_quickstart.py` | Forbidden |
| Install/setup scripts | `/mnt/d/Rede/Github/Axodus/tradingbot/install`, `/mnt/d/Rede/Github/Axodus/tradingbot/setup.py`, `/mnt/d/Rede/Github/Axodus/tradingbot/Makefile` | Forbidden |
| Docker/compose runtime | `Dockerfile`, `docker-compose*.yml` in Hummingbot-related repos | Forbidden |
| Hummingbot API routes | `/mnt/d/Rede/Github/Axodus/hummingbot-api/routers/*.py` | Forbidden for calls |
| Hummingbot API services | `/mnt/d/Rede/Github/Axodus/hummingbot-api/services/*.py` | Forbidden for calls |
| MCP tools | `/mnt/d/Rede/Github/Axodus/mcp/hummingbot_mcp/tools/*.py`, `/mnt/d/Rede/Github/Axodus/condor/mcp_servers/hummingbot_api/tools/*.py` | Forbidden |
| Quants lab task runners | `/mnt/d/Rede/Github/Axodus/quants-lab/tasks/**/*.py` | Forbidden for execution |

---

# Current ACS Policy Consequence

For Sprint 71 and the current Tenant-Aware Core MVP phase:

- `strategy_diff_proposal` may remain `allow_diff_only` by contract;
- `strategy_sandbox_write` remains `pending_approval`;
- `strategy_disable_request` remains `pending_approval`;
- `strategy_remove_request` remains `requires_human_review`;
- `backtest_dry_run` remains `requires_human_review`;
- `paper_trading_request`, `live_trading_request`, `secret_access_request`, `treasury_request` remain blocked.

No existing ACS decision should be expanded by this inventory.

---

# Acceptance Criteria

Delivered:

- Hummingbot control surface mapped;
- strategy, config, script, controller, backtest, logs, credentials, connector, runtime, database, Docker/compose and command surfaces identified;
- sensitive paths marked forbidden;
- allowed candidate paths separated from forbidden paths;
- secrets/connectors marked as forbidden;
- no Hummingbot mutation performed;
- no API key/connector content read;
- no bot/backtest/API/MCP/network command executed.
