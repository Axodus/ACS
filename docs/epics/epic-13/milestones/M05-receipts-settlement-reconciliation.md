# M05 — Receipts, Settlement & Reconciliation

Status: PLANNING

## Mission

Define operational receipts and settlement/reconciliation visibility.

## Scope

- operational receipt vs legal receipt
- settlement visibility
- reconciliation evidence
- provider/accounting caveats
- Product API candidate: `/api/v1/system/settlement-reconciliation`

## Out of scope

- settlement engine
- reconciliation engine
- accounting integration
- legal receipt claim

## Candidate stories

- define operational receipt semantics
- define settlement visibility
- define reconciliation evidence
- define provider and accounting caveats

## Candidate Product API surfaces

- GET /api/v1/system/settlement-reconciliation

## Candidate UI surfaces

- Receipts / Settlement / Reconciliation
- Billing Acceptance

## Required decisions before implementation

- Are receipts operational or legal?
- Is provider settlement in scope now?
- Is accounting integration deferred?

## Acceptance criteria

- receipt is not claimed as legal by default
- settlement and reconciliation remain visible only as boundaries
- no implementation is implied

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed

## Dependencies

- M03 — Payment Rails Boundary
- M06 — Financial Audit, Compliance & Risk

## Deferred scope

- settlement engine runtime
- reconciliation automation
- accounting integration
