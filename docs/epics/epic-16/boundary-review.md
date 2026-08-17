# EPIC-16 Boundary Review

## 1. Approved mission boundary

EPIC-16 is approved as **Production Financial Operations**. It operationalizes existing economic primitives; it does not redefine historical EPIC-13 claims or reopen EPIC-15.5 platform work.

## 2. In scope

- economic operations read models;
- pricing and quote provenance;
- effective economic authorization using existing governance/entitlements/limits;
- reservation lifecycle inspection and governed actions;
- usage correlation and operator inspection;
- settlement lifecycle, diagnostics and failure handling;
- reconciliation backlog and mismatch semantics;
- financial exception lifecycle and bounded remediation;
- audit/evidence linkage;
- Product API and existing Control Plane surfaces;
- provider readiness/diagnostics within an explicitly approved adapter boundary;
- final browser/regression acceptance.

## 3. Deferred financial input disposition

Historical financial items marked or classified as deferred to EPIC-16 are mandatory planning inputs. Their inclusion does not mean all are approved implementation scope.

| Input | Classification |
| --- | --- |
| pricing | IN_SCOPE |
| tenant economic accountability | IN_SCOPE |
| reservation lifecycle | IN_SCOPE |
| usage evidence/correction policy | IN_SCOPE |
| settlement lifecycle | IN_SCOPE |
| reconciliation | IN_SCOPE |
| financial exceptions | IN_SCOPE |
| provider adapter/certification | DECISION_GATED |
| invoice issuance | DECISION_GATED |
| payments/money movement | DECISION_GATED |
| refunds/disputes involving external funds | DECISION_GATED |
| tax/legal invoice compliance | OUT_OF_SCOPE_PENDING_SEPARATE_DECISION |
| accounting/general ledger | OUT_OF_SCOPE |

## 4. Consolidated domains — do not rebuild

EPIC-16 must consume existing:

- Tenant truth and membership;
- governance, entitlements and limits;
- audit infrastructure;
- trusted identity and signed platform authority;
- secret references/provider boundary;
- shared PostgreSQL repositories;
- runtime ownership/fencing/idempotency;
- EconomicService and settlement primitives;
- telemetry, readiness and diagnostics;
- deployment governance;
- Control Plane shell/navigation.

## 5. UX boundary

Commit `9005e3a2167d7984f8f129eea4987c3a73f59e1f` is the visual/behavioral baseline for Dashboard work. Financial surfaces may extend the system but must preserve the established hierarchy, responsive shell, light/dark behavior and truthful empty-state discipline.

No UX acceptance may be passed using fabricated cost histories, customer counts, charts or economic values.

## 6. Certification boundary

EPIC-16 does not absorb MH03. Physical multi-host, provider HA, database HA and global production certification remain lateral POST-15.5 work. EPIC-16 can close within the certified bounded topology if all claims state that topology honestly.

## 7. No-scope-expansion tests

A proposed change is outside the approved mission if its primary purpose is to:

- create a general billing/subscription product;
- collect money;
- calculate tax;
- create accounting journals;
- redesign tokenomics/marketplace;
- generalize IAM/SCIM;
- orchestrate infrastructure or fleet autoscaling;
- certify physical multi-host availability.

## 8. Executive decisions still open

Before implementation crosses these boundaries, record an explicit decision for:

- whether ACS authors pricing policy or consumes externally governed pricing;
- exact spend-authorization semantics and thresholds;
- whether any manual economic adjustment is permitted;
- provider strategy and credential model;
- reconciliation cadence/backlog ownership;
- remediation authority thresholds;
- whether invoice/payment capabilities remain deferred or permanently excluded.

## 9. Boundary result

```text
EPIC-16 mission: APPROVED
Production Financial Operations: IN_SCOPE
Financial operator lifecycle: IN_SCOPE
Billing/invoice/payment expansion: NOT IMPLICITLY AUTHORIZED
MH03/global HA: OUTSIDE EPIC-16
UX baseline: 9005e3a
```
