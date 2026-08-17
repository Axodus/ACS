# AEES-MH / MH02 — Managed Provider Production Boundaries

**Execution date:** 2026-08-17

**Result:** **PASS**

**Topology:** `DUAL_PROCESS_SHARED_STATE_WITH_EXTERNAL_PROVIDERS`

**Evidence:** `/tmp/acs-post15-5-aees-mh-mh02-evidence/manifest.json`

## Baseline imported from AEES-SH

MH02 resumed after AEES-SH certified shared PostgreSQL authority and two independent Control Plane processes. MH01 was not repeated.

```text
Shared authoritative state: CERTIFIED
Dual Control Plane: CERTIFIED DUAL_PROCESS_SHARED_STATE
Physical multi-host: NOT PROVEN
Global Production Ready: NOT CERTIFIED
```

## Provider inventory

| Provider/boundary | Adapter | External boundary | TLS | Authentication | HA/failover | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| human IdP/JWKS | OIDC/JWKS validator | independent HTTPS RS256 process | yes | signed JWT, issuer/audience/kid | outage/reconnect proven; HA not claimed | `EXTERNAL_PROCESS_PROVEN` |
| worker identity | OIDC worker validator | independently issued worker JWT | yes | RS256, subject/instance/capability/JTI | expiry, revoke and renewal proven | `EXTERNAL_PROCESS_PROVEN` |
| Vault | KV v2 provider | Vault `1.20.4` container behind independent TLS gateway | client-to-gateway TLS | restricted AppRole token | `SINGLE_INSTANCE_EXTERNAL` | `EXTERNAL_PROCESS_PROVEN` |
| rate limiter | PostgreSQL shared buckets | shared network database service | not exercised on loopback DB link | database credential | shared A/B counters and outage recovery | `EXTERNAL_PROCESS_PROVEN` |
| edge/LB | trusted reverse proxy | independent TLS round-robin process | yes | authenticated health/edge attestation | one-CP process loss proven | `EXTERNAL_PROCESS_PROVEN` |
| OTLP | OTLP HTTP exporter/receiver | independent HTTPS receiver | yes | bearer-authenticated exporter | outage/bounded queue/reconnect proven | `EXTERNAL_PROCESS_PROVEN` |

No entry is labeled `MANAGED_PROVIDER_PROVEN` or `HA_PROVEN`. The acceptance used independent network services on one physical host, not a managed SaaS or multi-host environment.

## MH02-A — Production composition

The new `ManagedProviderComposition` is the central production-provider boundary. It requires:

- OIDC human identity and OIDC workload identity;
- external secret material with shared-durable metadata;
- shared, production-oriented rate limiting;
- explicit production edge policy and trusted proxy allowlist;
- external production telemetry over secure transport;
- reachable/writable/current shared authoritative state.

It reports `configured`, `reachable`, `authenticated`, `secureTransport`, `ready`, `degraded`, `reasonCode` and `checkedAt` for every provider. Development identity, memory/filesystem secrets, local limiter, console/memory telemetry, wildcard proxy trust and local authority fallback are rejected. The G production evaluator consumes this composition instead of creating a second authority.

**Gate MH02-A:** `PASS`.

## MH02-B — Identity

### Human identity

The external acceptance IdP publishes HTTPS JWKS and issues RS256 JWTs. Validation covers `iss`, `aud`, `sub`, `exp`, `nbf`, `kid` and algorithm. The invalid-token matrix executed seven cases—wrong issuer, wrong audience, expired, future `nbf`, unsupported algorithm, malformed token and invalid signature—with `accepted=0`.

JWKS rotation retained a bounded three-key grace window. A new `kid` was accepted without Control Plane restart. During IdP suspension, a known cached key remained valid within the configured 60-second cache TTL, while an unknown `kid` forced a bounded refresh and failed closed. Recovery required no Control Plane restart.

Signed `platform_role=platform_admin` remained the only platform authority source. A forged header was denied, Tenant membership remained authoritative and cross-Tenant access was denied.

### Workload identity

Production worker authentication now supports external RS256 OIDC workload identity. The validator binds:

```text
subject → workerId
instance_id → worker instance
capabilities → declared service capabilities
jti → revocation lifecycle
```

An independent worker process proved issue, authenticated use, wrong binding denial, revocation, renewal and expiry. Service identity did not grant Tenant selection, platform administration or assignment ownership. The historical static HS256 mode remains available only to its already-certified controlled/single-host profile and is not part of the MH02 production composition.

**Gate MH02-B:** `PASS`.

## MH02-C — Secrets and edge

### Vault and shared metadata

Vault KV v2 owns secret material. Shared PostgreSQL owns only metadata/reference/version. Control Plane A created the secret and Control Plane B described/resolved it without plaintext disclosure. The lifecycle passed:

```text
create → describe → resolve/verify → concurrent CAS rotate → resolve new version → revoke
```

Concurrent rotations produced one winner. Invalid AppRole credentials returned `SECRET_PROVIDER_AUTHENTICATION_FAILED`. Provider suspension returned `SECRET_PROVIDER_UNREACHABLE`, blocked dependent readiness and recovered after the provider resumed. Secret plaintext, Vault credentials and provider tokens had zero evidence matches.

Vault HA was not exercised: classification is `SINGLE_INSTANCE_EXTERNAL`, not `HA_FAILOVER_PROVEN`.

### Shared limiter and trusted edge

The edge distributed requests across CP A/B while the PostgreSQL limiter enforced one shared bucket. Five execution probes returned:

```text
200, 200, 200, 200, 429
```

The final response included `Retry-After`; successful requests were served by both instances. Client-supplied forwarding headers were stripped by the edge, and the Control Planes accepted forwarded identity only from `127.0.0.2/32` with edge attestation. The spoofed IP did not become the rate-limit identity.

CORS allowed the configured browser origin and authorization preflight, denied an arbitrary origin, and preserved HSTS/security headers. When shared limiter authority was paused, protected mutations failed closed with `RATE_LIMITER_UNAVAILABLE`; readiness blocked and recovered without local fallback.

**Gate MH02-C:** `PASS`.

## MH02-D — Telemetry and network failures

Both Control Plane instances exported structured logs, metrics and traces to the authenticated HTTPS OTLP receiver. W3C trace context crossed edge → Control Plane → independent worker process. Telemetry distinguished `mh02-cp-a` and `mh02-cp-b` without placing request/job IDs in metric labels.

Collector outage did not crash or roll back workload operations. Per-signal queues remained bounded at eight entries, health became degraded, and export recovered after receiver restart. Shutdown uses bounded flush semantics.

Network acceptance proved:

- trusted TLS success;
- untrusted certificate rejection;
- hostname mismatch rejection;
- bounded DNS failure;
- bounded connection refusal;
- partial-outage policy: Vault blocks secret-dependent readiness, while telemetry outage degrades the side channel without corrupting authority.

**Gate MH02-D:** `PASS`.

## MH02-E — Integrated acceptance

```text
browser/client
   ↓ HTTPS
trusted edge / load balancer
   ↓
Control Plane A   Control Plane B
        ↓ shared PostgreSQL

external HTTPS OIDC/JWKS
external Vault KV v2 + TLS gateway
shared PostgreSQL rate limiter
external authenticated HTTPS OTLP receiver
```

Integrated scenarios A–L passed: authenticated edge request, cross-instance authority, Vault-backed readiness, Vault outage, JWKS rotation, IdP outage/cache policy, global limiter, forwarding spoof rejection, OTLP outage, TLS failure, DNS failure and one-Control-Plane process loss. After CP A terminated, the edge continued through CP B.

The `/operations/providers` browser surface consumed backend-owned provider status. Four normative viewports passed with:

```text
accessibility failures: 0
horizontal overflow: 0
page errors: 0
unexpected console errors: 0
token in URL/storage: false
secret plaintext in DOM: false
```

Operator diagnostics expose provider classification, readiness and reason codes without endpoints, credentials or secret material.

**Gate MH02-E:** `PASS`.

## Findings and blocker updates

These are post-15.5/global-certification dispositions; the historical EPIC-15.5 table is unchanged.

| Item | MH02 disposition | Boundary |
| --- | --- | --- |
| `ACS-ORG-002` | `RESOLVED_FOR_EXTERNAL_PROVIDER_TOPOLOGY` | live external Vault, shared metadata, service auth, CAS/outage/leakage proven; provider HA deferred |
| `ACS-ORG-010` | `RESOLVED_FOR_DUAL_INSTANCE_TOPOLOGY` | global bucket across CP A/B through edge; physical cross-host remains MH03 |
| `ACS-ORG-018` | `ACCEPTABLE_DEFERRED` | provider provisioning/repair remains external operator responsibility |
| `ACS-ORG-021` | `MATERIALLY_REDUCED` | explicit provider composition/readiness removes hidden fallback; infrastructure provisioning remains deployment prerequisite |
| `MANAGED_IDENTITY_PROVIDER_UNAVAILABLE` | `RESOLVED_FOR_EXTERNAL_PROCESS_TOPOLOGY` | managed SaaS/HA not claimed |
| `MANAGED_SECRET_PROVIDER_UNAVAILABLE` | `RESOLVED_FOR_EXTERNAL_PROCESS_TOPOLOGY` | Vault HA not claimed |
| `MANAGED_TELEMETRY_PROVIDER_UNAVAILABLE` | `RESOLVED_FOR_EXTERNAL_PROCESS_TOPOLOGY` | managed retention/alerting not claimed |
| `TRUSTED_EDGE_TOPOLOGY_UNAVAILABLE` | `RESOLVED_FOR_DUAL_PROCESS_TOPOLOGY` | physical edge/host failover not claimed |

## Evidence and classification

- manifest: `/tmp/acs-post15-5-aees-mh-mh02-evidence/manifest.json`;
- screenshots: four files under the same evidence directory;
- sensitive scan: six categories, all zero;
- final evidence timestamp: `2026-08-17T03:45:42.588Z`;
- Control Plane PIDs: `914392`, `914405`;
- B02→MH02 regression: `52/52 PASS` with `--test-concurrency=1`;
- default-concurrency diagnostic run: `50/52 PASS`, with D02/D03 classified `TEST_INFRASTRUCTURE_CONTENTION` after the complete serial pass;
- topology: `DUAL_PROCESS_SHARED_STATE_WITH_EXTERNAL_PROVIDERS`;
- physical multi-host: `NOT PROVEN`;
- cross-host workers/partitions/deployment: `NOT EXECUTED`;
- Global Production Ready: `NOT CERTIFIED`.

MH02 authorizes MH03. Only MH03 may promote physical multi-host, cross-host worker, host-failure, partition and cross-host deployment/rollback claims.

## Validation result

| Validation | Result |
| --- | --- |
| `git diff --check` | `PASS` |
| `npx tsc -p tsconfig.json --noEmit` | `PASS` |
| official backend `npm run build` | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` under repository `dist/` |
| backend emit to `/tmp/acs-mh02-dist-final` | `PASS` |
| official frontend build | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` on `static/tsconfig.app.tsbuildinfo` |
| frontend build in `/tmp/acs-mh02-static-final` | `PASS` |
| B02→MH02 regression, serial | `52/52 PASS` |
| integrated MH02 process/browser acceptance | `PASS` |

The official emit failures use the historical path with different casing (`/mnt/d/Rede/Github/Axodus/ACS`) and are specific to the execution filesystem. Compiler configuration was not changed; equivalent clean emits in writable `/tmp` passed.
