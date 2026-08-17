# EPIC-16 Strategic Operational Plan

## 1. Mission

Production Financial Operations turns ACS economic primitives into a governed operator lifecycle for execution economics.

## 2. Strategic problem

The platform can quote, reserve, authorize, meter/record usage, settle, release, issue receipts and reconcile, but those capabilities are not yet exposed as one coherent production-operable system. Operators lack authoritative pricing provenance, effective spend authorization, reservation diagnostics, settlement lifecycle visibility, reconciliation backlog semantics and safe financial exception remediation.

## 3. Strategic outcomes

EPIC-16 must deliver:

- authoritative financial/economic read models;
- effective pricing provenance for supported executions;
- explicit economic authorization and reservation workflows;
- usage/run/Tenant correlation;
- settlement lifecycle visibility and failure handling;
- reconciliation backlog and mismatch diagnostics;
- financial exception lifecycle with bounded remediation authority;
- durable evidence and audit linkage;
- Product API and Control Plane journeys aligned with the `9005e3a` UX baseline;
- honest provider/readiness diagnostics.

## 4. Work sequence

### Phase A — Truth
Establish canonical read models and provenance before introducing new mutations. Resolve terminology for quote, estimated, reserved, metered and settled values.

### Phase B — Authorization
Define effective spend authorization using existing governance, entitlement and limit mechanisms. Make reservation lifecycle inspectable and govern release/remediation.

### Phase C — Settlement operations
Expose usage correlation, settlement status, retry/failure semantics and receipt evidence without allowing unsafe replay or ad hoc adjustment.

### Phase D — Reconciliation and exceptions
Define mismatch/backlog state, exception severity, ownership, permitted remediations and terminal evidence.

### Phase E — Provider/readiness hardening
Specify approved provider boundary, dependency health, outage semantics, reconciliation behavior and topology claims.

### Phase F — Operator acceptance
Complete Control Plane workflows and prove usability, accessibility, responsive behavior, truthful data representation and regression safety.

## 5. Milestone plan

### E16-M1 — Financial Truth & Pricing Provenance
Exit when supported economic state is queryable through canonical Tenant-scoped Product API read models and every displayed cost has source/provenance semantics.

### E16-M2 — Economic Authorization & Reservations
Exit when economic authorization decisions are deterministic, governable, auditable and reservation lifecycle actions are safe/idempotent.

### E16-M3 — Usage & Settlement Operations
Exit when operators can correlate usage and settlement to execution evidence, understand failures and use only supported recovery paths.

### E16-M4 — Reconciliation & Financial Exceptions
Exit when mismatches become first-class durable backlog/exception records with explicit authority and remediation outcomes.

### E16-M5 — Provider Boundary & Production Hardening
Exit when provider strategy within approved scope has diagnostics, readiness, outage semantics and shared-state acceptance.

### E16-M6 — Operator UX & Acceptance
Exit when all core journeys are browser-certified and no regression or unsupported financial claim remains.

## 6. Decision gates

The following require an explicit normative amendment before implementation:

- creation or issuance of invoices;
- payment capture or real money movement;
- tax computation or accounting journals;
- commercial provider credentials beyond approved settlement/provider adapter scope;
- unrestricted manual financial adjustments;
- customer-facing billing portal or subscription lifecycle.

## 7. Risk controls

Primary risks are split authority, unsafe replay, fabricated financial data, accidental billing claims, Tenant leakage and remediation without durable evidence. Mitigation is contract-first delivery, shared-state tests, idempotency keys, signed/trusted operator context, Product API-only mutations, explicit no-claim copy and audit correlation.

## 8. Acceptance strategy

Acceptance is evidence-driven. Each milestone must prove authoritative state behavior plus operator behavior. Final closure requires end-to-end traces from pricing/authorization through reservation, usage, settlement, reconciliation and exception evidence for representative success and failure paths.
