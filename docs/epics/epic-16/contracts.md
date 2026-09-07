# EPIC-16 Contracts

## 1. Contract principles

EPIC-16 is contract-first. Every financial operation must have explicit Tenant scope, authority, idempotency, evidence and failure semantics.

## 2. Canonical financial operation states

Where supported by existing primitives, operator-facing projections should normalize state into explicit lifecycle categories without rewriting underlying source records.

### Economic operation projection

```text
estimated -> reserved -> metered -> settled
              |            |          |
              +-> released +-> error  +-> reconciled/mismatch
```

Not every execution must traverse every state. Projection logic must distinguish `not_applicable`, `not_available`, `pending`, `failed` and zero values.

## 3. Pricing provenance contract

A displayed economic value that represents a price or cost must expose enough provenance to answer:

- Tenant;
- effective pricing/policy source;
- quote or economic operation identity;
- unit;
- effective timestamp/version;
- workload/run correlation;
- whether the value is estimated, reserved, metered or settled.

Missing authoritative provenance must be represented as unavailable, never guessed.

## 4. Economic authorization contract

Input must include Tenant, actor/trusted context, workload/economic request, requested amount/unit where relevant, governance/entitlement/limit context and idempotency identity.

Output must include `allowed|denied`, reasons/codes, applicable limit/entitlement references, reservation outcome when coupled, audit correlation and stable operation identity.

Authorization cannot be overridden by client/UI state.

## 5. Reservation lifecycle contract

Supported reservation actions:

- inspect;
- create/reserve through the existing economic authority;
- release where allowed;
- correlate to execution and settlement;
- diagnose failed/stale states.

Every mutation must define replay behavior. Unsupported manual amount mutation is forbidden unless separately approved.

## 6. Usage contract

Usage evidence must be Tenant-scoped and correlate to the originating execution/run. Corrections, if authorized, must be append-only or preserve prior evidence with a durable reason, actor and audit link; silent overwrite is forbidden.

## 7. Settlement contract

Settlement must preserve existing idempotency. Operator surfaces must expose settlement identity, source economic operation, status, provider correlation if applicable, attempt/retry semantics, receipt identity and terminal error information safe for display.

A provider timeout or ambiguous response must not be mapped to success without authoritative confirmation.

## 8. Reconciliation contract

Reconciliation must produce deterministic outcomes such as:

- matched;
- pending evidence;
- mismatch;
- provider unavailable;
- remediation required;
- resolved.

Backlog items must have stable identity, Tenant, economic/settlement references, first-seen/last-seen timestamps, category, severity and evidence links.

## 9. Financial exception contract

A financial exception is durable operational state, not a log line. Minimum fields:

- exception ID;
- Tenant ID;
- category;
- severity;
- state;
- related quote/reservation/usage/settlement/reconciliation IDs;
- detected-at and updated-at;
- remediation policy/action set;
- actor/outcome for each remediation;
- audit/evidence references.

## 10. Remediation contract

Permitted actions must be enumerated, server-authorized and idempotent. Generic arbitrary balance/value editing is not part of EPIC-16.

Each remediation returns:

- accepted/rejected;
- reason;
- previous and resulting operational state references;
- operation/idempotency identity;
- audit correlation;
- follow-up reconciliation requirement if any.

## 11. Product API contract

The Product API must provide supported read and mutation endpoints for EPIC-16 workflows. It must not expose raw repository mutation primitives or require the UI to compose authority locally.

All endpoints must define:

- Tenant derivation/selection;
- authorization requirements;
- pagination/filtering where collections exist;
- stable machine-readable error codes;
- degraded dependency behavior;
- correlation IDs.

## 12. Dashboard/read-model contract

Financial Dashboard data must distinguish current aggregate truth from historical series. If historical data is not available, the API/UI must expose a truthful empty/unavailable state. `9005e3a` no-fake-data semantics are normative.

## 13. Decision-gated contracts

No contract for legal invoices, payment capture, banking rails, tax, accounting journals or unrestricted manual financial adjustments may be introduced without explicit normative approval.
