# BR-02 — EPIC-16 Mission Decision

**Status:** APPROVE  
**Date:** 2026-08-17  
**Baseline:** d2601c6 plus BR-01 (NO_EXTERNAL_CANONICAL_ROADMAP_FOUND)  
**Nature:** strategic/normative decision only  
**Implementation changes:** none; documentation only

## 1. Context and BR-01 input

BR-01 completed with NO_EXTERNAL_CANONICAL_ROADMAP_FOUND. No canonical
EPIC-16 or EPIC-17 mission exists in the accessible sources. Production
Financial Operations is the strongest supported EPIC-16 hypothesis, while
EPIC-17 remains UNASSIGNED.

See [BR-01 External Roadmap Recovery](./BR-01_External_Roadmap_Recovery.md) for
the search log and provenance.

## 2. Current financial capability inventory

### Foundation already delivered

- EconomicService implements quote, reserve, authorize, recordUsage, settle,
  release, receipt and reconcile.
- EconomicStateStore, SettlementProvider, AsyncEconomicRepository and the
  PostgreSQL shared-state profile provide durable/shared economic authority.
- Settlement is tenant-scoped, idempotent and reconciliation-capable.
- Economic receipts are durable, tenant-isolated and audit-correlated.
- Governance, entitlements and limits can be reused as economic authorization
  inputs.
- Identity, observability, readiness, deployment governance and operational UX
  are prerequisites, not candidate mission items.

| Capability | Classification | Evidence / interpretation |
| --- | --- | --- |
| quotes / pricing policy | IMPLEMENTED foundation | internal quote model exists; no operator pricing lifecycle |
| economic authorization | PARTIAL | governance/limits exist; dedicated economic workflow absent |
| reservation persistence/idempotency | IMPLEMENTED foundation | shared durable store exists |
| reservation operator lifecycle | BACKEND_ONLY | release mechanics exist; governed workflow absent |
| usage records | IMPLEMENTED foundation | durable and correlated to runId |
| usage inspection/correction | BACKEND_ONLY | no financial operator surface |
| settlement provider/projection | IMPLEMENTED foundation | durable, idempotent and reconcilable |
| settlement operations | PARTIAL | mechanics exist; lifecycle/remediation absent |
| receipts/evidence | IMPLEMENTED foundation | durable identity and audit correlation |
| reconciliation visibility | PARTIAL | internal repair exists; backlog/mismatch workflow absent |
| financial exceptions | NOT_IMPLEMENTED | no exception/remediation lifecycle |
| billing/invoicing/tax/collection | OUT_OF_SCOPE | explicitly unclaimed since EPIC-13 |
| commercial financial provider | NOT_IMPLEMENTED | provider strategy undecided |

## 3. EPIC-13 overlap review

| Area | EPIC-13 delivered | Remaining gap | EPIC-16 candidate? |
| --- | --- | --- | --- |
| economic contracts | boundary and no-claim contract | operational governance | yes |
| usage | evidence boundary | operator lifecycle/correction | yes |
| reservation | evidence boundary | governed operations | yes |
| settlement | visibility/evidence | operational lifecycle | yes |
| receipts | evidence boundary | financial lookup/remediation | yes |
| pricing | boundary and quote candidates | effective pricing/provenance | yes |
| reporting | read-only projections | operational read models/backlog | yes |
| operator controls | review-only surfaces | governed actions/diagnostics | yes |

EPIC-13 established the boundary and no-claim discipline. EPIC-16 does not
duplicate it if it operationalizes the primitives instead of rebuilding them.

## 4. Post-15.5 prerequisites

Inherited and already delivered: shared persistence, trusted identity, Tenant
governance, audit, runtime/fencing/recovery, external observability,
operational UX, production deployment governance, and durable shared economics
with settlement idempotency and reconciliation. None is the EPIC-16 mission.

## 5. Remaining product gap

> ACS can persist, correlate and settle economic state for execution, but
> operators still lack a complete governed production workflow for
> understanding, authorizing, controlling, reconciling and remediating the
> financial effects of agent execution through supported ACS surfaces.

That gap remains if EPIC-16 is removed, despite EPIC-13 and EPIC-15.5.

## 6. Production Financial Operations assessment

- **Distinctness:** EPIC-13 stopped at read-only boundaries; EPIC-15.5 built
  the platform, not the financial operator lifecycle.
- **Relevance:** pricing provenance, spend authorization, reservation
  inspection, settlement exceptions and reconciliation are unresolved operator
  problems.
- **Architecture readiness:** shared state, governance, audit, telemetry and
  Control Plane foundations already exist.
- **Independent value:** the mission is deliverable in the certified topology
  and does not require MH03.
- **Cohesion:** it can be decomposed into pricing/read models,
  authorization/reservations, usage/settlement, reconciliation/exceptions and
  operator acceptance.

## 7. Alternative mission comparison

| Candidate mission | Urgency | Foundation readiness | Overlap risk | Independent value | Recommendation |
| --- | ---: | ---: | ---: | ---: | --- |
| Production Financial Operations | High | High | Low | High | SELECT |
| Enterprise Identity | Medium | Medium | Low | Medium | future candidate |
| Reliability/Fleet Operations | Medium | High | Low | Medium-High | future candidate |

Financial operations is selected because it has the oldest explicit deferred
boundary, a now-complete technical foundation, high operator value and no
dependency on physical multi-host certification.

## 8. Mission decision

```text
BR-02: APPROVE
EPIC-16 = Production Financial Operations
```

> EPIC-16 makes ACS economic execution operationally governable in production
> by connecting pricing visibility, economic authorization, reservation
> lifecycle, usage correlation, settlement operations, reconciliation,
> financial exceptions and durable evidence into a coherent operator-facing
> lifecycle.

This mission does not promise billing collection, invoicing, tax or banking.

## 9. Approved boundaries

### In scope

- economic operations read model;
- pricing/cost visibility for supported execution;
- economic authorization integrated with governance/entitlements;
- reservation lifecycle operations and diagnostics;
- usage correlation and operator inspection;
- settlement lifecycle and failure handling;
- reconciliation and mismatch diagnostics;
- financial exception handling;
- financial audit/evidence linkage;
- existing Control Plane surfaces for these operations;
- provider readiness/diagnostics where the boundary is approved.

### Explicit non-goals

- general ledger/accounting system;
- tax or legal invoice compliance;
- payment collection, card capture or banking rails;
- payroll, treasury, exchange or trading;
- tokenomics or marketplace redesign;
- physical multi-host certification;
- enterprise identity/SCIM;
- fleet scheduling/autoscaling/drain orchestration.

External financial provider scope remains:

```text
ADAPTER/CERTIFICATION SCOPE TO BE DECIDED IN NORMATIVE PACKAGE
```

## 10. Open decisions

- pricing model ownership and authoring path;
- exact spend-authorization semantics;
- whether manual economic adjustments are allowed;
- settlement provider strategy;
- reconciliation cadence and backlog semantics;
- exception-remediation authority thresholds;
- whether broader billing/invoicing remains deferred or excluded.

## 11. EPIC-17 status

```text
EPIC-17: UNASSIGNED
```

## 12. Input to EPIC-16 Normative Package

- Canonical mission: Production Financial Operations.
- Problem: no complete governed operator workflow for execution economics.
- Scope/non-goals: section 9.
- Prerequisites: EPIC-13 boundary discipline, EPIC-15.5 operational platform,
  AEES-SH shared authoritative state.
- Open decisions: section 10.
- Expected exit: an authorized operator can understand, control, reconcile and
  remediate supported execution economics through governed ACS surfaces with
  durable evidence and without database inspection.

```text
AUTHORIZED NEXT STEP:
Create EPIC-16 Normative Package
```

## 13. Validation

```text
git diff --check: PASS
product code changes: 0
EPIC-17 mission assignment changes: 0
```

## 14. Terminal result

```text
BR-02: APPROVE
EPIC-16: Production Financial Operations
EPIC-17: UNASSIGNED
AUTHORIZED NEXT STEP: Create EPIC-16 Normative Package
```

