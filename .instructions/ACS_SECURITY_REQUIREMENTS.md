# ACS Security Requirements

# Purpose

ACS security is mandatory because Trading Ignition touches wallet eligibility, NFT licenses, exchange APIs, risk limits, and trading automation.

---

# Non-Negotiables

- no withdrawal-enabled API keys
- no plaintext API secrets
- no API secrets in frontend storage
- no API secrets in logs
- no custody of user funds
- no production contract addresses invented in code
- no silent strategy activation
- no hidden execution
- no governance bypass
- no risk-engine bypass

---

# API Key Storage

API key storage must be encrypted before real exchange integration.

Until encrypted storage is implemented, use mocks or local development fixtures only when clearly marked as mock.

Current API safety contract:
- `src/api-safety.ts` blocks withdrawal and transfer permissions.
- UI must tell users to disable withdrawal permissions before connecting an API key.
- UI must recommend IP permission/allowlist and explain that only approved execution IPs should be allowed.
- UI must tell users never to expose API secrets in browser storage, frontend logs, or plaintext logs.

---

# Execution Safety

Trading execution must require:

- `READY` operational state
- valid license
- validated API
- approved preset
- risk policy clearance
- explicit user activation
- telemetry
- receipts

---

# Emergency Controls

Emergency stop must be available to:

- user
- ACS
- governance
- risk engine

Emergency stop must block new strategy activation and preserve audit records.
