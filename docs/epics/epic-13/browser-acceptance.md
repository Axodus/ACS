# EPIC-13 Browser / Manual Acceptance Baseline

Status: NOT EXECUTED / harness available

This document records the operator acceptance baseline for the billing and
financial operations Control Plane surfaces delivered in EPIC-13 S03-S09.

## Scope of acceptance

- All financial boundary surfaces are reachable from navigation.
- All surfaces are read-only and consume Product API as source of truth.
- All financial readiness claims render as NO / not yet claimed.
- Blockers, caveats and deferred scope are visible on each surface.
- No productive financial actions (charge, invoice, payment, refund,
  settlement, reconcile, legal/tax document) are offered.
- Loading, error, empty and stale states do not imply readiness.
- State taxonomy (candidate, blocked, deferred, not_claimed, etc.) is
  distinguishable from ready states.

## Surfaces

1. Billing Boundary and Financial Truth — /system/billing-boundary
2. Pricing and Invoice Boundary — /system/pricing-invoice-boundary
3. Payment Rails Boundary — /system/payment-rails-boundary
4. Tenant Billing and Account Responsibility — /system/tenant-billing-boundary
5. Receipts, Settlement and Reconciliation — /system/settlement-reconciliation
6. Financial Audit, Compliance and Risk — /system/financial-audit
7. Billing UX and Operator Acceptance — /system/billing-acceptance

## Acceptance checklist (manual / browser)

- [ ] Navigate from sidebar to each billing surface without error.
- [ ] Each surface header shows a read-only financial guardrail banner.
- [ ] Claims sections show NO / not yet claimed consistently.
- [ ] Blockers and warnings are visible without deep navigation.
- [ ] Caveats and deferred scope remain visible.
- [ ] Cross-links between boundaries are present and functional.
- [ ] Loading state does not change any claim to ready.
- [ ] Error state does not hide caveats or imply success.
- [ ] Empty/partial data states show explicit unavailable or partial evidence.
- [ ] Stale data banner, when present, does not upgrade claims.
- [ ] No button or link text contains productive financial actions.
- [ ] No route or action leads to a billing/payment/invoice mutation.
- [ ] Mobile/narrow viewport smoke remains usable.
- [ ] Keyboard/basic focus smoke remains usable.
- [ ] No raw secrets or invented monetary values appear.

## Forbidden operator actions

- charge
- bill tenant
- create invoice
- issue invoice
- capture payment
- authorize payment
- refund
- chargeback
- settle
- reconcile
- generate legal receipt
- generate tax invoice
- configure payment provider
- connect accounting
- approve financial operation

## Browser real execution

- Harness: .design/app-standalone/tests/browser-acceptance-harness.test.mjs
  and .design/app-standalone/tools/browser-acceptance.mjs
- Real browser run: NOT EXECUTED in S09 unless executed separately
- Result: NOT EXECUTED / pending S10 or explicit manual run

## Formal caveats retained

- S05/S06 were observed before S03/S04 in remote commit order. Milestone
  commits exist; preserve this sequencing caveat until final EPIC-13 closure.
- No production financial readiness claim is made.
- No browser certification is claimed.

## Sign-off

Operator acceptance baseline recorded. Full browser certification and
production billing UX remain deferred.
