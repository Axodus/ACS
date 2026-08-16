# C02 — Distributed Rate Limiting & HTTP Edge Hardening

**Status:** PASS WITH CAVEATS

**Completed:** 2026-08-15

**Finding result:** `ACS-ORG-010` PARTIALLY_RESOLVED; `ACS-ORG-013` RESOLVED for the active HTTP boundary

## Discovery

The active server accepted a caller-selected mock rate-limit context from `x-acs-rate-limit-mode` and `x-acs-rate-limit-key`. All responses used wildcard CORS, forwarded addresses had no canonical trust policy, route body readers accumulated unbounded strings, and the Node server did not set explicit header/request/keep-alive limits. C01 authentication was correctly centralized, but no operational edge gate preceded it.

| Control | Previous state | Client-controlled? | C02 result |
| --- | --- | ---: | --- |
| Rate limiting | disabled/header-selected mock | Yes | fixed-window `RateLimiter` enforced by server |
| Client address | no canonical resolver | Forwarding headers could be | socket peer plus configured trusted-proxy chain |
| Proxy trust | implicit/undefined | N/A | exact address/CIDR allowlist |
| CORS | wildcard | Origin was not constrained | explicit production allowlist and validated preflight |
| Body limit | unbounded route readers | No | centralized byte-bound reader and content-length guard |
| Header/request timeouts | runtime defaults | No | explicit Node server limits |
| Security headers | incomplete | No | API-appropriate response policy |
| Edge readiness | absent | No | rate-limiter and CORS signals in production readiness |

## Architecture

```text
socket peer
    ↓
ClientAddressResolver
    ↓
network fixed-window bucket
    ↓
CORS / request bounds
    ↓
HttpIdentityValidator
    ↓
principal or tenant+principal bucket
    ↓
existing authority / governance / route
```

`RateLimiter` owns decisions; `RateLimitStore` owns atomic counter state. Routes receive only the resulting `AcsRateLimitContext` and do not mutate counters. Raw bucket identities are SHA-256 hashed before persistence. The legacy mock parser remains available only for direct-router compatibility tests and is never called by `createAcsHttpHandler`.

## Provider and distributed classification

- `InMemoryRateLimitStore`: explicit DEV/test adapter, process-local, rejected by production edge composition.
- `SqliteRateLimitStore`: active durable adapter for `createAcsHttpServer`; WAL, busy timeout and `BEGIN IMMEDIATE` make fixed-window increments atomic across independent connections using the same database.
- Classification: **SINGLE_NODE_DURABLE / shared-database multi-instance proof**.
- Residual: multi-host/shared-service topology, network partition behavior and live load-balancer acceptance remain unproven. The adapter is not represented as a Redis-equivalent global service.

Two independent limiter/store instances consume the same tested bucket. This removes per-process `Map` enforcement from the production boundary but does not close `ACS-ORG-019`.

## Bucket and policy semantics

| Route class | Pre-auth bucket | Post-auth bucket | Default window policy |
| --- | --- | --- | --- |
| `public_health` | network | none | 120/minute |
| `authenticated_read` | network | principal | 600/minute |
| `administrative_mutation` | network | tenant + principal | 120/minute |
| `execution_start` | network | tenant + principal | 60/minute |
| `system_admin` | network | principal | 120/minute |

All values are configurable at composition time/environment level. Tenant operational quotas remain the EPIC-15 governance domain and are not rate-limit counters.

## Denial and backend-failure semantics

- Exhausted bucket: `429 rate_limit_exceeded`.
- `Retry-After` equals `details.retryAfterSeconds`; `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` are returned.
- Protected operation plus unavailable limiter: fail closed with `503 rate_limit_backend_unavailable` before authentication/authority/domain mutation.
- Public liveness plus unavailable limiter: observable fail-open for liveness only; readiness reports the dependency unavailable.
- No counter key, database detail or raw actor/Tenant value is returned.

## Proxy and client address trust

The socket peer is canonical by default. `X-Forwarded-For`/`X-Real-IP` are considered only when the peer matches `ACS_TRUSTED_PROXY_CIDRS` (or explicit context options). The resolver walks the forwarded chain from the trusted edge toward the first untrusted address, normalizes IPv4-mapped IPv6, and falls back to the peer on malformed input. `x-rate-limit-key`, identity and Tenant headers never select a bucket.

## CORS and request safety

Production requires `ACS_ALLOWED_ORIGINS` or an equivalent explicit list and rejects `*`. Development may opt into wildcard. Preflight advertises only real methods and accepts `Authorization`, `Content-Type` and correlation headers; development-only identity headers are not admitted in the production policy.

The server enforces:

- default body maximum: 1 MiB, including chunked requests;
- `413 payload_too_large` before domain side effects;
- default maximum header bytes: 16 KiB;
- default maximum header count: 100;
- header timeout: 10 seconds;
- request receive timeout: 30 seconds;
- keep-alive timeout: 5 seconds;
- maximum requests per socket: 1,000.

These values protect the HTTP lifecycle; they do not impose a synchronous timeout on future asynchronous remote execution.

## Security headers

Responses include `X-Content-Type-Options`, `Referrer-Policy`, API-safe CSP, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`. HSTS is opt-in and must match an HTTPS deployment. Error bodies redact unexpected exceptions and never echo credentials, forwarding chains or store internals.

## Readiness

The Product API production-readiness projection now reports:

```text
edge.rateLimiterConfigured
edge.rateLimiterReachable
edge.rateLimiterProductionGrade
edge.corsConfigured
```

Gate G06 blocks when the limiter is absent/non-production/unreachable or production CORS is not explicit. `createAcsHttpServer` selects the durable limiter; production rejects the memory adapter, invalid provider configuration and wildcard/missing origins.

## Test evidence

`tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs` covers nine scenarios:

- shared SQLite counters across independent instances;
- production adapter/CORS fail-closed configuration;
- trusted/untrusted forwarded-address resolution;
- real TCP/HTTP 429 and `Retry-After`;
- forged bucket/forwarding headers;
- principal and Tenant bucket isolation;
- CORS allow/deny plus `Authorization` preflight for PUT/PATCH/DELETE;
- declared/chunked 413 with zero Agent side effect;
- backend outage and Node server timeout/connection configuration.

Regressions cover B01 HTTP compatibility, B02 secrets/economics, C01 identity, Tenant lifecycle/membership/governance, C02 governance enforcement, Tenant Administration, isolation, readiness and existing HTTP routes.

## Validation result

- `git diff --check`: PASS.
- `npx tsc -p tsconfig.json --noEmit`: PASS.
- `npm run build`: **ENVIRONMENT BLOCKER** — `TS5033` / `EROFS` while writing the mounted `dist` directory; project configuration was not changed.
- equivalent TypeScript emission to `/tmp/epic15-5-c02/dist`: PASS.
- C02 dedicated suite: 9/9 PASS through the real TCP/HTTP server; loopback binding required execution outside the filesystem/network sandbox.
- final sensitive regression set: 33/33 PASS.
- broader milestone regression inventory: 18 relevant test files PASS across HTTP, B01, B02, C01, EPIC-15 domain/governance/isolation/readiness and C02.

## Acceptance and caveats

| Requirement | Result |
| --- | --- |
| Real server-side limiter | PASS |
| Client-selected bucket accepted | 0 |
| Untrusted forwarded address accepted | 0 |
| 429 / Retry-After | PASS |
| Principal/Tenant isolation | PASS |
| Shared state across independent instances | PASS on one shared SQLite database |
| Multi-host distributed service proof | NOT PROVEN |
| Body/CORS/security header guards | PASS |
| Essential server timeouts configured | PASS |
| Production readiness claim | NOT CLAIMED |

`ACS-ORG-010` is **PARTIALLY_RESOLVED** because the active production boundary no longer uses mock/process-local counters and shared-database instances are proven, while live multi-host/global-provider acceptance remains H/`ACS-ORG-019` scope. `ACS-ORG-013` is **RESOLVED** for the implemented HTTP server boundary. Milestone C is **PASS WITH CAVEATS**: OIDC and edge contracts are complete, but live IdP, reverse-proxy and multi-host limiter certification remain environment acceptance work.

## Deferred

No WAF, CDN/DDoS service, login/session UI, remote worker identity, service mesh, billing quota, runtime dispatch, telemetry exporter or production deployment gate was introduced.
