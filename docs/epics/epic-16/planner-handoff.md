# EPIC-16 Planner Handoff

## Mission

Plan implementation for **Production Financial Operations** against normative package baseline `f5ee24c4a80f9435f39716838b3bb001f1b1bd83` and preserve Dashboard/UX baseline `9005e3a2167d7984f8f129eea4987c3a73f59e1f`.

## Mandatory constraints

1. Reuse existing EconomicService, settlement, Tenant, governance, audit, persistence, Product API, readiness and Control Plane authority.
2. Do not build a parallel billing/economic subsystem.
3. Treat historical `DEFERRED_TO_EPIC16` financial items as explicit planning inputs, but preserve decision gates for invoices, payments/money movement, tax/accounting and commercial provider expansion.
4. Preserve the `9005e3a` Dashboard/UX baseline and truthful no-fake-data behavior.
5. Keep MH03/global HA outside EPIC-16.

## Mandatory pre-execution sprint

Before any EPIC-16 product implementation, execute:

**`E16-M1-S00 — Normative Execution Readiness`**

See `milestones/E16-M1-S00.md` and complete `execution-readiness.md` from repository evidence.

S00 is documentation/discovery only. Product code, Product API behavior, persistence schema and UI behavior must remain unchanged.

Browser acceptance for EPIC-16 is local-first: Vite + Playwright certify the
implementation before commit/push. Vercel exact-SHA verification is a secondary
deployment gate, not the primary mechanism for testing unpublished code.

Canonical operator UI for EPIC-16 is `.design/app-standalone`.
EPIC-16 UI changes under `/static` are forbidden.

Functional execution is authorized only after S00 records:

```text
E16-M1-S00: PASS
EPIC-16 EXECUTION READINESS: READY
AUTHORIZED NEXT SPRINT: AEES-16-01
PRODUCT CODE CHANGED: NO
```

If S00 finds an unresolved authority or product decision that prevents a bounded S01, close `BLOCKED` instead of inventing semantics.

## First implementation target after S00

Start with **AEES-16-01 — Financial Truth & Pricing Provenance**. Do not start with mutations.

The planner/coder must use the completed S00 inventory to produce the smallest read-only slice that:

- exposes a canonical Tenant-scoped economic operations projection;
- identifies price/quote provenance;
- distinguishes estimated/reserved/metered/settled values;
- preserves source identities and audit correlation;
- exposes truthful unavailable/empty states;
- feeds existing Dashboard financial regions without fabricated history.

## Required S00 inspection scope

Before coding M1, inspect and document:

- EconomicService and economic state repositories;
- settlement provider/projection and reconciliation code;
- EPIC-13 financial boundary/read models;
- current Product API economic endpoints;
- Dashboard economics data contract at current `dev` and against `9005e3a` visual semantics;
- Tenant/governance authorization context;
- shared PostgreSQL composition and existing tests;
- exact source/provenance for every candidate M1 field.

## M1 execution sequence

### AEES-16-01 / S01 — Economic Read-Model Contract
Define canonical projection types/API source mapping from the evidence frozen in S00. No UI mutation.

### AEES-16-01 / S02 — Pricing Provenance
Add provenance fields and deterministic mapping from existing quote/pricing sources.

### AEES-16-01 / S03 — Product API Exposure
Expose Tenant-scoped read-only surfaces with stable degraded/error semantics.

### AEES-16-01 / S04 — Dashboard Integration
Back financial Dashboard regions with the authoritative read model while preserving `9005e3a` hierarchy and truthful empty states.

### AEES-16-01 / S05 — Acceptance and Milestone Closure
Run backend/app validation, Tenant isolation, shared-state regression if state access changes, browser acceptance, accessibility, overflow, console and no-fake-data checks.

## Next authorized execution unit

E16-M2 remains formally blocked on browser acceptance evidence, but E16-M3 is
authorized for execution planning and implementation.

### AEES-16-03 — Usage & Settlement Operations

The next execution unit extends the existing economic foundation to usage
correlation, inspection, settlement lifecycle, retry/failure semantics and
receipt evidence.

### AEES-16-03 / S01 — Usage Correlation Contract
Define the canonical usage record projection from the existing economic and
runtime evidence.

### AEES-16-03 / S02 — Usage Inspection & Evidence
Expose tenant-scoped usage inspection and evidence references through Product
API and dashboard-facing projections.

### AEES-16-03 / S03 — Settlement Lifecycle Operations
Normalize settlement lifecycle state and governed operations over usage-backed
economic records.

### AEES-16-03 / S04 — Settlement Failure, Retry & Receipt Semantics
Preserve durable receipt evidence, retry semantics and failure classification
without introducing invoice/payment semantics.

### AEES-16-03 / S05 — Acceptance and Milestone Closure
Run backend/app validation, Tenant isolation, shared-state regression if state
access changes, local Vite browser acceptance, accessibility, overflow,
console, page-error and no-fake-data checks.

## Planner output requirements

For every implementation sprint, specify:

- exact files/components/contracts touched;
- invariant protected;
- migration/persistence impact;
- Product API change;
- tests required;
- browser route/viewports if UI changes;
- explicit non-goals;
- commit boundary.

## Stop conditions

Stop and request normative amendment if implementation requires:

- invoice generation/issuance;
- external payment capture or movement of funds;
- tax/legal invoice computation;
- accounting journals;
- unrestricted manual economic adjustment;
- provider credentials or provider authority outside the approved adapter boundary;
- a new source of Tenant, governance or financial truth.

## Definition of done for M1

M1 is complete when an authorized operator can inspect authoritative execution-economic state and pricing provenance through Product API/Control Plane, Dashboard financial information is backed by those contracts, and all unavailable historical series remain explicitly truthful rather than synthetic.
AEES-16-03 is the next authorized execution unit for EPIC-16 after AEES-16-01, while AEES-16-02 remains formally blocked on browser acceptance evidence.
Primary sprint order remains S01 through S05.

## AEES-16-04 current execution

S01-S03 remain implemented. S04 adds governed remediation on the S03 exception lifecycle.
Canonical UI remains `.design/app-standalone`. `/static` remains forbidden.
E16-M3 remains independently blocked on acs-app deployment fidelity and is not mixed into this sprint.
S05 remains the milestone acceptance unit.
