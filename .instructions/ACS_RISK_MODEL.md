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
- use restricted permissions
- enable futures only when required and approved
- be stored securely
- never appear in frontend logs
- never appear in browser storage
- never appear in plaintext backend logs

---

# Public Default

Public users default to conservative operation.

Any higher-risk preset requires explicit governance and risk clearance.

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

