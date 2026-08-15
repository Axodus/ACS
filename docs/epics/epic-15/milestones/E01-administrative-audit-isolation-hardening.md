# EPIC-15 Milestone E01 — Administrative Audit Trail & Isolation Hardening

## Discovery

The EPIC-15 control-plane stack already had canonical tenant lifecycle, membership, governance, enforcement, and Product API boundaries. E01 tightened the administrative audit trail so those boundaries can be reconstructed from real events and queried tenant by tenant without inventing synthetic history.

## Implemented scope

- canonical administrative audit event projection and read model;
- tenant-scoped audit list/detail routes in the Administrative Product API;
- tenant-scoped audit tab in the Control Plane UX;
- forged tenant-context rejection on audit reads and body/path mismatches;
- cross-tenant hardening for membership and audit mutations/reads;
- platform authority kept explicit and separate;
- regression coverage for audit, cross-tenant, and forged-context paths.

## Canonical administrative audit event

The underlying event contract is the existing tenant-scoped administrative event emitted by lifecycle, membership, governance, entitlement, limit, and enforcement mutations.

Projected audit fields:

- eventId
- correlationId
- tenantId
- category
- eventType
- action
- targetType / targetId
- actor
- authorityBasis
- authorityKind
- authorityPrincipalId
- deniedLayer
- previousState / nextState
- governanceDecision / entitlementDecision / limitDecision
- outcome
- reason
- timestamp
- revision
- summary

## Event categories

- tenant.lifecycle
- tenant.membership
- tenant.ownership
- tenant.governance
- tenant.entitlement
- tenant.limit
- tenant.enforcement

## Correlation and attribution

- Mutations keep a shared correlation id through request, decision, domain mutation, and audit projection.
- Actor attribution is always tenant-scoped or explicit platform authority.
- Target tenant is resolved from the request path or context and conflicting body tenantIds are rejected.

## Audit persistence / read model

- No new audit database or generic observability layer was added.
- Audit history is projected from real events already held by the audit service.
- Read access is tenant-scoped and read-only.
- No synthetic history is generated to fill empty UI states.

## Administrative audit API

- GET /api/v1/admin/tenants/:tenantId/audit
- GET /api/v1/admin/tenants/:tenantId/audit/:eventId

Query filters supported:

- category
- outcome
- actor
- correlationId
- eventType

## Audit UI

- Added an Audit tab to the tenant administration detail view.
- The tab is read-only and consumes the Administrative Product API only.
- It surfaces real tenant-scoped audit entries and keeps empty/error/forbidden states explicit.

## Isolation hardening

Rechecked and enforced:

- tenant detail, members, governance, entitlements, limits, and audit stay tenant-scoped;
- platform authority remains explicit and separate;
- tenant-admin scope does not become global authority;
- conflicting tenant sources are rejected instead of silently resolved;
- archived and suspended tenant semantics remain consistent across reads and mutations.

## Tests

- Administrative Product API regression now covers audit list/detail and forged-context denial.
- Cross-tenant audit read denial is covered.
- Membership body/path tenant mismatch is covered.

## Validation

- git diff --check — pass
- npx tsc -p tsconfig.json --outDir /tmp/epic15-e01-dist --declaration false --emitDeclarationOnly false --rootDir src — pass
- node --test on the EPIC-15 product API regression against the /tmp build — pass
- npx tsc -p static/tsconfig.app.json --noEmit — pass
- npx vite build --outDir /tmp/epic15-static-dist from static/ — pass
- npm run build and npm --prefix static run build remain blocked by EROFS when they try to write in-repo emit artifacts

## Deferred

- no generic observability platform;
- no SIEM or log shipping;
- no synthetic audit records;
- no broad UI browser certification harness in this repo;
- no new audit persistence backend.

## Acceptance

E01 is complete at the code and documentation level for the implemented audit/history hardening. Browser certification remains deferred because this repository does not expose a dedicated EPIC-15 browser acceptance harness or manifest.
