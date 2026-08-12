# Candidate Inventory

## A. Core EPIC-13 candidates

- financial truth model
- billing boundary
- billable event model
- pricing boundary
- quote-to-invoice candidate flow
- invoice artifact boundary
- payment rails boundary
- tenant billing responsibility
- payer/operator/tenant actor boundary
- operational receipts
- settlement visibility
- reconciliation evidence
- financial audit trail
- compliance boundary
- billing UX/operator review flow
- billing readiness acceptance

## B. Requires executive decision

- real payment processor integration
- legal/tax invoice compliance
- refunds
- chargebacks
- multi-currency
- subscription/plan management
- pricing configuration
- tenant billing readiness
- external accounting integrations
- real payment capture
- production financial operation claim

## C. Deferred to EPIC-14+

- production payment capture
- accounting integrations
- tax compliance automation
- collections
- revenue recognition
- marketplace payouts
- financial forecasting
- advanced billing suite
- automated dunning
- provider-specific reconciliation

## D. Explicit non-goals

- no real money movement
- no payment capture
- no production invoice claim
- no legal/tax invoice claim
- no tenant billing ready claim
- no simulated billing success
- no invented financial values
- no Product API billing mutation
- no UI billing calculation

## E. Risk / compliance candidates

- financial data integrity
- audit immutability
- payer identity
- operator authority
- tenant accountability
- tax/legal classification
- payment provider risk
- refund/chargeback exposure
- multi-currency ambiguity
- privacy/security of financial records
- secret handling for payment providers

## F. Product API candidate surfaces

- GET /api/v1/system/billing-boundary — candidate only / not implemented in S01
- GET /api/v1/system/financial-truth — candidate only / not implemented in S01
- GET /api/v1/system/billing-readiness — candidate only / not implemented in S01
- GET /api/v1/system/payment-rails-boundary — candidate only / not implemented in S01
- GET /api/v1/system/tenant-billing-boundary — candidate only / not implemented in S01
- GET /api/v1/system/invoice-boundary — candidate only / not implemented in S01
- GET /api/v1/system/settlement-reconciliation — candidate only / not implemented in S01
- GET /api/v1/system/financial-audit — candidate only / not implemented in S01

## G. Control Plane UX candidate surfaces

- Billing Boundary — candidate only / not implemented in S01
- Financial Truth — candidate only / not implemented in S01
- Pricing & Quote Review — candidate only / not implemented in S01
- Invoice Candidates — candidate only / not implemented in S01
- Payment Rails Boundary — candidate only / not implemented in S01
- Tenant Billing Responsibility — candidate only / not implemented in S01
- Receipts / Settlement / Reconciliation — candidate only / not implemented in S01
- Financial Audit & Compliance — candidate only / not implemented in S01
- Billing Acceptance — candidate only / not implemented in S01

## H. Validation / acceptance candidates

- docs-only validation
- claim language validation
- no static changes
- no functional changes
- relative link validation
- future Product API contract tests
- future UI rendering tests
- future browser acceptance
- future financial no-claim scan
- future no-secret scan
