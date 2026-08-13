# M04 — Tenant Billing & Account Responsibility

Status: PASS

## Mission

Define tenant responsibility and payer accountability for billing.

## Scope

- tenant account responsibility
- payer identity
- operator identity
- tenant actor boundary
- account ownership
- tenant billing readiness constraints
- Product API candidate: `/api/v1/system/tenant-billing-boundary`

## Out of scope

- operational tenant billing
- tenant billing readiness claim
- account mutation code

## Candidate stories

- define tenant responsibility
- define payer/operator/tenant boundaries
- define account ownership evidence
- define tenant billing readiness constraints

## Candidate Product API surfaces

- GET /api/v1/system/tenant-billing-boundary

## Candidate UI surfaces

- Tenant Billing Responsibility
- Billing Acceptance

## Required decisions before implementation

- Is tenant billing only modeled or operational?
- What identities are authoritative?
- What evidence proves tenant accountability?

## Acceptance criteria

- tenant boundary is explicit
- no tenant readiness claim is introduced
- no implementation is implied
- read-only tenant billing boundary is exposed
- tenant, payer, operator, and account responsibility remain separated

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed
- Tenant Administration Ready: NO / not yet claimed

## Dependencies

- M01 — Billing Boundary & Financial Truth
- M02 — Pricing, Quote & Invoice Contracts

## Deferred scope

- tenant billing operation
- multi-tenant account execution
