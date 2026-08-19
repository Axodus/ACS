# EPIC-16 AGENT Instructions

## Scope

These instructions apply to all work under `docs/epics/epic-16/` and to implementation explicitly attributed to EPIC-16.

## Mission guardrail

EPIC-16 is **Production Financial Operations**. Implement only work required to make existing execution economics understandable, governable, reconcilable and remediable through supported ACS surfaces.

Do not reinterpret the mission as permission to build a generic billing platform, accounting system, tax engine, payment processor, marketplace or tokenomics layer.

## Baseline

Use commit `9005e3a2167d7984f8f129eea4987c3a73f59e1f` as the UX/dashboard baseline. Preserve:

- existing Control Plane shell and navigation semantics;
- Dashboard hierarchy and visual language established by the post-15.5 fidelity remediation;
- truthful visualization regions and empty states;
- the rule that no metric, time series, customer count, spend value or financial history may be fabricated when the Product API does not expose authoritative data.

## Existing authority to reuse

Must reuse rather than duplicate:

- Tenant lifecycle, membership and authority;
- governance, entitlements and limits;
- audit and correlated receipts;
- trusted identity and edge boundaries;
- secrets/provider references;
- shared PostgreSQL production profile and async repository boundaries;
- durable runtime jobs, ownership, leases, fencing and cancellation;
- EconomicService/economic state/settlement primitives;
- observability, readiness and deployment governance;
- Product API as the operator authority boundary.

## Financial invariants

1. Tenant isolation is mandatory for every read and write.
2. Authoritative financial state must be durable in the shared production profile.
3. Mutations must be idempotent or explicitly reject unsafe replay.
4. Financial remediation requires explicit authority, audit correlation and outcome evidence.
5. Telemetry is not financial authority.
6. UI state is not financial authority.
7. Provider outage must not silently downgrade to fabricated or local-only financial truth.
8. Manual adjustment capability is forbidden unless a normative contract explicitly authorizes its semantics and thresholds.
9. Invoices, payments, real money movement, tax and accounting remain decision-gated/out-of-scope unless this package is amended.
10. No EPIC-16 implementation may weaken EPIC-13 no-claim language.

## Delivery discipline

Each milestone must include:

- contract/API changes;
- persistence/shared-state implications;
- authorization and audit behavior;
- telemetry/readiness behavior;
- operator UX behavior where applicable;
- tests for Tenant isolation, idempotency and degraded dependencies;
- browser acceptance for changed Control Plane surfaces;
- browser acceptance is remote-first and should prefer the certified deployment URL for the exact commit under test; localhost is only a development fallback when explicitly enabled;
- regression evidence against EPIC-14/15/15.5 operational flows.

## Required validation

At minimum, every implementation sprint must report applicable results for:

- typecheck/build;
- automated tests;
- `git diff --check`;
- Product API contract tests;
- shared-state tests when authoritative state changes;
- browser acceptance when UX changes;
- accessibility and horizontal-overflow checks for changed routes;
- no fabricated financial values in visual surfaces.

## Change control

Any proposal that introduces invoices, payment rails, card/bank credentials, tax calculation, accounting journals, refunds/disputes involving external money movement, or a new commercial provider must stop and record the normative decision required before implementation.
