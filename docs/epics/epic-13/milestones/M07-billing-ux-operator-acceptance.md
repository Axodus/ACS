# M07 — Billing UX & Operator Acceptance

Status: PLANNING

## Mission

Sketch the billing operator surface without calculating billing truth in UI.

## Scope

- operator billing review flow
- billing IA
- read-only UX
- approval states
- no UI-calculated billing truth
- browser acceptance candidates

## Out of scope

- billing UI logic
- browser test implementation
- functional acceptance implementation

## Candidate stories

- define operator review flow
- define billing information architecture
- define read-only UI states
- define browser acceptance candidates

## Candidate Product API surfaces

- GET /api/v1/system/billing-readiness
- GET /api/v1/system/billing-boundary

## Candidate UI surfaces

- Billing Boundary
- Financial Truth
- Pricing & Quote Review
- Invoice Candidates
- Payment Rails Boundary
- Tenant Billing Responsibility
- Receipts / Settlement / Reconciliation
- Financial Audit & Compliance
- Billing Acceptance

## Required decisions before implementation

- What is read-only vs actionable?
- What approval states exist?
- What browser acceptance evidence is required?

## Acceptance criteria

- no UI-calculated billing truth
- browser acceptance remains a candidate
- no implementation is implied

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed

## Dependencies

- M06 — Financial Audit, Compliance & Risk
- M08 — Final Hardening & Closure

## Deferred scope

- billing UI implementation
- browser automation
- functional acceptance suite
