# AEES-RP / HOTFIX-02 — Overview Provenance

## Status

```text
FAIL — current localhost Overview not proven to be DashboardOverviewApp
RP03: FAIL
AEES-RP: NOT CLOSED
```

## Objective

Identify the exact localhost URL, network endpoint and React bundle/component used by the Overview currently opened by the operator.

## Findings

### Localhost URL

The repository's documented ACS HTTP process defaults to:

```text
http://127.0.0.1:8788/acs
```

The static Vite application has no configured default port and proxies `/api` to `http://127.0.0.1:8788`. Its public landing route is `/`; the only operational routes present in this repository are:

```text
/operations/providers
/operations/overview
/admin/tenants
```

`/operations/overview` is the newly added HOTFIX-01 surface, not an existing historical Dashboard Overview recovered from the repository.

### Network endpoint

The Product API endpoint intended to provide dashboard blockers is:

```text
GET /api/v1/dashboard
```

It is implemented by `routeProductApiRequest()` and delegates to `ProductApiClient.getDashboardSummary()`.

The repository does not contain browser-network evidence showing that the user's currently opened localhost Overview requests this endpoint. The existing static application before HOTFIX-01 did not implement a dashboard consumer for `/api/v1/dashboard`.

### Bundle/component provenance

The current repository contains:

```text
static/src/App.tsx
static/src/components/ProductUI.tsx
static/src/admin/TenantAdministrationApp.tsx
static/src/operations/ManagedProvidersApp.tsx
```

`ProductUI.tsx` is a static marketing preview. It does not fetch readiness or blockers.

`DashboardOverviewApp.tsx` now fetches `/api/v1/dashboard`, but it is a HOTFIX-01 addition and therefore cannot be assumed to be the page currently opened by the user.

### Runtime limitation

No listener or browser session was active in the execution environment on August 17, 2026. A direct WebDriver attempt was environment-blocked by `listen EPERM`; no valid browser/network capture was produced.

## Decision

The current user-visible Overview remains unproven. Therefore:

```text
Browser still shows historical blockers: UNRESOLVED
RP03: FAIL
AEES-RP: NOT CLOSED
```

The six historical blockers must not be considered eliminated from the actual user page until browser DevTools/WebDriver evidence proves:

1. the exact URL opened;
2. the response containing the blocker messages;
3. the bundle and React component rendering that page.

## Next evidence required

Capture one real browser session against the user's localhost URL, recording:

```text
URL
request URL + status
response field containing blockers
loaded JS asset
React component/source map provenance
```

No readiness gate is promoted by this document.
