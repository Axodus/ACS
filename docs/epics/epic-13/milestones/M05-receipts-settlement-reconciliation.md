# M05 — Receipts, Settlement & Reconciliation

Status: PASS / IMPLEMENTED

## Mission

Expose an evidence-bounded, read-only operational receipt, settlement
visibility and reconciliation boundary. No legal receipt, settlement operation
or accounting reconciliation is implemented.

## Scope

- operational receipt vs legal receipt
- settlement visibility
- reconciliation evidence
- provider/accounting caveats
- Product API projection: `GET /api/v1/system/settlement-reconciliation`

## Out of scope

- settlement engine or bank settlement
- reconciliation engine or job
- accounting integration or ledger
- legal/tax receipt or fiscal document claim

## Candidate stories

- operational receipt evidence boundary is visible
- settlement visibility is provider-dependent and unavailable without a provider
- reconciliation evidence is explicitly not accounting reconciliation
- provider and accounting dependencies remain blocked/deferred

## Candidate Product API surfaces

- GET /api/v1/system/settlement-reconciliation (read-only)

## Candidate UI surfaces

- Receipts / Settlement / Reconciliation (read-only)

## Required decisions before implementation

- Legal/tax receipt jurisdiction remains unresolved.
- Provider selection and productive settlement remain deferred.
- Accounting integration remains deferred.

## Acceptance criteria

- endpoint is GET-only and returns claim: not_claimed
- operational receipt is not claimed as legal/tax receipt
- settlement and reconciliation remain evidence boundaries only
- no provider/accounting integration or reconciliation job exists

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed
- Receipt Ready: NO / not yet claimed
- Settlement Ready: NO / not yet claimed
- Reconciliation Ready: NO / not yet claimed
- Accounting Integration Ready: NO / not yet claimed

## Dependencies

- M03 — Payment Rails Boundary
- M04 — Tenant Billing & Account Responsibility
- M06 — Financial Audit, Compliance & Risk

## Deferred scope

- legal/tax receipt generation
- real payment settlement and provider settlement sync
- reconciliation automation/jobs
- accounting integration, ledger and revenue recognition
- tax automation

## Implementation note

S07 is implemented as a read-only Product API and Control Plane projection.
Formal caveat: preserve the S03-S06 remote sequencing deviation until final
EPIC-13 closure.
