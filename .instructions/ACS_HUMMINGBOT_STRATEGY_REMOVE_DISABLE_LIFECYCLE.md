# ACS Hummingbot Strategy Remove/Disable Lifecycle

Sprint: 76 - Hummingbot Strategy Remove/Disable Sandbox Lifecycle

Status: modeled and tested as sandbox-only lifecycle. No real Hummingbot runtime, connector config, API key, network, MCP, backtest, paper trading or live trading is touched.

---

# Lifecycle

```text
proposed
approved_for_sandbox
created
edited
disabled
removed
rolled_back
archived
```

---

# Rules

- `disable` is preferred before `remove`.
- `remove` is only valid from `disabled`.
- `remove` requires high or critical risk classification.
- `remove` requires rollback plan.
- `remove` must preserve audit/evidence.
- `remove` is logical/tombstone in this sandbox lifecycle unless a future sprint explicitly authorizes physical sandbox deletion.
- `remove` must never touch real runtime.
- `rollback` must be sandbox-only.

---

# Implemented Files

```text
src/hummingbot-sandbox-lifecycle.ts
src/fixtures/hummingbot-sandbox-lifecycle-fixtures.ts
src/schemas/hummingbot-sandbox-lifecycle.schema.yaml
tests/hummingbot-sandbox-lifecycle.test.mjs
```

---

# Sandbox Pilot Artifacts

Disable pilot:

```text
.instructions/acs/trading/hummingbot-sandbox/proposals/acs-rsi-sandbox-disable-pilot.json
```

Remove pilot:

```text
.instructions/acs/trading/hummingbot-sandbox/proposals/acs-rsi-sandbox-remove-pilot.json
```

Lifecycle proof:

```text
.instructions/acs/trading/hummingbot-sandbox/proofs/acs-rsi-sandbox-lifecycle-proof.md
```

Rollback verification:

```text
.instructions/acs/trading/hummingbot-sandbox/rollback/acs-rsi-sandbox-remove-rollback-verification.json
```

Console snapshot:

```text
.instructions/acs/trading/hummingbot-sandbox/console/acs-rsi-sandbox-lifecycle-console.txt
```

---

# Acceptance Criteria

Delivered:

- disable/remove modeled;
- sandbox remove does not delete evidence;
- rollback verification exists;
- runtime real remains untouched;
- remove is blocked unless disabled state, high risk, rollback plan and evidence preservation are present.
