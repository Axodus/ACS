# EPIC-16 Contracts

## 1. Contract principles

EPIC-16 is contract-first. Every financial operation must have explicit Tenant scope, authority, idempotency, evidence and failure semantics.

## 2. Canonical financial operation states

Where supported by existing primitives, operator-facing projections should normalize state into explicit lifecycle categories without rewriting underlying source records.

### Economic operation projection

```text
estimated -> reserved -> metered -> settled
              |            |          |
              +-> released +-> error  +-> reconciled/mismatch
```

Not every execution must traverse every state. Projection logic must distinguish `not_applicable`, `not_available`, `pending`, `failed` and zero values.

## 3. Pricing provenance contract

A displayed economic value that represents a price or cost must expose enough provenance to answer:

- Tenant;
- effective pricing/policy source;
- quote or economic operation identity;
- unit;
- effective timestamp/version;
- workload/run correlation;
- whether the value is estimated, reserved, metered or settled.

Missing authoritative provenance must be represented as unavailable, never guessed.

## 4. Economic authorization contract

Input must include Tenant, actor/trusted context, workload/economic request, requested amount/unit where relevant, governance/entitlement/limit context and idempotency identity.

Output must include `allowed|denied`, reasons/codes, applicable limit/entitlement references, reservation outcome when coupled, audit correlation and stable operation identity.

Authorization cannot be overridden by client/UI state.

## 5. Reservation lifecycle contract

Supported reservation actions:

- inspect;
- create/reserve through the existing economic authority;
- release where allowed;
- correlate to execution and settlement;
- diagnose failed/stale states.

Every mutation must define replay behavior. Unsupported manual amount mutation is forbidden unless separately approved.

## 6. Usage contract

Usage evidence must be Tenant-scoped and correlate to the originating execution/run. Corrections, if authorized, must be append-only or preserve prior evidence with a durable reason, actor and audit link; silent overwrite is forbidden.

## 7. Settlement contract

Settlement must preserve existing idempotency. Operator surfaces must expose settlement identity, source economic operation, status, provider correlation if applicable, attempt/retry semantics, receipt identity and terminal error information safe for display.

A provider timeout or ambiguous response must not be mapped to success without authoritative confirmation.

## 8. Reconciliation contract

Reconciliation must produce deterministic outcomes such as:

- matched;
- pending evidence;
- mismatch;
- provider unavailable;
- remediation required;
- resolved.

Backlog items must have stable identity, Tenant, economic/settlement references, first-seen/last-seen timestamps, category, severity and evidence links.

## 9. Financial exception contract

A financial exception is durable operational state, not a log line. Minimum fields:

- exception ID;
- Tenant ID;
- category;
- severity;
- state;
- related quote/reservation/usage/settlement/reconciliation IDs;
- detected-at and updated-at;
- remediation policy/action set;
- actor/outcome for each remediation;
- audit/evidence references.

## 10. Remediation contract

Permitted actions must be enumerated, server-authorized and idempotent. Generic arbitrary balance/value editing is not part of EPIC-16.

Each remediation returns:

- accepted/rejected;
- reason;
- previous and resulting operational state references;
- operation/idempotency identity;
- audit correlation;
- follow-up reconciliation requirement if any.

## 11. Product API contract

The Product API must provide supported read and mutation endpoints for EPIC-16 workflows. It must not expose raw repository mutation primitives or require the UI to compose authority locally.

All endpoints must define:

- Tenant derivation/selection;
- authorization requirements;
- pagination/filtering where collections exist;
- stable machine-readable error codes;
- degraded dependency behavior;
- correlation IDs.

## 12. Dashboard/read-model contract

Financial Dashboard data must distinguish current aggregate truth from historical series. If historical data is not available, the API/UI must expose a truthful empty/unavailable state. `9005e3a` no-fake-data semantics are normative.

## 13. Decision-gated contracts

No contract for legal invoices, payment capture, banking rails, tax, accounting journals or unrestricted manual financial adjustments may be introduced without explicit normative approval.

## 14. Environment topology contract

EPIC-16 supports exactly three environment identities:

| Concern | LOCAL | DEVELOPMENT | PRODUCTION |
|---|---|---|---|
| UI | Vite localhost | Vercel / `acs-app` | Production web service |
| Product API | localhost:8788 | Railway public HTTPS API origin, for example `https://acs-axodus.up.railway.app/api/v1` | Production API service |
| Browser API origin | localhost only | `https://acs-axodus.up.railway.app/api/v1` | production HTTPS origin |
| Dispatch | local | remote | remote |
| OpenClaw Worker | OpenClaw Worker — Local | OpenClaw Worker — Cloud | OpenClaw Worker — Remote VM |
| Worker transport | stdio / local transport | HTTPS | HTTPS / private service network |
| Python required for API boot | no | no | no |
| `.railway.internal` in browser-facing `VITE_*` | forbidden | forbidden | forbidden |

Canonical environment variables:

- `ACS_ENVIRONMENT`;
- `ACS_DISPATCH_MODE`;
- `ACS_OPENCLAW_WORKER_MODE`;
- `ACS_OPENCLAW_TRANSPORT`.

Browser-facing `VITE_*` values may use localhost only in LOCAL. DEVELOPMENT and PRODUCTION must use public HTTPS origins. `exquisite-enjoyment.railway.internal` is a server-side worker/service address only and must never be emitted to the browser.

In hosted DEVELOPMENT, the Railway runtime must map its injected `PORT` to `ACS_HTTP_PORT` for the Product API process. Browser-facing deployment values must remain public and HTTPS.

Railway ↔ Vercel integration may share server-side environment variables and secrets for hosted deployments, but it does not create a browser-facing proxy to the Railway Product API. `VITE_ACS_API_BASE_URL` remains a build-time browser-visible value and must resolve to a public browser-reachable API origin.

Railway Public API (`https://backboard.railway.com/graphql/v2`) is infrastructure automation only. It may validate Railway deployment metadata and service domains server-side, but it is not the ACS runtime API and must not be used for product economics, usage, settlement, reconciliation or remediation calls. Railway project/workspace tokens are server-side credentials only and must not be exposed through `VITE_*`.

## 15. Provider capability contract

ACS projects provider truth through a single read-only boundary contract. The contract must represent provider identity, provider type, provider mode, configured state, reachability, capabilities, readiness, production eligibility, degraded state, reason code and evidence/provenance.

Canonical provider groups:

- OpenClaw Worker;
- settlement provider;
- shared-state / persistence provider;
- secret provider;
- telemetry / exporter provider.

Capability scope is explicit. Some capabilities are global, while others are tenant-scoped. The contract must not advertise unsupported capabilities or planned behavior as available.

Readiness states are intentionally small: READY, DEGRADED, UNAVAILABLE, NOT_CONFIGURED and UNSUPPORTED. HTTP readiness, execution readiness, financial-operation readiness and production eligibility must remain separate dimensions.

No-silent-fallback is normative. If a configured cloud, remote or production provider is unavailable, the boundary must expose that fact rather than switching to local memory, filesystem, SQLite /tmp or mock behavior.

Diagnostics must remain secret-safe. Credential presence may be reported; credential values must not be.

## 16. Provider diagnostics contract

The authoritative provider diagnostics projection is read-only and evidence-backed. It must derive from live configuration plus live provider evidence, not from stale defaults.

The diagnostics read model must expose, where available:

- providerId;
- providerType;
- providerMode;
- environment;
- configured;
- reachable;
- capabilities;
- readiness;
- productionEligible;
- degraded;
- reasonCode;
- lastCheckedAt;
- evidence/provenance.

Readiness states remain the smallest meaningful set: READY, DEGRADED, UNAVAILABLE, NOT_CONFIGURED and UNSUPPORTED. HTTP readiness, execution readiness and financial-operation readiness remain separate and a healthy listener does not imply worker, settlement or persistence readiness.

Diagnostics must never expose secrets, tokens or credential values.

## 17. Account and wallet identity contract

Wallet connection, SIWX authentication, ACS Account, Tenant membership, role and economic authorization are separate authorities. A verified wallet identity resolves or creates a global ACS Account. It does not create Tenant membership, grant a role, set `platformAdmin`, add scopes or authorize an economic operation.

Canonical EVM identity fields are:

```text
provider = reown_siwx
namespace = eip155
subject = reown_siwx:eip155:<normalizedAddress>
caip10 = eip155:<chainId>:<normalizedAddress>
```

Uniqueness is `provider + namespace + subject`. The subject is chain-agnostic; CAIP-10 preserves the chain actually proven by the latest successful verification.

`SiwxAuthenticatedArtifactVerifier` owns the selected official Reown/SIWX nonce/message/signature/session request shape. Only the verifier may derive `VerifiedWalletIdentity`. Client-provided connection state, address, chain, subject or timestamps are untrusted inputs.

The approved DEVELOPMENT RPC configuration uses one server-only `ACS_ALCHEMY_API_KEY` to derive every currently supported SIWX verification endpoint: Base Sepolia and Ethereum Sepolia. `ACS_SIWX_BASE_SEPOLIA_RPC_URL` and `ACS_SIWX_ETHEREUM_SEPOLIA_RPC_URL` remain optional explicit overrides. Explicit configuration wins, but neither the API key nor credential-bearing RPC URLs may be projected to diagnostics or browser-visible configuration.

ACS application sessions are opaque and server-controlled. The token secret has at least 256 bits of entropy; only its SHA-256 digest is persisted and compared in constant time. Sessions have explicit `expiresAt` and `revokedAt`, a fixed 15-minute TTL and no sliding expiration. Read models omit both the token digest and the upstream provider session identifier.

`Account.status = suspended|disabled` invalidates use of existing ACS sessions immediately and rejects new SIWX exchange. The external wallet connection may remain alive. The safe state for a verified Account with no active membership is `NO_TENANT_MEMBERSHIP`.
