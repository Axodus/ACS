# C01 — Trusted HTTP Identity & Authorization Boundary

> Historical milestone snapshot. Partial/readiness labels below describe C01 at execution time; current terminal finding status is authoritative in `../operational-gap-inventory.md` and the H closure report.

**Status:** PASS — 2026-08-15

**Finding:** `ACS-ORG-003` RESOLVED for the active production HTTP boundary

**Readiness:** Identity PARTIAL; Security PARTIAL; Operational/Production Ready remain BLOCKED

## Discovery

The real entry path was:

```text
request headers
→ parseMockAuthContext
→ AcsAuthContext
→ route/enforcer authority construction
```

The first trusted step did not exist. `x-acs-actor-id`, `x-acs-actor-type`, `x-acs-tenant-id` and `x-acs-authenticated` were client-controlled. A `system`/`governance` actor, disabled auth, or absent auth could become `platform_admin` inside the governance enforcer. The Tenant Administration browser also sent the same headers from editable local state.

### Identity-source inventory

| Source | Previous use | Client controlled? | Production trust after C01 |
| --- | --- | ---: | --- |
| `Authorization: Bearer` | unused | credential supplied by caller | trusted only after JWT signature and claims validation |
| `x-acs-actor-id` | principal | yes | ignored by OIDC adapter; DEV adapter only |
| `x-acs-actor-type` | actor/global authority hint | yes | ignored by OIDC adapter; DEV adapter only |
| `x-acs-tenant-id` | tenant scope | yes | ignored by OIDC adapter; DEV adapter only |
| `x-acs-authenticated` | authentication state | yes | ignored by OIDC adapter; DEV adapter only |
| `x-platform-admin` or body/query fields | attempted authority | yes | never consumed |
| JWT `sub` | none | signed by trusted issuer | canonical `PrincipalId` |
| configured JWT tenant claim | none | signed by trusted issuer | optional requested-tenant binding |
| configured JWT platform claim/value | none | signed by trusted issuer | explicit `platform_admin` basis |

## Authentication architecture

`src/http/auth.ts` now provides one boundary:

```text
untrusted request
→ HttpIdentityValidator
→ AuthenticatedPrincipal
→ trusted AcsAuthContext
→ existing Membership / AdministrativeAuthority
→ Governance / operation / Audit
```

The production implementation is `OidcJwtIdentityValidator`. It validates JWT bearer credentials using an RSA public key obtained through `JwksProvider`. The active algorithm policy is deliberately small: `RS256` only. Validation includes:

- three-part JWT structure and JSON shape;
- `alg=RS256` and a non-empty `kid`;
- RSA signing-key type, signing use and compatible key algorithm;
- cryptographic signature;
- exact configured issuer;
- configured audience, including array audiences;
- required numeric expiration;
- optional not-before with bounded clock tolerance;
- required non-empty subject.

`RemoteJwksProvider` caches keys for five minutes by default and forces one refresh when a `kid` is not found, allowing controlled signing-key rotation without an ACS restart. Provider/JWKS failure remains distinct from an invalid credential and fails closed.

The remote JWKS URL must be absolute HTTPS. Tests may inject an in-process `JwksProvider`; production configuration cannot silently downgrade the network key source to plain HTTP.

No token or complete claims object is retained in `AcsAuthContext`, response metadata, audit events or error details.

## Configuration

The supported production configuration is:

```text
ACS_ENVIRONMENT=production
ACS_AUTH_MODE=oidc
ACS_OIDC_ISSUER=<exact trusted issuer>
ACS_OIDC_AUDIENCE=<ACS audience>
ACS_OIDC_JWKS_URI=<trusted JWKS URI>
ACS_OIDC_TENANT_CLAIM=<optional; default tenant_id>
ACS_OIDC_PLATFORM_ADMIN_CLAIM=<optional; configured with value>
ACS_OIDC_PLATFORM_ADMIN_VALUE=<optional; configured with claim>
```

Claim name and expected platform value must be configured together. Production profile composition rejects the development validator and rejects incomplete OIDC configuration. There is no production fallback to disabled, mock or header identity.

## Principal and authority mapping

Because one issuer is configured per validator, the validated JWT `sub` is the stable ACS `principalId`. Display names and mutable profile data are not involved.

Authentication does not grant Tenant authority. A normal authenticated principal still requires an active Tenant membership and the existing B01 role checks. An optional signed tenant claim narrows the request context; if present and different from the route target, Tenant Administration rejects the request before domain access. If the claim is absent, the target path is still checked against membership.

Global authority is granted only when the configured claim contains the configured value. `actorType=system`, `x-platform-admin`, body fields and Tenant membership roles cannot create platform authority. The administrative and governance routes consume `auth.platformAdmin` only after `authenticated && trusted` is true.

## HTTP behavior

`createAcsHttpHandler` authenticates before Product API/ACS routing. Only the following remain anonymously readable:

| Route | Authentication | Authority |
| --- | --- | --- |
| `GET /api/v1/health` | optional | none |
| `GET /acs/health` | optional | none |
| `GET /acs/version` | optional | none |
| Product API reads/mutations | required in OIDC mode | existing tenant/platform/governance rules |
| Tenant Administration | required | existing Administrative Authority rules |
| runtime/deployment/Agent mutations | required | existing tenant/governance enforcement |
| audit/history | required | existing tenant/platform scope |

Missing or invalid credentials return `401 authentication_failed`, a stable failure category in `details.category`, and `WWW-Authenticate: Bearer`. An authenticated principal with insufficient authority continues to receive `403`. Identity-provider unavailability is retryable but never converted into allow.

Public liveness/version responses do not expose issuer, audience, claims or key details. The production readiness projection separately reports whether the OIDC validator is configured and whether JWKS is reachable.

## Development compatibility

`DevelopmentHeaderIdentityValidator` is explicit, non-production-oriented and selected only by the development profile. It preserves the existing test and local Control Plane workflow, including the legacy `x-acs-*` headers. The static Tenant Administration client now labels its wire mode `development` rather than `mock`.

Direct Product API route tests without HTTP transport receive the development identity only when the context itself uses the development validator. Production/OIDC contexts have no equivalent fallback.

No login UI, user directory, password flow, invitation flow, SCIM or generic IAM was introduced.

## Audit attribution and leakage

Administrative services receive `actorId` from the validated context. Tenant creation now sets `createdBy` from that principal rather than a body-supplied value. The C01 HTTP audit proof creates a Tenant with forged actor headers and forged `createdBy`, then verifies that the canonical audit event actor is the JWT subject.

Bearer values, Authorization headers, complete JWT payloads and signing keys are not logged, returned or persisted. Authentication failures expose only a bounded category.

## Test evidence

Primary suite: `tests/s47-epic-15-5-trusted-http-identity.test.mjs`.

Covered scenarios:

- valid signature, issuer, audience, expiration, subject and Tenant claim;
- malformed credential, invalid signature, expired/not-active token;
- wrong issuer/audience, missing subject, unsupported algorithm and unknown key;
- JWKS refresh for a rotated `kid`;
- forged actor and forged platform headers through the real HTTP handler;
- normal authenticated principal versus explicitly mapped platform admin;
- cross-Tenant denial and active-membership separation;
- suspended and removed member denial after successful authentication;
- authenticated actor audit attribution and raw-token absence;
- production rejection of development identity and incomplete OIDC configuration;
- readiness G04 without an auth blocker when OIDC/JWKS health is available.

Relevant regressions include HTTP/Product API, Tenant lifecycle, Membership/Authority, Governance, C02 enforcement, audit/isolation, B01 durable HTTP compatibility, B02 secrets/economics, readiness and runtime routes.

Validation results:

- `git diff --check`: PASS;
- backend `npx tsc -p tsconfig.json --noEmit`: PASS;
- official `npm run build`: ENVIRONMENT BLOCKER (`TS5033` / `EROFS` writing repository `dist`);
- equivalent `/tmp/epic15-5-c01/dist` compilation: PASS;
- C01 plus targeted regressions: 17/17 suites PASS;
- complete repository test inventory against the temporary build: 82/82 suites PASS after supplying the repository-relative source/doc fixture paths to the temporary harness;
- frontend `npx tsc -p static/tsconfig.app.json --noEmit`: PASS;
- frontend `npm --prefix static run build`: ENVIRONMENT BLOCKER (`TS5033` / `EROFS` writing `static/tsconfig.app.tsbuildinfo`);
- equivalent frontend Vite output in `/tmp/epic15-5-c01/static-dist`: PASS.

## Acceptance result

| Criterion | Result |
| --- | --- |
| Production validator boundary | PASS |
| Signature/issuer/audience/time validation | PASS |
| Mock/disabled production fallback | BLOCKED |
| Forged actor header accepted | 0 |
| Forged platform authority accepted | 0 |
| Invalid credential accepted | 0 |
| Cross-Tenant authorization violation | 0 |
| Suspended/removed membership bypass | 0 |
| Raw credential audit/API exposure | 0 |
| Real HTTP integration | PASS |

`ACS-ORG-003` is **RESOLVED** for the active HTTP production composition. This means caller-controlled identity headers can no longer establish identity or authority in OIDC mode. It does not certify a specific live identity provider deployment.

## Caveats and deferred scope

- Live IdP/JWKS availability, TLS/DNS behavior and deployment credentials remain H acceptance evidence.
- The development Control Plane has no login UI; it uses the explicit DEV adapter. Product login/session UX belongs to Milestone F.
- Service-to-service identity and remote-worker identity remain Milestone D concerns.
- Distributed rate limiting, trusted origins, security headers, proxy policy, request bounds and timeouts remain C02.
- Authentication does not change existing suspended/archived Tenant semantics or broaden runtime enforcement.

Overall ACS Operational and Production Readiness remain **BLOCKED** by durable distributed runtime, edge controls, observability, production deployment and other open findings.
