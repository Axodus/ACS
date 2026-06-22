# ACS Secret Safety Audit

Date: 2026-06-22

## 1. Scope

This audit covers secret and credential safety for `ACS-REQ-11` only. It used local inspection and redacted search output. It did not read external secret stores, contact providers, or add credentials.

## 2. Files Reviewed

All required ACS source, fixture, schema, test, and documentation inputs listed in `ACS-REQ-11` were reviewed. Supporting review included receipt sanitization in `src/acs-receipts.ts`, the optional environment access in `src/runtime.ts`, and the package manifest.

## 3. Search Patterns Used

Searches covered `secret`, `credential`, `password`, `token`, `api_key`, `apikey`, `private_key`, `mnemonic`, `process.env`, `.env`, credential-bearing URLs, common cloud/GitHub/OpenAI token signatures, PEM private-key headers, and quoted secret-like assignments. Match content was not printed for secret-oriented searches.

## 4. Secret Findings

No real secret was found. High-confidence signature searches returned no matches. The only `private_key` term was a forbidden-path rule, not a key. No mnemonic phrase or PEM private-key header was found.

`MockAcsSecretStorage` accepts a caller-provided value to satisfy its interface but does not persist that value. It stores only an opaque reference record and returns `[mock-secret-redacted]` from reads. This remains a mock contract and is not suitable for production secrets.

## 5. Credential Findings

No real API key, API secret, password, OAuth token, webhook secret, exchange credential, or credential-bearing URL was found. Credential references are policy labels, types, blocked actions, redaction tests, or documentation.

Receipt metadata sanitization treats secret-, token-, password-, private-key-, and API-key-like keys as sensitive. Inspection exposes secret-storage status only.

## 6. Environment Variable Findings

No `.env` or `.env.*` file was found. The reviewed tests do not require environment variables.

One source environment access exists: optional `ACS_OPENCLAW_AGENTS_ROOT` in `src/runtime.ts`. It selects a local agents directory and is not a credential. `.env` references elsewhere are forbidden-path or documentation entries.

## 7. Fixture Safety Findings

Fixtures use mock wallet identifiers, mock exchange names, zero-value performance data, no-go reason codes, and blocked policy strings. The negative Hummingbot validation fixture contains `https://example.invalid` solely to prove network-import rejection. No secret-like fixture value was found.

Some fixture words (`READY`, `available`, `provider`, `API key`) could be misread without context; their surrounding data consistently marks them mock, local, representational, or blocked. Reports should retain those qualifiers.

## 8. Report/Documentation Safety Findings

Documentation contains many secret and credential terms because it defines prohibitions and future requirements. No credential value was found. References to historical validation, production requirements, or `L4 Candidate` are not production claims, but must remain explicitly qualified.

## 9. Redactions Applied

No repository file required redaction. Search output for possible secret-bearing patterns was emitted only as file/line locations with `[REDACTED_MATCH]`. No possible secret value was printed or copied into these reports.

## 10. Secret Safety Blockers

No active leak blocker was found. Production secret use remains blocked by `ACS-BLOCKER-012`: there is no KMS/Vault-equivalent adapter, production identity control, or approved credential flow.

## 11. Recommendation

Keep all secret handling mock/redacted. Do not place real credentials in the current adapter, fixtures, environment files, frontend, logs, telemetry, receipts, or reports. Any future production secret adapter requires a separate approved security design and audit.
