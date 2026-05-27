# ACS Product Layer

# Purpose

ACS Products are end-user-facing capabilities that may be contracted, enabled, licensed, or purchased.

---

# Product Access Inputs

Product access may depend on:
- wallet
- subscription
- NFT license
- marketplace purchase
- tenant offering
- governance permission
- user readiness state

---

# Product Rules

- Products must not bypass tenant restrictions.
- Products must not bypass governance permission.
- Products must not execute sensitive actions without explicit approval.
- Products must emit telemetry and receipts for material access or state decisions.
- Products must remain isolated from Core authority unless explicitly granted by policy.

---

# Examples

- Trading Ignition
- MCP products
- personal bot-trading
- user-facing trading assistants
- personal automation agents
- premium strategy tools
- productivity agents
- course assistants
- marketplace agent products

---

# Current Implementation

- `src/product-access-registry.ts`
- `product.trading-ignition` in `src/capability-registry.ts`

