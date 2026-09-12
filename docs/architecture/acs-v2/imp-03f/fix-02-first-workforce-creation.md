# ACS-V2-IMP-03F-FIX-02 — First Workforce Creation Enablement

## Decision status

`AUTHORIZED` on September 12, 2026.

`ACCEPTED — CANONICAL HOST / POSTGRESQL` on September 12, 2026.

`POST /api/v1/workforces` creates the initial canonical Workforce lineage only. It creates a draft definition and immutable draft revision `r1` through `AsyncNativeCoreRepository.advanceWorkforceLineage`.

## Request boundary

The request supplies only canonical Workforce inputs:

- Workforce identity: ID, display name, purpose, ownership reference;
- one initial member slot pointing to an existing Agent;
- membership and audit policy revision references;
- commit reason, idempotency key, and request timestamp.

The API derives the Workforce scope from the selected Agent, rejects an Agent outside the current tenant, evaluates `workforce.create` through the existing tenant governance enforcement, and submits the result through the native lineage command. The native repository owns reference validation, append-only revision persistence, event persistence, and outbox persistence.

The idempotency key scopes to the Workforce ID. The route derives a stable authority-decision reference, correlation ID, event ID, and governance evaluation timestamp from the request, so retrying the same request with a different HTTP correlation ID retains the same canonical command identity.

## Product flow

```text
/workforces
  → empty state or inventory action: Create Workforce
  → /workforces/new
  → POST /api/v1/workforces
  → canonical draft Workforce r1
  → /workforces/:id
```

The create form intentionally has no local persistence or direct database access. It uses the typed Product API client and navigates only after the canonical response succeeds.

## Explicit boundary

- no later Workforce revision creation;
- no Workforce lifecycle mutation;
- no Workforce-scoped Run list;
- no direct PostgreSQL access outside nativeCore;
- no frontend-side canonical state or invented metadata.

## Validation state

The deterministic route test proves creation, `r1`, draft lifecycle, event/outbox command data, retry idempotency, list readback, and direct detail readback using an injected native-core boundary. A separate PostgreSQL acceptance test starts a canonical shared-state HTTP host, creates a schema-isolated native Agent through `nativeCore`, creates the first Workforce through the Product API, retries the request with the same idempotency key, restarts the shared control-plane context, and verifies durable collection and direct-detail reads.

On September 12, 2026, the PostgreSQL acceptance test and the full repository suite passed with 726 tests, 0 failures, and 0 skips. This accepts the canonical-host persistence criterion for FIX-02. The separately running standalone host on port 8788 remains without its shared native-core configuration; it is not evidence against the canonical host used in this acceptance.
