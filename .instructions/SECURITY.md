# ACS Security

Last updated: 2026-06-22

## Security Posture

ACS security in the current phase is based on:
- local-first operation
- config-first behavior
- read-only/mock surfaces where applicable
- read-only readiness registry representation
- read-only permission state model representation
- read-only operational gate registry representation
- read-only generic consumer contract aggregation
- read-only AxodusAPP preview adapter projection
- read-only Business/Marketplace alignment projection
- focused boundary enforcement test coverage
- completed ACS-REQ-11 security, secret-safety, and production-endpoint audits
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

## ACS-REQ-11 Audit Result

- no real secrets, credentials, private keys, mnemonics, API keys, or tokens found
- no `.env` files or secret environment variables found
- no production API or database endpoints found
- no outbound network client or external production provider call found
- no mutating HTTP routes found; the HTTP handler rejects non-GET methods
- no AxodusAPP, Business, Marketplace, or Hummingbot runtime call found
- local mock/control state and local audit writes do not grant production mutation authority

Reports:
- `.instructions/reports/ACS_SECURITY_REVIEW.md`
- `.instructions/reports/ACS_SECRET_SAFETY_AUDIT.md`
- `.instructions/reports/ACS_PRODUCTION_ENDPOINT_AUDIT.md`

## Current Security Gaps

- production authentication and rate limiting remain mock/placeholders
- wildcard CORS and the absence of a production secret adapter prohibit production exposure
- production authority remains blocked despite successful local validation

## Validation Constraint

Current-cycle security validation status:
- `PASS_CURRENT_CYCLE_LOCAL_VALIDATION`

Reason:
- `npm run build`, `npm test`, and `npm run check` pass after the ACS-REQ-12 validation fixes
- no security assertion was removed or weakened

Historical evidence:
- prior local documents record successful test/build runs
- historical evidence is not treated as current-cycle proof

## Security Recommendation

Authority boundary source:
- `.instructions/ACS_AUTHORITY_BOUNDARY_MATRIX.md`

Next documentation-to-implementation step:
- `ACS-REQ-13 - Evidence-based L4 consolidation assessment`

Before any maturity discussion beyond `L4 Candidate`:
- re-run validation in a compatible environment
- preserve the authority model
- centralize permission and gate representations
