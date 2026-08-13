# M06 — Financial Audit, Compliance & Risk

Status: PASS / IMPLEMENTED

## Mission

Expose a read-only, evidence-bounded financial audit, compliance and risk
boundary. No audit certification, compliance certification, tax/legal
readiness or productive financial operation is implemented.

## Scope

- financial audit trail boundary
- evidence correlation matrix
- compliance boundary
- tax/legal readiness caveats
- financial risk register
- no-claim discipline
- Product API projection: `GET /api/v1/system/financial-audit`

## Out of scope

- audit certification or immutable ledger
- compliance certification or legal attestation
- tax readiness or tax automation
- accounting/provider integration

## Candidate stories

- audit evidence remains candidate-only and not audit-grade
- compliance domains remain blocked by legal, tax and provider review
- tax/legal readiness is explicitly not claimed
- risk visibility and no-claim discipline are surfaced without hiding blockers

## Candidate Product API surfaces

- GET /api/v1/system/financial-audit (read-only)

## Candidate UI surfaces

- Financial Audit & Compliance (read-only)

## Required decisions before implementation

- Jurisdiction and tax/legal decisions remain unresolved.
- Compliance approvals and provider/accounting reviews remain deferred.
- Audit-grade evidence and immutable retention remain deferred.

## Acceptance criteria

- endpoint is GET-only and returns claim: not_claimed
- financial audit, compliance and tax claims remain blocked/not claimed
- no audit/compliance/tax certification or attestation is introduced
- no ledger, accounting integration or provider compliance operation exists

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed
- Receipt Ready: NO / not yet claimed
- Settlement Ready: NO / not yet claimed
- Reconciliation Ready: NO / not yet claimed
- Financial Audit Ready: NO / not yet claimed
- Compliance Ready: NO / not yet claimed
- Tax Ready: NO / not yet claimed
- Production Financial Operations: NO / not yet claimed

## Dependencies

- M05 — Receipts, Settlement & Reconciliation
- M07 — Billing UX & Operator Acceptance

## Deferred scope

- compliance certification
- legal/tax readiness
- tax automation
- accounting integration and ledger
- audit certification
- provider compliance integration

## Implementation note

S08 is implemented as a read-only Product API and Control Plane projection.
Formal caveat: preserve the S03-S06 remote sequencing deviation until final
EPIC-13 closure.
