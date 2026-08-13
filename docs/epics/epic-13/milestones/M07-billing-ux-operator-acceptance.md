# M07 — Billing UX & Operator Acceptance

Status: PASS / IMPLEMENTED

## Mission

Expose a read-only operator review flow across the existing EPIC-13 financial
boundary projections. The surface does not calculate billing truth, approve
operations or make financial readiness claims.

## Scope

- operator review flow across S03-S08
- billing information architecture and cross-boundary navigation
- claim display consistency and state taxonomy
- blockers, caveats and deferred-scope visibility
- no-action financial guardrails
- browser/manual acceptance baseline

## Out of scope

- billing/payment/invoice actions
- financial approval workflow
- full browser certification
- production readiness claims

## Candidate stories

- operator can review S03-S08 boundaries in a prescribed order
- every claim remains NO / not yet claimed
- blocked, deferred, unavailable and evidence-only states remain distinguishable
- browser/manual checklist is recorded without a browser certification claim

## Candidate Product API surfaces

- Existing GET-only financial boundary projections from S03-S08

## Candidate UI surfaces

- Billing UX & Operator Acceptance - /system/billing-acceptance

## Required decisions before implementation

- Product API remains the source of truth; UI remains a projection.
- Operator review flow is not a productive approval flow.
- Browser real execution remains deferred to S10 or an explicit manual run.

## Acceptance criteria

- all financial boundaries are reachable through the review flow
- no financial readiness or acceptance claim is upgraded
- no productive financial action is rendered
- browser/manual acceptance baseline is documented as NOT EXECUTED

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
- Billing UX Accepted: NO / not yet claimed
- Operator Acceptance Ready: NO / not yet claimed
- Browser Acceptance Ready: NO / not yet claimed
- Production Financial Operations: NO / not yet claimed

## Dependencies

- M06 — Financial Audit, Compliance & Risk
- M08 — Final Hardening & Closure

## Deferred scope

- full browser certification
- production billing UX
- financial actions and approval workflow
- payment/invoice/tenant billing operation
- EPIC-14+ financial operations

## Implementation note

S09 is implemented as a read-only Control Plane operator acceptance surface and
manual/browser baseline. Browser real execution is NOT EXECUTED. Preserve the
formal S03-S06 remote sequencing caveat until final EPIC-13 closure.
