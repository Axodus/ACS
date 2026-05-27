# OpenClaw ACS Trinity Hummingbot Readiness Review

Sprint: 79 - Trinity ACS/Hummingbot Readiness Review

Status: completed. This review consolidates Sprints 68-78 and defines the next permission level for Trinity and the ACS Hummingbot sandbox track.

---

# Positioning

Trinity is now correctly positioned as:

```text
Telegram-facing trading agent
-> ACS-routed intent handler
-> report/research responder
-> diff-only strategy proposer
-> sandbox strategy executor
-> never direct runtime actor without ACS approval
```

Hummingbot now has a safe track:

```text
research
-> diff-only proposal
-> sandbox create/edit
-> sandbox disable/remove
-> validation gate
-> readiness review
```

---

# Evidence Base

| Sprint | Evidence |
|---|---|
| 68 | `.instructions/ACS_TRINITY_INTAKE_BOUNDARY.md`, `src/trinity-intake-boundary.ts` |
| 69 | `.instructions/ACS_TRADING_INTENT_CLASSIFIER.md`, `src/trading-intent-classifier.ts` |
| 70 | `.instructions/ACS_TRINITY_ROUNDTRIP_PROTOCOL.md`, `src/trinity-acs-roundtrip-protocol.ts` |
| 71 | `.instructions/ACS_HUMMINGBOT_STRATEGY_CONTROL_SURFACE.md` |
| 72 | `.instructions/ACS_HUMMINGBOT_STRATEGY_POLICY.md`, `.instructions/acs/trading/hummingbot-capabilities.yaml`, `.instructions/acs/trading/hummingbot-strategy-policy.yaml` |
| 73 | `.instructions/ACS_TRINITY_HUMMINGBOT_DIFF_ONLY_FLOW.md`, `src/trinity-hummingbot-diff-only-flow.ts` |
| 74 | `.instructions/ACS_HUMMINGBOT_STRATEGY_SANDBOX_WORKSPACE.md`, `.instructions/acs/trading/hummingbot-sandbox/manifest.yaml` |
| 75 | `.instructions/ACS_TRINITY_STRATEGY_SANDBOX_PILOT.md`, `.instructions/acs/trading/hummingbot-sandbox/strategies/acs_rsi_sandbox_pilot.py` |
| 76 | `.instructions/ACS_HUMMINGBOT_STRATEGY_REMOVE_DISABLE_LIFECYCLE.md`, `src/hummingbot-sandbox-lifecycle.ts` |
| 77 | `.instructions/ACS_HUMMINGBOT_STRATEGY_VALIDATION_GATE.md`, `src/hummingbot-strategy-validation-gate.ts` |
| 78 | `.instructions/ACS_TRINITY_TELEGRAM_RESPONSE_CONTRACT.md`, `src/trinity-telegram-response-contract.ts` |

Validation evidence:

```text
Latest suite: 147/147 tests passing after Sprint 78.
```

---

# Readiness Decision Matrix

| Capability | Decision | Notes |
|---|---|---|
| Telegram intake | Go | Trinity may capture and classify Telegram intent, but not execute side effects directly. |
| ACS roundtrip | Go | Intent -> ACSDecision -> Trinity response is modeled with default deny. |
| research report | Go | `allow_report_only`; Telegram response allowed. |
| artifact request | Limited Go | Route to ACS artifact flow with output allowlist, proof, rollback and evidence. |
| Hummingbot diff-only proposal | Go | Repeatable as no-write diff artifact with sidecar/proof/evidence. |
| Hummingbot sandbox create/edit | Limited Go | Repeatable only inside ACS sandbox, with approval/ticket, proof, rollback and validation gate. |
| Hummingbot sandbox disable/remove | Limited Go | Disable preferred; remove is high risk, logical/tombstone, rollback-required and evidence-preserving. |
| Hummingbot strategy validation | Go | Static gate implemented; valid sandbox strategy passes; unsafe patterns fail. |
| Hummingbot real runtime mutation | No-Go | No live Hummingbot files, runtime, bot lifecycle, Docker/compose or API calls. |
| paper trading | No-Go | Still blocked; no connector/runtime execution permitted. |
| live trading | No-Go | Still blocked; no real order placement. |
| MCP | No-Go | Hummingbot MCP wrappers remain forbidden. |
| network | No-Go | No network calls from Trinity/Hummingbot sandbox path. |
| secrets | No-Go | API keys, connector configs, tokens, private keys and secrets remain blocked. |
| production | No-Go | No deploy, service restart, production mutation or live runtime mounting. |

---

# Permission Outcome

Trinity may advance to:

- repeat diff-only proposals;
- repeat sandbox create/edit pilots inside ACS sandbox;
- repeat sandbox disable/remove lifecycle operations inside ACS sandbox;
- start backtest dry-run design as report-only design, not execution;
- produce Telegram responses using the Sprint 78 response contract;
- reference output/evidence/proof/rollback refs when ACS produced them.

Trinity remains blocked from:

- real Hummingbot runtime mutation;
- live Hummingbot strategy paths;
- Hummingbot API calls;
- Hummingbot MCP calls;
- paper trading;
- live trading;
- network;
- shell;
- connector configs;
- API keys/secrets;
- package install;
- service restart;
- deploy/production mutation.

---

# Recommended Next Block

Recommended next block:

1. Backtest dry-run design contract, report-only.
2. Backtest input manifest, sandbox-only and no execution.
3. Backtest safety validation gate.
4. Optional offline fixture-based dry-run simulation, only if no network/runtime/API is required.
5. Promotion-readiness review for sandbox artifacts.

Do not start paper trading, live trading or real Hummingbot integration in the next block.

---

# No-Go Preservation

These areas remain explicitly No-Go:

- `hummingbot real runtime mutation`;
- `paper trading`;
- `live trading`;
- `MCP`;
- `network`;
- `secrets`;
- `production`;
- `treasury`;
- `withdrawals`;
- `connector configs`;
- `API keys`.

---

# Final Readiness Statement

ACS can now treat Trinity as an ACS-routed, Telegram-facing trading agent that can safely respond, propose diffs and operate only inside the ACS Hummingbot sandbox when explicit ACS gates are satisfied.

ACS must not treat Trinity as a real Hummingbot runtime actor yet.
