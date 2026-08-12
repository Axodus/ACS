# EPIC-13 Executive Plan

## Title

EPIC-13 — ACS Billing & Financial Operations

## Executive summary

EPIC-13 establishes the governed Billing & Financial Operations boundary for
ACS. It converts the EPIC-12 economics-as-evidence posture into explicit
planning and implementation tracks for financial truth, billing boundary,
invoice candidates, payment rails, tenant billing responsibility, receipts,
settlement, reconciliation, audit, and compliance. It does not claim Billing
Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, or Production
Financial Operations Ready.

## Mission

Transform EPIC-12 economic evidence into a governed financial planning and
execution boundary without moving real money until explicit gates are proven.

## Relationship to EPIC-12

EPIC-12 remains closed. Its economics output is treated as operational evidence
and input material, not as billing implementation.

## Organizing principle

```text
Financial Truth > Compliance > Tenant Accountability > Operational Control > UX
```

Preserve:

- Fluxo > Módulo > Tela
- Product API is source of truth
- No simulated financial truth
- No payment without explicit approval
- No billing claim without evidence
- No production financial operation without gates

## Strategic decisions

Decision 1 — EPIC-13 centers on Billing & Financial Operations.
Decision 2 — Financial Truth is the highest-priority organizing concept.
Decision 3 — Product API remains the source of truth.
Decision 4 — Billing boundary may be modeled and surfaced, but Billing Ready remains not claimed.
Decision 5 — Payment rails are boundary-modeled; real money movement is deferred.
Decision 6 — Invoice artifacts are candidates; legal/tax invoice readiness is not claimed.
Decision 7 — Tenant billing responsibility is modeled; tenant billing operations are not claimed.
Decision 8 — Pricing boundary is defined before any pricing engine.
Decision 9 — Refunds and chargebacks are deferred/conceptual unless explicitly approved.
Decision 10 — Settlement/reconciliation are evidence boundaries, not accounting integrations.
Decision 11 — S03 is the first implementation milestone.

## Scope

### In scope for EPIC-13

- financial truth model
- billable event boundary
- billing intent
- billing readiness gates
- billing evidence model
- invoice candidate boundary
- pricing boundary
- tenant billing responsibility
- audit correlation
- payment rails boundary
- operational receipts
- settlement visibility
- reconciliation evidence
- financial audit trail
- compliance boundary
- billing UX/operator review flow

### Modeled or candidate-only

- real payment processor integration boundary
- authorization vs capture state model
- invoice artifact boundary
- approval workflow candidates
- refund/chargeback conceptual states
- accounting integration boundary

## Out of scope

- real payment capture
- real authorization
- provider SDK integration
- production payment credentials
- refund execution
- chargeback execution
- legal/tax invoice issuance
- country-specific tax automation
- accounting integrations
- ledger automation
- revenue recognition
- collections
- automated dunning
- marketplace payouts
- financial forecasting
- advanced billing suite

## Macro-phases

Phase A — Executive Planning

Phase B — Billing Boundary & Financial Truth

Phase C — Pricing, Quote & Invoice Contracts

Phase D — Payment Rails Boundary

Phase E — Tenant Billing & Account Responsibility

Phase F — Receipts, Settlement & Reconciliation

Phase G — Financial Audit, Compliance & Risk

Phase H — Billing UX & Operator Acceptance

Phase I — Final Hardening & Closure

## Sprint map

```text
S00 — Normative Planning Package: PASS
S01 — Executive Planning Baseline: PASS
S02 — Executive Plan: PASS after commit
S03 — Billing Boundary & Financial Truth: PENDING
S04 — Pricing, Quote & Invoice Contracts: PENDING
S05 — Payment Rails Boundary: PENDING
S06 — Tenant Billing & Account Responsibility: PENDING
S07 — Receipts, Settlement & Reconciliation: PENDING
S08 — Financial Audit, Compliance & Risk: PENDING
S09 — Billing UX & Operator Acceptance: PENDING
S10 — Final Hardening & Closure: PENDING
S11 — EPIC-13 Closure Report: PENDING
```

## Readiness gates

G01 Financial Truth Source — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G02 Billing Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G03 Billable Event Model — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G04 Pricing Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G05 Quote-to-Invoice Candidate Flow — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G06 Invoice Artifact Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G07 Payment Rails Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G08 No-Money-Movement Guardrail — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G09 Tenant Billing Responsibility — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G10 Payer / Operator / Tenant Actor Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G11 Receipt / Settlement / Reconciliation Evidence — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G12 Financial Audit Trail — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G13 Compliance / Tax Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G14 Product API Financial Source of Truth — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G15 Control Plane Billing UX Acceptance — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G16 No Financial Claim Discipline — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G17 Secret / Provider Credential Boundary — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

G18 Deferred EPIC-14+ Register — Status: not_started / candidate — Claim impact: blocks Billing Ready, Payment Ready, Invoice Ready, Tenant Billing Ready, and Production Financial Operations

## Product API candidate surfaces

- GET /api/v1/system/financial-truth
- GET /api/v1/system/billing-boundary
- GET /api/v1/system/billing-readiness
- GET /api/v1/system/pricing-boundary
- GET /api/v1/system/invoice-boundary
- GET /api/v1/system/payment-rails-boundary
- GET /api/v1/system/tenant-billing-boundary
- GET /api/v1/system/settlement-reconciliation
- GET /api/v1/system/financial-audit
- GET /api/v1/system/epic-13-acceptance

All candidate only / not implemented in S02.

## Control Plane candidate surfaces

- Financial Truth
- Billing Boundary
- Billing Readiness
- Pricing & Quote Review
- Invoice Candidates
- Payment Rails Boundary
- Tenant Billing Responsibility
- Receipts / Settlement / Reconciliation
- Financial Audit & Compliance
- Billing UX Acceptance
- EPIC-13 Acceptance

All candidate only / not implemented in S02.

## Dependencies

- Financial Truth Source -> Billing Boundary
- Billing Boundary -> Billable Event Model
- Billable Event Model -> Pricing Boundary
- Pricing Boundary -> Quote-to-Invoice Candidate Flow
- Quote-to-Invoice Candidate Flow -> Invoice Artifact Boundary
- Billing Boundary -> Tenant Billing Responsibility
- Tenant Billing Responsibility -> Payer / Operator / Tenant Actor Boundary
- Billing Boundary -> Payment Rails Boundary
- Payment Rails Boundary -> No-Money-Movement Guardrail
- Payment Rails Boundary -> Secret / Provider Credential Boundary
- Invoice Artifact Boundary -> Compliance / Tax Boundary
- Payment Rails Boundary -> Receipt / Settlement / Reconciliation Evidence
- Receipt / Settlement / Reconciliation Evidence -> Financial Audit Trail
- All gates -> No Financial Claim Discipline
- All milestones -> Final Hardening & Closure

## Risks

- claim drift
- premature readiness language
- payment/provider boundary confusion
- invoice/tax overreach
- tenant billing overreach
- accounting integration assumptions
- uncontrolled deferred scope growth

## Deferred EPIC-14+ scope

- real payment capture
- real payment authorization
- payment provider SDK integration
- production payment credentials
- legal/tax invoice issuance
- country-specific tax automation
- accounting integrations
- ledger automation
- revenue recognition
- collections
- automated dunning
- marketplace payouts
- financial forecasting
- advanced billing suite
- refund execution
- chargeback execution
- provider-specific reconciliation jobs
- enterprise billing suite

## First implementation milestone

EPIC-13 / S03 — Billing Boundary & Financial Truth

## Acceptance criteria

- Executive decisions are explicit and non-ambiguous.
- S03 is the first implementation milestone.
- Claim discipline remains conservative.
- Product API remains the source of truth.
- No readiness claim is upgraded prematurely.
- EPIC-12 remains closed.

