# AEES-RP / HOTFIX-03 — Runtime Application Provenance Trace

## Status

```text
HOTFIX-03: COMPLETE
RP01: PASS
RP02: PASS
RP03: FAIL
AEES-RP: NOT CLOSED
```

HOTFIX-03 establishes provenance only. It does not authorize or claim a readiness correction.

## Target symptom

The operator-visible Overview renders `Critical blockers` with the subtitle `Operational errors requiring attention` and six historical readiness messages.

## Runtime chain

```text
http://127.0.0.1:3000/
→ PID 955611, Vite development server
→ /mnt/d/Rede/Github/Axodus/ACS/.design/app-standalone
→ index.html
→ /src/main.tsx
→ /src/App.tsx :: Dashboard
→ productApi.getDashboardSummary()
→ GET http://127.0.0.1:8788/api/v1/dashboard
→ PID 972906, node scripts/acs-http.mjs
→ /mnt/d/Rede/Github/Axodus/ACS at 9f98b5fc5be1f86636db73c5f574e14c075ee555
→ routeProductApiRequest()
→ ProductApiClient.getDashboardSummary()
→ ProductApiClient.getGlobalReadinessSummary()
→ createEpic10ReadinessReport()
→ Dashboard finding rows
```

## Listener and process inventory

The host listener inventory on August 17, 2026 identified:

| Port | PID | Process | Working directory | Role |
| ---: | ---: | --- | --- | --- |
| 3000 | 955611 | Vite via `pnpm dev` | `.design/app-standalone` | User-visible Control Plane UI |
| 8788 | 972906 | `node scripts/acs-http.mjs` | repository root | Product API backend |

The Vite server listens on `0.0.0.0:3000`. The API listens on `127.0.0.1:8788`.

## Exact target URL and HTML fingerprint

The root Overview route is:

```text
http://127.0.0.1:3000/
```

The fetched HTML returned `200 OK`, title `ACS Standalone Control Plane`, root marker `<div id="root"></div>`, Vite client `/@vite/client`, and source entry `/src/main.tsx`.

`/acs` and `/operations/overview` on port 3000 return the same SPA HTML, but the source router maps the Dashboard Overview to `/`. Port 8788 does not serve HTML: `/acs` and `/` return JSON `404 route not found`.

## Bundle and component mapping

This is a Vite development bundle, not a hashed production artifact. The served module chain is:

```text
/src/main.tsx
→ BrowserRouter
→ App from /src/App.tsx
→ route "/"
→ Dashboard component
```

`App.tsx` contains the exact visible labels:

```text
Critical blockers
Operational errors requiring attention
```

and renders `summary.blockers` as `FindingRow` entries.

This proves that `static/src/operations/DashboardOverviewApp.tsx`, created during HOTFIX-01, is not the application currently serving the user's Overview. HOTFIX-01 corrected a parallel surface.

## Network and API provenance

The active frontend defines:

```text
VITE_ACS_API_BASE_URL ?? http://127.0.0.1:8788/api/v1
```

`productApi.getDashboardSummary()` calls `GET /dashboard`. A direct host call to `GET http://127.0.0.1:8788/api/v1/dashboard` returned `200 OK` and all six visible messages in both `data.blockers` and `data.criticalBlockers`.

The backend route is `src/http/routes/product-api-routes.ts::routeProductApiRequest()`. It constructs `ProductApiClient` with readiness signals derived from the active `ControlPlaneContext`, then delegates to `ProductApiClient.getDashboardSummary()`.

## Active composition

The runtime response reported:

```text
authMode: development
secretBackend: memory
persistenceBackend: database
settlementBackend: production
observabilityExporterEnabled: false
remoteWorkerSupported: false
liveDeploymentEnabled: false
rateLimitEnabled: true
```

Therefore the process is not running the certified external-provider composition. The active process truthfully describes its current development composition, even though the wording is historical and incompatible with the broader certified-topology claims.

## Source of each residual blocker

| Visible message | Runtime descriptor | Producer |
| --- | --- | --- |
| in-memory/filesystem credential storage | `secretBackend=memory` | `credentialHandlingDomain()` in `epic-10-readiness.ts` |
| HTTP auth disabled/mock-only | `authMode=development` | `authDomain()` |
| external exporters disabled | `observabilityExporterEnabled=false` | `observabilityDomain()` |
| local-only worker | `remoteWorkerSupported=false` | `remoteWorkerDomain()` |
| in-memory/filesystem secret store | `secretBackend=memory` | `secretBackendDomain()` |
| sandbox-only deployment governance | `liveDeploymentEnabled=false` | `deploymentEligibilityDomain()` |

The duplicated secret messages are produced by two distinct readiness domains (`credential-handling` and `secret-backend`) from the same active secret descriptor.

## Frontend/backend alignment and stale-build assessment

Both frontend and backend run from the same checkout and HEAD:

```text
repository: /mnt/d/Rede/Github/Axodus/ACS
branch: dev
HEAD: 9f98b5fc5be1f86636db73c5f574e14c075ee555
```

The frontend is Vite source mode and the backend was started by `pnpm http`, which executes `npm run build` before `scripts/acs-http.mjs`. No service worker, alternate checkout, container image, stale generated frontend bundle, or frontend/backend version mismatch is needed to explain the symptom.

## Primary classification

```text
H — CURRENT_BUILD_PROJECTION_DEFECT
```

More precisely, the visible Overview correctly renders the response of the active development composition, while the projection lacks the required distinction between:

```text
active local process configuration
vs
certified topology capability/readiness claim
```

The first RP fix did not affect this path because it targeted `static/`, while the running UI is `.design/app-standalone`.

## Root cause

The six blockers continue to appear because the active `acs-http` process was started with default development adapters. `product-api-routes.ts` converts those active descriptors into Epic-10 blocker findings, `/api/v1/dashboard` returns them, and `.design/app-standalone/src/App.tsx` renders them verbatim.

This is not a browser cache or stale-bundle defect. It is an active-runtime projection/path defect combined with HOTFIX-01 targeting the wrong frontend application.

## Authorized next action

Classification H authorizes HOTFIX-04 against the proven path:

1. define the intended certified-topology versus active-composition projection contract;
2. correct the backend authority used by `/api/v1/dashboard` without hiding genuinely unsafe active composition;
3. update `.design/app-standalone` only if presentation changes are required;
4. restart `pnpm http` and validate the Overview at `http://127.0.0.1:3000/` through browser/network evidence.

Until HOTFIX-04 and browser acceptance complete:

```text
RP03: FAIL
AEES-RP: NOT CLOSED
```

## Evidence

Root manifest:

```text
/tmp/acs-aees-rp-hotfix03-provenance/manifest.json
```

Evidence contains no bearer tokens, cookies, session identifiers, credentials, private keys, or secret material.
