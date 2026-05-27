# ACS Consumption Model

# Purpose

ACS is a tenant-aware operational intelligence layer for the Axodus ecosystem.

Trading Ignition is an important ACS Product and Service use case, but it is not the full ACS identity.

---

# Consumption Levels

## Core

ACS Core is always active inside Axodus.

Responsibilities:
- ecosystem intelligence
- tenant health monitoring
- governance and compliance checks
- risk and policy violation detection
- telemetry and receipt generation
- constitutional standing support
- operational recommendations

Core ACS recommends, validates, monitors, and prepares workflows. It must not autonomously execute high-risk actions while Governance is still immature.

## Service

ACS Services are tenant-enabled capabilities for DAO Tenants, subDAOs, partners, and product tenants.

Service access depends on:
- tenant permissions
- federation tier
- tenant license/status
- governance status
- enabled service list
- tenant restrictions

Every service must run inside a tenant context.

## Product

ACS Products are user-facing tools or marketplace/license/subscription products.

Product access may depend on:
- wallet
- subscription
- NFT license
- marketplace purchase
- tenant offering
- governance permission
- user readiness state

---

# Automation Boundary

Current ACS automation posture:
- monitoring allowed
- validation allowed
- recommendations allowed
- guided workflows allowed
- simulation and planning allowed
- receipts and telemetry required
- sensitive execution requires manual approval
- autonomous execution is not allowed for high-risk workflows

Full autonomous execution depends on future Governance maturity.

---

# Inspection Layer

ACS exposes read-only inspection commands for operators and AxodusAPP:

- `npm run acs -- capabilities`
- `npm run acs -- capabilities --level core`
- `npm run acs -- capabilities --level service`
- `npm run acs -- capabilities --level product`
- `npm run acs -- tenant-services`
- `npm run acs -- tenant-services --tenant <tenantId>`
- `npm run acs -- product-access`
- `npm run acs -- product-access --wallet <walletAddress>`
- `npm run acs -- product-access --product <productId>`
- `npm run acs -- policy-matrix`
- `npm run acs -- policy-check --capability <capabilityId> --tenant <tenantId>`

These commands are inspection-only. They must not start workflows, trade, call CEX APIs, mutate tenant state, mutate user license state, bypass governance, or trigger automation.

---

# HTTP Exposure

ACS exposes the same inspection layer over a GET-only JSON HTTP API for AxodusAPP.

Default local base URL:
- `http://127.0.0.1:8788/acs`

Required boundary:
- no automation
- no trading execution
- no CEX calls
- no tenant mutation
- no license mutation
- no API secrets
- no governance bypass
