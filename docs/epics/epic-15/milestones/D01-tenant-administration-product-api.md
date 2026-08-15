# Milestone D01 — Tenant Administration Product API

## Discovery

The repository already had canonical tenant, membership, governance, and enforcement services in the control plane. D01 adds the thin HTTP Product API boundary so the Control Plane can consume those domains without reaching into repositories or runtime internals.

Existing shared contracts used by this milestone:

- tenant lifecycle: src/control-plane/tenant-domain.ts
- membership and authority: src/control-plane/tenant-membership.ts
- governance, entitlements, limits, and evaluator contracts: src/control-plane/tenant-governance.ts
- actor/context resolution: src/http/control-plane-context.ts and src/http/auth.ts
- governance enforcement for operational routes: src/http/tenant-governance-enforcer.ts

## Routes introduced

Platform-scoped:

- GET /api/v1/admin/tenants
- POST /api/v1/admin/tenants

Tenant-scoped:

- GET /api/v1/admin/tenants/:tenantId
- POST /api/v1/admin/tenants/:tenantId/activate
- POST /api/v1/admin/tenants/:tenantId/suspend
- POST /api/v1/admin/tenants/:tenantId/reactivate
- POST /api/v1/admin/tenants/:tenantId/archive
- POST /api/v1/admin/tenants/:tenantId/ownership/bootstrap
- POST /api/v1/admin/tenants/:tenantId/ownership/transfer
- GET /api/v1/admin/tenants/:tenantId/members
- GET /api/v1/admin/tenants/:tenantId/members/:principalId
- POST /api/v1/admin/tenants/:tenantId/members
- POST /api/v1/admin/tenants/:tenantId/members/:principalId/change-role
- POST /api/v1/admin/tenants/:tenantId/members/:principalId/suspend
- POST /api/v1/admin/tenants/:tenantId/members/:principalId/reactivate
- POST /api/v1/admin/tenants/:tenantId/members/:principalId/remove
- GET /api/v1/admin/tenants/:tenantId/governance
- GET /api/v1/admin/tenants/:tenantId/governance/policies
- PUT /api/v1/admin/tenants/:tenantId/governance/policy
- POST /api/v1/admin/tenants/:tenantId/governance/evaluate
- GET /api/v1/admin/tenants/:tenantId/entitlements
- PUT /api/v1/admin/tenants/:tenantId/entitlements/:entitlementKey
- DELETE /api/v1/admin/tenants/:tenantId/entitlements/:entitlementKey
- GET /api/v1/admin/tenants/:tenantId/limits
- PUT /api/v1/admin/tenants/:tenantId/limits/:limitKey
- DELETE /api/v1/admin/tenants/:tenantId/limits/:limitKey

## Read models

Administrative responses are projected as stable API views rather than raw aggregates. The main response shapes are:

- TenantAdminSummary
- TenantAdminDetail
- TenantMembership views
- governance policy and evaluation views
- entitlement views
- limit views with effective evaluation

These models expose revision, lifecycle metadata, ownership summary, membership counts, governance summary, and entitlement and limit summaries.

## Actor resolution and authority

- system actor type maps to explicit platform authority.
- tenant-scoped requests require a matching tenant context.
- routes do not infer platform authority from membership.
- all mutations call the existing administrative authority model before touching domain state.

## HTTP semantics

- 400 invalid request or invalid domain input
- 401 missing actor context
- 403 authority or cross-tenant denial
- 404 missing tenant, membership, rule, or governance state
- 409 lifecycle, ownership, membership, or governance conflict
- 429 limit exceeds hard maximum
- 500 unexpected internal failure

Administrative errors are returned as structured envelopes with error.code, error.message, and optional details.

## Mutation and receipt semantics

Mutations return the updated read model plus the domain receipt when available so the Control Plane can refresh without a second fetch. Receipts preserve:

- tenantId
- actor
- operation
- previous value
- next value
- timestamp
- revision
- reason and provenance when provided

## Revision and concurrency

The API preserves domain revisions from the underlying services. The current milestone does not add a new optimistic-locking contract; it relays the revision data produced by the domain services.

## Cross-tenant protections

- platform-scoped routes are explicit
- tenant-scoped routes require matching tenant context or explicit platform authority
- membership, governance, entitlement, and limit reads never reuse another tenant state
- D01 does not add alternate mutation paths around C02 enforcement

## Deferred scope

- UI and D02
- audit storage
- generic IAM and RBAC
- identity provider integration
- billing, pricing, and metering

## Tests

D01 is covered by targeted API tests for:

- tenant listing and detail
- lifecycle create, activate, suspend, reactivate, archive
- ownership bootstrap and transfer
- membership mutation and read paths
- governance, entitlement, and limit read and mutation paths
- cross-tenant denial
- structured HTTP error mapping
- receipt preservation

## Acceptance result

Implemented in Sprint D01 and aligned to the canonical domain services. The Product API is now the stable admin boundary for the future Control Plane UX.
