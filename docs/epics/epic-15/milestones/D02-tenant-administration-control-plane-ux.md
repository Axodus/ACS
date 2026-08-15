# Milestone D02 — Tenant Administration Control Plane UX

## Discovery

The Control Plane frontend lives under `static/` and already had a single-page shell, shared layout primitives, and the EPIC-14 navigation/accessibility patterns. D02 adds the tenant administration surface as a client of the D01 Product API only.

Relevant implementation inputs:

- `static/src/App.tsx` route switch now delegates `/admin/tenants` to the tenant administration app.
- `static/src/admin/api.ts` provides the typed Product API client for tenant list/detail, lifecycle, membership, governance, entitlements, limits, and evaluation.
- `static/src/admin/TenantAdministrationApp.tsx` implements the new administrative routes, tabs, confirmations, and state handling.
- `static/vite.config.ts` proxies `/api` to the local control-plane backend during development.

## Routes implemented

Platform and tenant scoped routes:

- `/admin/tenants`
- `/admin/tenants/:tenantId`
- `/admin/tenants/:tenantId/members`
- `/admin/tenants/:tenantId/governance`
- `/admin/tenants/:tenantId/entitlements`
- `/admin/tenants/:tenantId/limits`

The UI also preserves deep-linking and browser back/forward behavior through history state.

## Navigation integration

- The Control Plane shell now routes all `/admin/tenants` paths to the administrative tenant app.
- Public landing content remains available outside that namespace.
- Breadcrumbs, tabs, and tenant list links use SPA navigation and keep route state explicit.

## Information architecture

The implemented detail view uses a compact hierarchy:

- tenant list
- tenant detail
  - overview
  - members
  - governance
  - entitlements
  - limits

The detail header shows tenant identity, status, revision, update timestamp, and owner summary. The overview tab surfaces lifecycle, ownership, and summary counts.

## UI behavior

### Tenant listing

- loads from `GET /api/v1/admin/tenants`
- supports search and status filtering
- shows tenant identity, status, owner summary, membership summary, governance summary, limits, and last update
- renders loading, empty, error, and retry states

### Tenant detail

- loads from `GET /api/v1/admin/tenants/:tenantId`
- provides lifecycle actions for activate, suspend, reactivate, and archive
- provides tabbed sections for members, governance, entitlements, and limits
- keeps terminal/archive semantics read-only where appropriate

### Membership

- list/add/change role/suspend/reactivate/remove flows are wired to D01
- ownership transfer is exposed as a distinct confirmation flow
- role presentation keeps platform authority out of membership roles

### Governance

- shows the current policy and the explicit default-deny contract when no policy exists
- supports policy replacement and decision inspection
- preserves governed-action visibility without a DSL editor

### Entitlements and limits

- renders configured state and mutation actions via the API
- displays configured/system/effective limit values when available
- does not invent usage or metering

## Responsive and accessibility behavior

- validated across desktop, tablet, and mobile viewports
- no horizontal overflow in the acceptance matrix
- explicit labels, dialog semantics, and status badges are wired into the implemented surface
- loading, empty, error, forbidden, and confirmation states remain visible to the user

## Browser acceptance evidence

Acceptance manifest:

- `/tmp/acs-epic15-browser-evidence/manifest.json`

Summary:

- status: PASS
- routes tested: 33
- routes passed: 33
- routes failed: 0
- viewports tested: 4
- screenshots captured: 33
- accessibility checks: 33
- horizontal overflow failures: 0
- page errors: 0
- console errors: 0

Selected coverage included:

- tenant list across four viewports;
- tenant detail across four viewports;
- members, governance, entitlements, and limits tabs across four viewports;
- a lifecycle mutation proof that suspended `tenant-alpha` and captured the post-mutation state.

## Deferred scope

- full audit/history surface;
- separate usage presentation;
- broader control-plane redesign;
- any backend mutation path beyond the D01 contracts;
- any direct domain/repository imports into the UI.

## Acceptance result

Implemented and browser-accepted. D02 now provides the administrative Control Plane UX for tenant administration, consuming the D01 Product API as the sole mutation and read boundary.
