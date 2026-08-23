# EPIC-16 Architecture

## 1. Architectural intent

EPIC-16 extends the existing ACS economic authority into an operator-facing financial operations domain. It does not introduce a parallel billing core.

## 2. Target flow

```text
Trusted Operator / Runtime
        |
        v
Product API Financial Operations
        |
        +--> Economic Read Model / Pricing Provenance
        +--> Governance + Entitlements + Limits
        +--> EconomicService
        |      +--> Quote
        |      +--> Reserve / Release
        |      +--> Authorize
        |      +--> Usage
        |      +--> Settle
        |      +--> Receipt
        |      +--> Reconcile
        |
        +--> Financial Exception Service
        +--> Audit / Evidence
        +--> Telemetry / Readiness
        |
        v
Shared authoritative repositories / PostgreSQL
        |
        +--> approved provider adapter boundary, if enabled
```

## 3. Source-of-truth rules

- Product API is the supported operator boundary, not the authority itself.
- EconomicService and canonical repositories remain the execution-economic authority.
- Governance/entitlements/limits determine authorization inputs; UI cannot override them.
- Shared repositories are authoritative for durable financial operational state.
- Audit records prove actions and outcomes but do not replace financial state.
- Telemetry is diagnostic only.

## 4. New architectural responsibilities

### 4.1 Financial Operations Read Model
A Tenant-scoped projection that joins existing economic primitives into operator semantics: price basis, estimated, reserved, metered, settled, reconciliation and exception status. Projection logic must preserve provenance and never infer unavailable historical values.

### 4.2 Pricing Provenance
Each effective economic value exposed as a price/cost must identify its supported source: policy/version, quote identifier, unit/currency-like unit where applicable, effective timestamp and execution correlation. EPIC-16 must not invent a universal pricing engine if existing quote policy is sufficient.

### 4.3 Economic Authorization
Authorization composes existing governance/entitlement/limit truth with economic request context. It must return an explicit allowed/denied outcome and machine-readable reasons. It must not rely on client-side thresholds.

### 4.4 Reservation Operations
Reservations gain operator lifecycle semantics: active/released/consumed/expired/failed where supported by underlying truth. Any new state transition must be persisted and idempotent.

### 4.5 Settlement Operations
Settlement must expose lifecycle state, provider correlation where applicable, retry/replay policy and durable receipt identity. Existing idempotency guarantees are mandatory.

### 4.6 Reconciliation and Exceptions
Mismatch detection produces durable, Tenant-scoped reconciliation/exception records. A financial exception must have identity, category, severity, state, evidence references and permitted remediation policy.

## 5. Persistence

Any new authoritative record must:

- implement the async repository boundary;
- work under the shared PostgreSQL profile;
- preserve Tenant partitioning;
- use stable identities and concurrency-safe writes;
- define retry/idempotency semantics;
- fail closed when the authoritative shared store is unavailable.

No production-only financial truth may exist solely in process memory.

## 6. Provider boundary

A commercial or external financial provider is not assumed. If an approved adapter is introduced, ACS must persist provider references/correlation identifiers rather than opaque provider truth, expose provider dependency health, and keep provider credentials in the existing secret-provider boundary.

Provider outage must result in explicit pending/degraded/failed operational state according to contract; it must not silently mark settlement as successful.

## 7. UX architecture

Extend the existing Control Plane rather than creating a parallel finance console. Candidate routes may include financial/economic operations surfaces under the existing navigation architecture, but route naming must follow EPIC-14 IA conventions.

Dashboard integration must preserve `9005e3a`:

- expressive KPI/visual hierarchy;
- stable visualization canvases;
- light/dark parity;
- responsive behavior;
- truthful zero/empty states;
- no fabricated histories or customer counts.

## 8. Security and authority

All financial reads and writes require trusted identity context and Tenant authorization. Mutation authority must be server-side and action-specific. High-risk remediation should support policy thresholds or explicit elevated authority rather than generic admin permission.

## 9. Observability

Every mutation must emit correlated structured logs/traces/metrics and audit evidence with Tenant, operation identity and outcome. Sensitive provider/financial payloads must not be copied indiscriminately into telemetry.

## 10. Topology boundary

EPIC-16 acceptance runs within the certified post-15.5 bounded topology. It must not claim physical multi-host, provider HA or global production certification. New financial state must nevertheless remain compatible with shared-state/multi-process operation.

## 11. Environment topology baseline

EPIC-16 recognizes exactly three supported environment identities:

| Concern | LOCAL | DEVELOPMENT | PRODUCTION |
|---|---|---|---|
| UI | Vite localhost | Vercel / `acs-app` | Production web service |
| Product API | localhost:8788 | Railway public HTTPS API origin, for example `https://acs-axodus.up.railway.app/api/v1` | Production API service |
| Browser API origin | localhost only | `https://acs-axodus.up.railway.app/api/v1` | production HTTPS origin |
| Dispatch | local | remote | remote |
| OpenClaw Worker | OpenClaw Worker — Local | OpenClaw Worker — Cloud | OpenClaw Worker — Remote VM |
| Worker transport | stdio / local transport | HTTPS | HTTPS / private service network |
| Python required for API boot | no | no | no |
| Persistence | local/dev | shared development | durable production |
| `.railway.internal` in browser-facing `VITE_*` | forbidden | forbidden | forbidden |

Canonical environment variables:

- `ACS_ENVIRONMENT`;
- `ACS_DISPATCH_MODE`;
- `ACS_OPENCLAW_WORKER_MODE`;
- `ACS_OPENCLAW_TRANSPORT`.

Browser-facing `VITE_*` values may use localhost only in LOCAL. DEVELOPMENT and PRODUCTION must use public HTTPS origins. `exquisite-enjoyment.railway.internal` is a server-side worker/service address only and must never be emitted to the browser.

In hosted DEVELOPMENT, Railway must map its injected `PORT` to `ACS_HTTP_PORT` for the Product API process. Browser-facing deployment values must stay public and HTTPS.

Railway ↔ Vercel integration may synchronize server-side environment variables and secrets for hosted deployments, but it does not create an HTTP proxy between `acs-app` and the Railway Product API. The browser-visible `VITE_ACS_API_BASE_URL` remains a build-time input for the standalone app and must resolve to a public browser-reachable API origin. Private Railway DNS stays server-side only.

Railway Public API is a platform-automation interface only (`https://backboard.railway.com/graphql/v2`). It may be used server-side or in CI to discover/manage Railway projects, services, deployments, domains and variables, but it is not the ACS Product API and must never be used for ACS economic/runtime operations. Railway access tokens remain server-side only and must not appear in `VITE_*`.

## 12. Provider boundary

EPIC-16 S01 establishes a single provider boundary model for operational truth. The boundary is diagnostic and read-only; it does not orchestrate provider failover or synthetic fallback.
S02 makes that boundary evidence-based through the Product API read model, so HTTP readiness, execution readiness and financial-operation readiness remain distinct.

The canonical provider set is limited to the provider boundaries already used by ACS runtime:

- OpenClaw Worker;
- settlement provider;
- shared-state / persistence provider;
- secret provider;
- telemetry / exporter provider.

Each provider projection must expose provider identity, configured mode, supported capabilities, readiness, production eligibility, degradation reason and provenance. The Product API may project this truth through diagnostics/readiness endpoints, but it must not reveal credentials or introduce a competing readiness contract.

HTTP readiness, execution readiness and financial-operation readiness are distinct. A healthy HTTP listener does not imply a reachable worker, durable persistence or production-eligible topology.

## 13. Account and identity boundary

```text
Reown AppKit wallet connection
        |
        v
official SIWX message/signature
        |
        v
Product API SiwxAuthenticatedArtifactVerifier
        |
        v
VerifiedWalletIdentity
        |
        v
global ACS Account + ExternalIdentity
        |
        +--> opaque ACS application session
        |
        +--> separate TenantMembership lookup
                  |
                  v
             role/governance/economic authority
```

The Account/identity store is process-local only in LOCAL. SIWX outside LOCAL requires shared PostgreSQL state; memory/filesystem fallback is prohibited. Shared-state schema v2 persists Accounts, unique external identities, hashed ACS sessions and single-use nonces.

The Product API may remain HTTP-ready when the external SIWX verifier is not configured. In that state nonce creation remains safe, exchange fails closed, existing non-SIWX inspection behavior remains unaffected and ACS must not report wallet authentication as available.

PRODUCTION remains not configured and not eligible until a production Reown project, domain allowlist, certified server-side verifier, shared session persistence, approved RPC verification path and security acceptance are evidenced.
