# ACS Trinity Roundtrip Protocol

Sprint: 70 - Trinity ↔ ACS Roundtrip Protocol

Status: implemented as architecture contract. No real execution, strategy mutation, Hummingbot runtime call, shell call, MCP call, network access, provider access, API key access or treasury action is enabled by this sprint.

---

# Rule

Trinity never treats Telegram as an execution channel.

```text
Requester sends message to Trinity
-> Trinity creates TrinityIntentCapture
-> Trinity sends ACSIntentRequest
-> ACS returns ACSDecision
-> Trinity responds to requester with decision, plan or block
-> If execution is ever authorized, ACS must issue an ExecutionPlan and ExecutionTicket
-> Trinity may only act with a valid ACS ExecutionTicket
```

Absence of an ACS response is not permission. ACS failure, missing fields, invalid agent, invalid nucleus or incomplete decision means `deny`.

---

# Implemented Files

```text
src/trinity-acs-roundtrip-protocol.ts
src/fixtures/trinity-roundtrip-fixtures.ts
src/schemas/trinity-acs-roundtrip.schema.yaml
tests/trinity-acs-roundtrip-protocol.test.mjs
```

---

# ACSDecision

```ts
export interface ACSDecision {
  requestId: string
  decision:
    | "allow_report_only"
    | "route_to_artifact_flow"
    | "allow_diff_only"
    | "pending_approval"
    | "deny"
    | "blocked_by_policy"
    | "blocked_by_freeze"
    | "requires_human_review"
  agentId: "trinity"
  nucleus: "trading"
  allowedModes: string[]
  blockedActions: string[]
  reasonCodes: string[]
  requiredNextStep?: string
  executionTicketRequired: boolean
  auditRequired: boolean
  evidenceRequired: boolean
}
```

---

# TrinityUserResponse

```ts
export interface TrinityUserResponse {
  requestId: string
  agentId: "trinity"
  nucleus: "trading"
  channel: "telegram_dm" | "telegram_group" | "cli" | "acs_console"
  requesterRef: string
  responseType: "decision" | "plan" | "block"
  decision: ACSDecision["decision"]
  message: string
  allowedModes: string[]
  blockedActions: string[]
  reasonCodes: string[]
  requiredNextStep?: string
  executionTicketRequired: boolean
  executionTicketPresent: boolean
  canExecute: false
}
```

`canExecute` remains `false` in this sprint. The contract records whether a valid ticket is present, but no write/execution implementation is enabled.

---

# Decision Mapping

| Trading intent | ACS decision | Allowed mode | Ticket required |
|---|---|---|---:|
| `research_only` | `allow_report_only` | `report_only` | No |
| `artifact_request` | `route_to_artifact_flow` | `acs_artifact_flow` | No |
| `strategy_diff_proposal` | `allow_diff_only` | `diff_only` | No |
| `strategy_sandbox_write` | `pending_approval` | `approval_required` | Yes |
| `strategy_disable_request` | `pending_approval` | `approval_required` | Yes |
| `strategy_remove_request` | `requires_human_review` | `human_review_only` | Yes |
| `backtest_design` | `allow_report_only` | `report_only` | No |
| `backtest_dry_run` | `requires_human_review` | `human_review_only` | Yes |
| `paper_trading_request` | `blocked_by_policy` | none | No |
| `live_trading_request` | `blocked_by_policy` | none | No |
| `secret_access_request` | `blocked_by_policy` | none | No |
| `treasury_request` | `blocked_by_policy` | none | No |

---

# Reason Codes

| Code | Meaning |
|---|---|
| `acs_default_deny` | ACS failed, did not respond or could not validate the decision object. |
| `acs_missing_decision` | No ACSDecision was available. Absence of response is not permission. |
| `acs_required_field_missing` | ACSDecision is incomplete or invalid. |
| `telegram_execution_channel_blocked` | Telegram cannot become a direct execution channel. |
| `execution_ticket_required` | The requested mode would require an ACS-issued execution ticket. |
| `execution_ticket_missing` | No valid execution ticket was present for the request. |
| `policy_denied` | The current ACS policy blocks this request. |
| `freeze_active` | A freeze/emergency condition blocks the request. |
| `human_review_required` | Human review is required before any further gate can be evaluated. |
| `report_only_allowed` | Trinity may return a report-only response. |
| `artifact_flow_required` | Artifact creation must route through the ACS artifact flow. |
| `diff_only_allowed` | Only a no-write diff proposal is allowed. |
| `approval_required` | Operator, governance or tenant approval is required. |
| `audit_required` | ACS audit trail is required. |
| `evidence_required` | Evidence/proof metadata is required. |

---

# Hard Constraints

- Trinity cannot interpret missing ACS response as permission.
- ACS failure defaults to `deny`.
- Missing mandatory `ACSDecision` fields default to `deny`.
- Telegram is never a direct execution channel.
- Execution-capable modes require an ACS ticket.
- This sprint does not write files, update heartbeat, mutate runtime, call Hummingbot, run backtests, call MCP, call shell, access network, touch provider/exchange, touch API keys, place orders, trade or mutate treasury.

---

# Acceptance Criteria

Delivered:

- roundtrip documented;
- `ACSDecision` contract added;
- `TrinityUserResponse` contract added;
- roundtrip fixtures added;
- reason code table added;
- default deny behavior implemented;
- missing ACS response and incomplete ACS decision return `deny`;
- Trinity can produce blocked responses for requesters;
- execution-capable requests require an ACS ticket;
- tests prove no direct execution is introduced.
