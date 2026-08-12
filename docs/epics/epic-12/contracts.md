# EPIC-12 Contracts

This document defines the planning-level contracts for EPIC-12. It frames what
the next epic should treat as authoritative, what states it must preserve, and
what claims it must not make without evidence.

## 1. Control plane authority contract

EPIC-12 consumers MUST treat the Product API and backend control-plane state as
authoritative for operational truth.

The surface MUST NOT infer production, security, tenancy, or authorization
truth from local UI state alone.

## 2. Identity and access contract

If EPIC-12 includes authentication or authorization work, it MUST define:

- authenticated actor identity
- role or permission model
- least-privilege boundaries
- denied-state behavior
- audit correlation for access decisions

## 3. Tenant and administration contract

If tenant or administration work is in scope, EPIC-12 MUST specify:

- whether the surface is single-tenant, multi-tenant, or tenant-aware but not
  tenant-admin capable
- which mutations are allowed
- which identities may perform them
- which operations remain read-only
- which operations are intentionally excluded

## 4. Evidence and observability contract

Observed state MUST remain:

- append-friendly where applicable
- correlated to actor, request, entity, and time
- safe to inspect without exposing secrets
- explicit about partial visibility when the backing data is incomplete

Observability surfaces SHOULD distinguish logs, diagnostics, traces, alerts, and
health summaries rather than flattening them into one generic status view.

## 5. Browser and UX acceptance contract

If EPIC-12 claims UX hardening, it MUST preserve:

- loading
- empty
- ready
- warning
- blocked
- error
- pending
- recovering

and it SHOULD include at least one browser-level or visual verification strategy
before claiming readiness beyond development inspection.

## 6. Economics contract

Economics remains a planning decision.

EPIC-12 MUST explicitly choose one of these:

- Economics as a dedicated flow
- Economics as part of operational evidence

Whatever the choice, EPIC-12 MUST keep quote, reservation, metering,
settlement, and receipt visibility honest and bounded by available data.

## 7. Domain exposure contract

EPIC-12 MAY display control-plane-adjacent domains, but MUST NOT reimplement
them:

- authentication
- authorization
- tenancy
- policy
- credential systems
- observability backends
- runtime orchestration
- billing systems

