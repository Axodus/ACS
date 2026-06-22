# ACS Security Review

Date: 2026-06-22

## 1. Scope

This review records `ACS-REQ-11` only. It is a local, evidence-based, non-destructive review of the ACS security boundary. It does not authorize production use, change runtime authority, update portfolio/global registers, or promote ACS beyond `L4 Candidate`.

## 2. Files Reviewed

Reviewed source: `src/readiness.ts`, `src/permissions.ts`, `src/gates.ts`, `src/consumer-contract.ts`, `src/axodusapp-preview.ts`, `src/business-marketplace-alignment.ts`, `src/inspection.ts`, `src/policy.ts`, `src/acs-policy-matrix.ts`, `src/capability-registry.ts`, `src/api-safety.ts`, `src/secret-storage.ts`, `src/emergency-stop.ts`, `src/trinity-intake-boundary.ts`, `src/trading-intent-classifier.ts`, `src/http/routes/acs-routes.ts`, `src/http/server.ts`, `src/index.ts`, all files under `src/fixtures/`, and all files under `src/schemas/`.

Reviewed tests: `tests/boundary-enforcement.test.mjs`, `tests/readiness.test.mjs`, `tests/permission-state.test.mjs`, `tests/operational-gates.test.mjs`, `tests/consumer-contract.test.mjs`, `tests/axodusapp-preview.test.mjs`, `tests/business-marketplace-alignment.test.mjs`, and `tests/inspection.test.mjs`.

Reviewed documentation: the authority matrix, ACS-REQ-10 boundary report, readiness/permission/gate/consumer/AxodusAPP/Business/Marketplace reports, security and secret-storage requirements, HTTP contracts, validation, tasks, handoff, blocker register, and security posture listed in the request.

Supporting inspection also covered `package.json`, `src/runtime.ts`, `src/orchestrator.ts`, `src/providers.ts`, `src/agents.ts`, `src/receipts.ts`, `src/telemetry.ts`, `src/execution-policy.ts`, and `src/redhat-mcp.ts` because searches identified the pre-existing local orchestration surface.

## 3. Search Commands / Patterns Used

Local `rg` searches covered, case-insensitively where appropriate: `secret`, `credential`, `password`, `token`, `api_key`, `apikey`, `private_key`, `mnemonic`, `wallet`, `sign`, `treasury`, `settlement`, `payout`, `billing`, `provision`, `production`, `provider`, `http://`, `https://`, `POST`, `PUT`, `PATCH`, `DELETE`, `process.env`, `.env`, `HUMMINGBOT`, `AXODUSAPP`, `Business`, and `Marketplace`.

Additional searches covered high-confidence credential signatures, secret assignments, environment files, HTTP method registration, network client imports/calls, database technologies/connection strings, provider/runtime calls, child processes, and filesystem mutation APIs. Secret-oriented output was limited to file/line locations or `[REDACTED_MATCH]` markers.

## 4. Findings Summary

- No real secret, credential, private key, mnemonic, API key, access token, or credential-bearing URL was found.
- No `.env` file was found.
- No production API or production database endpoint was found.
- No outbound network client call exists in the reviewed runtime source.
- The HTTP server accepts `GET` only and rejects every other method with `405`.
- No AxodusAPP, Business, Marketplace, Hummingbot, exchange, settlement, payout, billing, treasury, wallet-signing, smart-contract, or production-provider runtime call was found.
- The ACS-REQ-10 suite provides supporting assertions for the blocked action registry and non-executive consumer projections.
- A pre-existing local orchestration API uses the word `execute`, but it only evaluates policy, selects local registry metadata, and records receipts/telemetry; it does not invoke provider or agent code. It is not a production execution path.
- Production HTTP hardening is intentionally incomplete: authentication and rate limiting are mock/placeholders and CORS is wildcard. This prevents any production exposure claim.

## 5. Production Surface Audit

HTTP/HTTPS references were limited to localhost loopback examples, JSON Schema identifiers, `axodus.local` schema identifiers, and an `example.invalid` string embedded in a negative validation fixture. None is a production endpoint.

No PostgreSQL, MySQL, MongoDB, Redis, JDBC, `DATABASE_URL`, or other production database connection was found in the reviewed source. `package.json` contains only TypeScript and Node type development dependencies.

Provider references are registry metadata or explicit blocked-action strings. The default provider is named `local-acs-coordination`; no provider SDK or external compute client is present.

## 6. Mutation Surface Audit

The HTTP handler rejects `POST`, `PUT`, `PATCH`, `DELETE`, and every other non-`GET` method. Routes return inspection/mock data only.

Local in-memory state exists for mock secret references and emergency-stop records. Local JSONL telemetry and receipt stores exist in the broader runtime. These are local audit/control-plane mutations, not production state mutation or external authority.

No wallet creation/signing, treasury movement, trade placement, settlement, payout, billing, provisioning, smart-contract deployment/mutation, production permission enforcement, portfolio/global register mutation, or production API mutation path was found.

## 7. Runtime Dependency Audit

- Tests require Node/npm but no environment variable.
- `src/runtime.ts` optionally reads `ACS_OPENCLAW_AGENTS_ROOT`; it is a filesystem path setting, not a secret, and is not required by the reviewed tests.
- No AxodusAPP, Business, or Marketplace runtime dependency is imported or called.
- Hummingbot references are schema, fixture, policy, sandbox, or explicit no-go data. No Hummingbot runtime call exists.
- No network client dependency is declared.

## 8. Authority Boundary Security Assessment

The reviewed consumer, preview, alignment, inspection, permission, readiness, and gate surfaces are representational and read-only. Production enforcement flags are false, execution-triggered flags are false, and blocked-action entries cover the required no-go domains.

The term `READY` in operational fixtures is a modeled local state and must not be interpreted as production readiness. Likewise, `available` on the local coordination provider means locally selectable metadata, not an executable external provider.

## 9. Security Blockers

- `ACS-BLOCKER-001`: production/autonomous execution authority is not approved.
- `ACS-BLOCKER-002`: Hummingbot runtime remains blocked.
- `ACS-BLOCKER-003`: current validation is blocked by a TypeScript compile failure in `src/consumer-contract.ts:314`; tests did not execute.
- `ACS-BLOCKER-008`: portfolio/global registers remain unavailable and were not touched.
- `ACS-BLOCKER-012`: production HTTP/auth/rate-limit/CORS and production secret-storage controls are intentionally unavailable.

No blocker was opened for secret leakage, because no real secret or credential was found.

## 10. Security Recommendations

- Keep the HTTP service loopback/local-only and non-production while auth, rate limits, origin restrictions, and production secret storage are placeholders.
- Keep secret values out of fixtures, reports, logs, receipts, telemetry, and frontend responses.
- Preserve GET-only HTTP enforcement and the existing blocked-action registry.
- Resolve the current TypeScript failure and re-run build/test/check under `ACS-REQ-12`; do not treat the initial build command as sufficient because subsequent clean build steps failed.
- If future work introduces provider SDKs, databases, production URLs, or mutating routes, require a new threat review and explicit authority approval.

## 11. Boundaries Preserved

ACS remains local-first, config-first, read-only/mock where applicable, integration-ready, execution-gated, non-production, without production mutation authority, and not `L4 Consolidated`.

## 12. Recommendation for ACS-REQ-12

Proceed only with `ACS-REQ-12` local validation remediation and evidence capture. Fix the TypeScript literal-type failure, then run `npm run build`, `npm test`, and `npm run check`. Do not add production integrations or change authority boundaries as part of that work.
