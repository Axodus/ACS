# M01 — Billing Boundary & Financial Truth

Status: PLANNING

## Mission

Define the financial truth boundary for EPIC-13 without implementing billing.

## Scope

- financial truth source
- no invented values
- billable event definition
- billing intent
- billing readiness gates
- audit immutability
- source evidence
- Product API candidate: `/api/v1/system/billing-boundary`

## Out of scope

- real billing logic
- payment capture
- invoice generation
- tenant billing operation
- financial execution code

## Candidate stories

- define the financial truth model
- define billable event semantics
- define evidence required for billing claims
- define readiness gates for billing

## Candidate Product API surfaces

- GET /api/v1/system/billing-boundary
- GET /api/v1/system/financial-truth
- GET /api/v1/system/billing-readiness

## Candidate UI surfaces

- Billing Boundary
- Financial Truth
- Billing Acceptance

## Required decisions before implementation

- What is the source of financial truth?
- What counts as a billable event?
- What evidence is required for a billing claim?
- What gates must pass before any operational billing work?

## Acceptance criteria

- boundary is explicit
- no invented financial values
- no readiness claim is introduced
- no implementation is implied

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed

## Dependencies

- EPIC-13 / S02 Executive Plan
- EPIC-13 / M02 Pricing, Quote & Invoice Contracts

## Deferred scope

- production billing execution
- payment rails execution
- invoice production claims
