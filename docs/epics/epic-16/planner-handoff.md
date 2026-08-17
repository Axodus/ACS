# EPIC-16 Planner Handoff

## Mission

Plan implementation for **Production Financial Operations** against baseline `9005e3a2167d7984f8f129eea4987c3a73f59e1f`.

## Mandatory constraints

1. Reuse existing EconomicService, settlement, Tenant, governance, audit, persistence, Product API, readiness and Control Plane authority.
2. Do not build a parallel billing/economic subsystem.
3. Treat historical `DEFERRED_TO_EPIC16` financial items as explicit planning inputs, but preserve decision gates for invoices, payments/money movement, tax/accounting and commercial provider expansion.
4. Preserve the `9005e3a` Dashboard/UX baseline and truthful no-fake-data behavior.
5. Keep MH03/global HA outside EPIC-16.

## First implementation target

Start with **E16-M1 — Financial Truth & Pricing Provenance**. Do not start with mutations.

Planner should first inventory current economic domain code and Product API contracts, then produce the smallest read-only slice that:

- exposes a canonical Tenant-scoped economic operations projection;
- identifies price/quote provenance;
- distinguishes estimated/reserved/metered/settled values;
- preserves source identities and audit correlation;
- exposes truthful unavailable/empty states;
- feeds existing Dashboard financial regions without fabricated history.

## Required preflight

Before coding M1, inspect:

- EconomicService and economic state repositories;
- settlement provider/projection and reconciliation code;
- EPIC-13 financial boundary/read models;
- current Product API economic endpoints;
- Dashboard economics data contract at `9005e3a`;
- Tenant/governance authorization context;
- shared PostgreSQL composition and existing tests.

## Suggested sprint decomposition

### E16-M1/S01 — Economic read-model contract
Define canonical projection types/API and source mapping. No UI mutation.

### E16-M1/S02 — Pricing provenance
Add provenance fields and deterministic mapping from existing quote/pricing sources.

### E16-M1/S03 — Product API exposure
Expose Tenant-scoped list/detail/summary endpoints with stable degraded/error semantics.

### E16-M1/S04 — Dashboard integration
Replace any thin aggregate financial presentation with the new authoritative read model while preserving `9005e3a` hierarchy and truthful empty states.

### E16-M1/S05 — Acceptance
Run backend/app validation, Tenant isolation, shared-state regression if state access changes, browser acceptance, accessibility, overflow, console and no-fake-data checks.

## Planner output requirements

For every sprint, specify:

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
