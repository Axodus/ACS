# M02 — Pricing, Quote & Invoice Contracts

Status: PLANNING

## Mission

Specify the pricing and invoice boundary without creating real invoices.

## Scope

- pricing boundary
- quote-to-invoice candidate
- invoice candidate
- invoice artifact
- approval workflow
- tax/legal caveat
- Product API candidates:
  - `/api/v1/system/pricing-boundary`
  - `/api/v1/system/invoice-boundary`

## Out of scope

- invoice production
- legal/tax invoice claim
- payment capture
- pricing engine implementation

## Candidate stories

- define pricing boundary
- define quote-to-invoice transition
- define invoice artifact lifecycle
- define approval workflow for invoice candidates

## Candidate Product API surfaces

- GET /api/v1/system/pricing-boundary
- GET /api/v1/system/invoice-boundary

## Candidate UI surfaces

- Pricing & Quote Review
- Invoice Candidates
- Billing Acceptance

## Required decisions before implementation

- Is pricing configuration in EPIC-13 or deferred?
- Is legal/tax invoice compliance in EPIC-13 or deferred?
- Is quote-to-invoice a candidate only or operational scope?

## Acceptance criteria

- invoice remains a candidate or artifact boundary
- no legal/tax claim is introduced
- no implementation is implied

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed

## Dependencies

- M01 — Billing Boundary & Financial Truth
- M03 — Payment Rails Boundary

## Deferred scope

- invoice production
- tax automation
- pricing engine runtime
