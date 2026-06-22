# ACS Security

Last updated: 2026-06-22

## Security Posture

ACS security in the current phase is based on:
- local-first operation
- config-first behavior
- read-only/mock surfaces where applicable
- explicit no-go boundaries
- execution-gated workflows
- non-production runtime posture

ACS does not currently hold mutation authority.

## Current Non-Negotiables

- no real ACS provisioning
- no real credentials
- no wallet/signing
- no treasury movement
- no trading execution
- no settlement
- no payouts
- no billing execution
- no production DB
- no production APIs
- no external providers in production
- no plaintext secrets
- no secret exposure in frontend, logs, receipts, or telemetry
- no governance bypass
- no hidden execution

## Current Execution Security

Confirmed local evidence:
- runtime blocked actions include:
- `treasury.transfer`
- `wallet.sign`
- `provider.execute.production`
- `permissions.escalate`
- command execution policy defaults to disabled
- guarded MCP execution remains blocked by contract
- Trinity/Telegram direct mutation, shell, network, provider, exchange, and secret access remain blocked

Constraint:
- these boundaries must remain closed until later approved requests add explicit evidence and authority

## Current Secret Safety

Confirmed local evidence:
- mock secret storage returns opaque `secretRef`
- mock reads return redacted values only
- receipts redact secret-like fields
- inspection surfaces expose status, not raw secret values
- HTTP responses must not expose secrets

Production note:
- any production-grade secret adapter remains out of scope for the current EPIC stage

## Current No-Go Domains

The following domains remain blocked even if local contracts or documentation reference them:
- provisioning
- credentials
- wallet/signing
- treasury
- trading runtime
- settlement
- billing execution
- production provider execution
- production databases
- production APIs

## Current Security Gaps

- no dedicated permission state model yet
- no centralized operational gate registry yet
- no dedicated readiness registry in the exact target EPIC format yet
- direct focused coverage is still missing for some blocked areas:
- `wallet.sign`
- `provider.execute.production`
- billing execution
- settlement
- provisioning

## Validation Constraint

Current-cycle security validation status:
- `NOT_EXECUTED_ENVIRONMENT_BLOCKER`

Reason:
- `node` and `npm` are unavailable in the current environment

Historical evidence:
- prior local documents record successful test/build runs
- historical evidence is not treated as current-cycle proof

## Security Recommendation

Next documentation step:
- complete `ACS-REQ-03 - ACS Authority Boundary Matrix`

Before any maturity discussion beyond `L4 Candidate`:
- re-run validation in a compatible environment
- centralize the authority model
- centralize readiness, permission, and gate representations
