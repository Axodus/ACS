# ACS Trinity Intake Boundary

Sprint: 68 - Trinity ACS Intake Boundary

Status: implemented as architecture contract. No Telegram, Hummingbot, MCP, shell, network or runtime execution integration is enabled by this sprint.

---

# Rule

Trinity must not act directly from Telegram.

All Telegram-originated requests must become an ACS intent request before any action is considered.

```text
Requester via Telegram
-> Trinity captures intent
-> Trinity sends ACSIntentRequest to ACS
-> ACS classifies, validates policy, risk, scope, gates and permissions
-> ACS returns decision/plan to Trinity
-> Trinity responds to requester
-> If authorized, Trinity executes only inside the ACS-approved mode
-> ACS records audit/evidence/proof/rollback/console
```

---

# Trinity Permissions At Intake

Trinity may:

- read the user request;
- classify the intent;
- create a `TrinityIntentCapture`;
- create or forward an `ACSIntentRequest`;
- suggest a report-only plan;
- respond with the ACS decision.

Trinity may not directly:

- write files;
- update `HEARTBEAT.md`;
- mutate runtime state;
- call Hummingbot;
- create/edit/remove strategies;
- run backtests;
- call MCP;
- call shell;
- access network;
- touch provider/exchange;
- touch API keys or secrets;
- deploy;
- trade;
- mutate treasury.

---

# Schemas

Implemented in:

```text
src/trinity-intake-boundary.ts
```

## TrinityIntentCapture

```ts
export interface TrinityIntentCapture {
  requestId: string
  source: "telegram_dm" | "telegram_group" | "cli" | "acs_console"
  requesterRef: string
  agentId: "trinity"
  nucleus: "trading"
  intentType:
    | "research_request"
    | "strategy_review"
    | "indicator_study"
    | "hummingbot_strategy_create"
    | "hummingbot_strategy_edit"
    | "hummingbot_strategy_remove"
    | "backtest_design"
    | "risk_review"
  requestedAction: string
  rawUserPromptRef: string
  requiresArtifact: boolean
  requiresStrategyMutation: boolean
  requiresExecution: boolean
  requiresNetwork: boolean
  requiresSecrets: boolean
}
```

## ACSIntentRequest

```ts
export interface ACSIntentRequest {
  requestId: string
  capturedAt: string
  intakeAgentId: "trinity"
  source: "telegram_dm" | "telegram_group" | "cli" | "acs_console"
  requesterRef: string
  nucleus: "trading"
  intentType: TrinityIntentType
  requestedAction: string
  rawUserPromptRef: string
  responseMode: "report_only" | "acs_routed" | "no_go"
  directSideEffectsAllowed: false
  requiredAcsGates: string[]
  blockReasons: TrinitySideEffectBlockReason[]
  hardConstraints: string[]
}
```

---

# Telegram Request To Allowed Response Mode

| Telegram request class | Allowed response mode | Direct side effects |
|---|---:|---:|
| research_request | report_only | No |
| strategy_review | report_only | No |
| indicator_study | report_only | No |
| hummingbot_strategy_create | acs_routed | No |
| hummingbot_strategy_edit | acs_routed | No |
| hummingbot_strategy_remove | acs_routed | No |
| backtest_design | acs_routed | No |
| risk_review | report_only | No |

Even when response mode is `report_only`, Trinity must not write artifacts from Telegram without ACS authorization.

---

# Hummingbot Path

Hummingbot mutation is a controlled technical mutation path.

Allowed future layers, in order:

1. intent capture;
2. ACS policy classification;
3. diff-only proposal;
4. sandbox write approval;
5. controlled tests;
6. manual approval;
7. operational integration review.

Current sprint implements only layers 1 and 2 as contracts.

---

# Block Reason Codes

Delivered reason codes:

- `telegram_direct_file_write_no_go`
- `telegram_direct_runtime_mutation_no_go`
- `telegram_direct_heartbeat_update_no_go`
- `telegram_direct_hummingbot_mutation_no_go`
- `telegram_direct_backtest_no_go`
- `telegram_direct_mcp_no_go`
- `telegram_direct_shell_no_go`
- `telegram_direct_network_no_go`
- `telegram_direct_provider_or_exchange_no_go`
- `telegram_direct_secret_access_no_go`
- `acs_policy_required`

---

# Acceptance Criteria

Delivered:

- Trinity boundary documented;
- Telegram request modeled as ACS intent;
- direct file write from Telegram is `No-Go`;
- direct runtime mutation from Telegram is `No-Go`;
- Hummingbot mutation from Telegram is `ACS-routed`;
- direct backtest/shell/MCP/network/secret/provider/exchange access is blocked;
- response mode is `report_only` or `acs_routed`;
- no pilot, Hummingbot, shell, MCP, network or API key action is implemented.
