# EPIC-16 Milestones

## Pre-execution gate — E16-M1-S00

Before functional work starts, execute [`E16-M1-S00 — Normative Execution Readiness`](./E16-M1-S00.md).

**Nature:** documentation, repository discovery and execution preparation only.
**Product code changes:** forbidden.
**Exit:** `EPIC-16 EXECUTION READINESS: READY` and a bounded, evidence-backed handoff for E16-M1-S01.

E16-M1-S01 is not authorized until S00 reaches `PASS`.

## AEES-16-01 — Financial Truth & Pricing Provenance

**Execution unit:** AEES-16-01
**Stories:** S01, S02, S11 (read-only slice)

Deliver canonical Tenant-scoped economic read models, effective pricing/quote provenance and truthful Dashboard integration.

**Execution sequence after S00:**

1. AEES-16-01 / S01 — Economic Read-Model Contract
2. AEES-16-01 / S02 — Pricing Provenance
3. AEES-16-01 / S03 — Product API Exposure
4. AEES-16-01 / S04 — Dashboard Integration
5. AEES-16-01 / S05 — Acceptance and Milestone Closure

**Exit:** no financial surface depends on inferred/fabricated values; API semantics distinguish unavailable, zero and not-applicable states.

Certified browser evidence: `/tmp/acs-aees-16-01-browser-recovery/manifest.json`.

## E16-M2 — Economic Authorization & Reservations

**Stories:** S03, S04

Integrate economic authorization with existing governance/entitlements/limits and operationalize reservation lifecycle.

**Exit:** authorization reasons are deterministic/audited; reservation actions are explicitly authorized and idempotent.

## AEES-16-02 — Economic Authorization & Reservations

**Execution unit:** AEES-16-02
**Status:** COMPLETE

This execution unit covers the governed authorization, reservation, operator
integration and acceptance recovery work for E16-M2.

**Execution sequence after S00:**

1. AEES-16-02 / S01 — Economic Authorization Contract
2. AEES-16-02 / S02 — Governance / Entitlements / Limits Integration
3. AEES-16-02 / S03 — Reservation Lifecycle Operations
4. AEES-16-02 / S04 — Product API & Operator Integration
5. AEES-16-02 / S05 — Acceptance and Milestone Closure

## E16-M3 — Usage & Settlement Operations

**Execution unit:** AEES-16-03
**Stories:** S01, S02, S03, S04, S05

Expose usage correlation, settlement lifecycle, receipts and safe failure/retry
semantics.

**Exit:** an operator can trace execution economics through metering/usage to
settlement without repository inspection.

**Execution sequence after E16-M2:**

1. AEES-16-03 / S01 — Usage Correlation Contract
2. AEES-16-03 / S02 — Usage Inspection & Evidence
3. AEES-16-03 / S03 — Settlement Lifecycle Operations
4. AEES-16-03 / S04 — Settlement Failure, Retry & Receipt Semantics
5. AEES-16-03 / S05 — Acceptance and Milestone Closure

## E16-M4 — Reconciliation & Financial Exceptions

**Execution unit:** AEES-16-04
**Stories:** S07, S08, S09
**Canonical UI:** `.design/app-standalone`
** /static:** forbidden for EPIC-16 UI changes

Create durable reconciliation backlog, first-class financial exceptions and bounded remediation.

**Exit:** mismatches are actionable state; every remediation is authorized, idempotent and evidenced; arbitrary value editing remains absent.

## E16-M5 — Provider Boundary & Production Hardening

**Stories:** S10, S13, S14

Harden provider/dependency diagnostics, shared-state behavior, audit correlation and degraded modes.

**Exit:** provider ambiguity/outage cannot create false success; shared-state and fail-closed tests pass; topology claim remains bounded.

## E16-M6 — Operator UX & Acceptance

**Stories:** S11, S12, S15

Complete the financial operations workspace and certify browser/regression behavior.

**Exit:** core financial operator journeys pass technical and browser acceptance across supported viewports/themes; closure evidence is complete.

## Sequencing rules

- S00 precedes all EPIC-16 functional execution.
- M1 precedes new operator mutations.
- M2 precedes remediation that depends on financial authority.
- M3 precedes M4 because reconciliation requires canonical usage/settlement semantics.
- M5 hardening may begin incrementally but cannot close before M4 contracts stabilize.
- M6 is final acceptance, not a late redesign sprint.

## Decision gate

Invoice issuance, payment/money movement, tax/accounting and unrestricted adjustment work are not hidden milestones. If approved, the normative package must be amended with explicit contracts, risk model and acceptance before such work is scheduled.
