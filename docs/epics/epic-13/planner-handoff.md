# Planner Handoff

## Current status

- S00 — Normative Planning Package: PASS
- S01 — Executive Planning Baseline: in progress / pending until commit
- Functional implementation: none
- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed

## Source documents

- docs/epics/epic-13/AGENTS.md
- docs/epics/epic-13/README.md
- docs/epics/epic-13/EPIC-13_Strategic_Operational_Plan.md
- docs/epics/epic-13/architecture.md
- docs/epics/epic-13/contracts.md
- docs/epics/epic-13/boundary-review.md
- docs/epics/epic-13/stories.md
- docs/epics/epic-13/candidate-inventory.md
- docs/epics/epic-13/milestones/*.md
- docs/epics/epic-12/epic-12-closure-report.md

## Strategic framing

EPIC-13 turns the EPIC-12 economics boundary into a governed planning boundary
for Billing & Financial Operations. The work remains docs-only until explicit
executive approval moves it into implementation.

## Known decisions

- EPIC-13 centers on Billing & Financial Operations.
- S01 remains planning-only.
- No billing/payment/invoice/tenant billing readiness claim is allowed.
- No real money movement is allowed.
- Product API remains source of truth.
- EPIC-12 remains closed.
- Economics from EPIC-12 is input evidence, not billing implementation.

## Open decisions

- Should EPIC-13 implement real payment processor integration or only boundary?
- Should legal/tax invoices be in EPIC-13 or EPIC-14+?
- Should tenant billing be modeled only or made operational?
- Should subscription/plan management be included?
- Should pricing configuration be implemented or only specified?
- Should refunds/chargebacks be modeled?
- Should multi-currency be included?
- Should accounting integrations be deferred?
- What constitutes Billing Ready?
- What gates are required before any money movement?

## Recommended next sprint

EPIC-13 / S02 — Executive Plan

S02 should decide:

- central mission
- billing boundary depth
- payment rails depth
- invoice/legal/tax boundary
- tenant billing depth
- pricing scope
- refund/chargeback scope
- macro-phase acceptance
- first implementation milestone
- gates required before implementation

## Recommended macro-phases

1. Billing boundary and financial truth
2. Pricing, quote, and invoice contracts
3. Payment rails boundary
4. Tenant billing responsibility
5. Receipts, settlement, and reconciliation
6. Financial audit, compliance, and risk
7. Billing UX and operator acceptance
8. Final hardening and closure

## Milestone map

- M01 — Billing Boundary & Financial Truth
- M02 — Pricing, Quote & Invoice Contracts
- M03 — Payment Rails Boundary
- M04 — Tenant Billing & Account Responsibility
- M05 — Receipts, Settlement & Reconciliation
- M06 — Financial Audit, Compliance & Risk
- M07 — Billing UX & Operator Acceptance
- M08 — Final Hardening & Closure

## Dependency graph

- Financial Truth -> Billing Boundary -> Pricing Boundary -> Invoice Candidate
- Billing Boundary -> Tenant Billing Responsibility
- Billing Boundary -> Payment Rails Boundary
- Payment Rails Boundary -> Receipts / Settlement / Reconciliation
- Receipts / Settlement / Reconciliation -> Financial Audit
- Financial Audit -> Billing UX Acceptance
- All milestones -> Final Hardening & Closure

## Acceptance gates candidate list

- docs-only validation
- claim language validation
- relative link validation
- no static changes
- no functional changes
- future Product API contract tests
- future UI rendering tests
- future browser acceptance
- future financial no-claim scan
- future no-secret scan

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed
- Production Financial Operations: NO / not yet claimed

## Out-of-scope register

- billing logic
- billing Product API endpoint
- invoice generation
- payment processor integration
- payment authorization
- payment capture
- tenant billing operation
- pricing engine
- settlement engine
- reconciliation engine
- financial audit runtime
- billing UI
- browser tests
- functional tests

## Coder instructions for S02

- Keep S02 docs-only.
- Do not edit EPIC-12.
- Decide the executive boundary before any implementation planning.
- Maintain Product API as the source of truth.
- Preserve all claim discipline language.
