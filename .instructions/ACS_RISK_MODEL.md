# ACS Risk Model

# Purpose

ACS risk controls protect users, Axodus, governance, and the ecosystem from unsafe automation.

Capital preservation and operational discipline take priority over speed, yield, or growth.

---

# Minimum Controls

- max capital allocation
- max leverage
- max daily loss
- max drawdown
- max open positions
- abnormal volatility stop
- API error stop
- repeated failed order stop
- emergency stop
- user manual stop
- governance emergency stop

---

# API Safety

Exchange API keys must:

- never allow withdrawals
- never allow transfer or universal transfer permissions
- use restricted permissions
- use IP permission/allowlist whenever the exchange supports it
- enable futures only when required and approved
- be stored securely
- never appear in frontend logs
- never appear in browser storage
- never appear in plaintext backend logs

User-facing API setup must explicitly recommend:
- disable withdrawal permissions
- enable IP permission/allowlist
- grant only the minimum permissions required by the selected ACS preset

---

# Public Default

Public users default to conservative operation.

Any higher-risk preset requires explicit governance and risk clearance.

Current preset contract:
- `src/risk-preset.ts` defines `conservative`, `balanced`, and `experimental`.
- `conservative` is the public default.
- conservative limits: max $100 capital, max 1x leverage, max 2% daily loss, max 5% drawdown, max 1 open position, no futures, no margin.
- `balanced` requires governance approval and internal validation before public use.
- `experimental` is internal-only.
- preset activation must pass both preset-selection policy and risk-limit evaluation.

---

# Performance Records

ACS must track:

- capital used
- realized PnL
- unrealized PnL
- drawdown
- win rate
- loss rate
- average trade duration
- trade count
- fees
- funding fees
- liquidation risk events
- emergency stops
- strategy version
- bot version
- exchange used
- configuration preset

Marketing and user communication must rely on documented operation, not promises.
