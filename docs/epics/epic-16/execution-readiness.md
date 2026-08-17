# EPIC-16 Execution Readiness

**Status:** READY
**Baseline:** f5ee24c4a80f9435f39716838b3bb001f1b1bd83
**UX/dashboard reference:** 9005e3a2167d7984f8f129eea4987c3a73f59e1f

## Purpose

This is the evidence ledger for E16-M1-S00. It records only repository-backed facts that can be inspected today on dev.

## 1. Economic domain authority inventory

| Area | Current implementation path / symbol | Authority today | Persistence | Tenant scoped | Execution/run correlation | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| quote / pricing | src/control-plane/neurons-economic-contract.ts: EconomicService.quote(), BillingPolicy, UsageQuote | EconomicService + policy | durable in EconomicStateStore | yes (tenantId) | no direct run id | quote total is computed from the active policy and estimated usage |
| authorization | src/control-plane/neurons-economic-contract.ts: EconomicService.authorize() | reservation state | no separate store | yes | no direct run id | returns a boolean authorization, not a new durable record |
| reservation | src/control-plane/neurons-economic-contract.ts: EconomicService.reserve(), UsageReservation | EconomicService | durable in EconomicStateStore | yes | indirect via quote / workload | reservation is the durable hold |
| release | src/control-plane/neurons-economic-contract.ts: EconomicService.release() | EconomicService | durable update of reservation | yes | no direct run id | sets status to released and remaining to zero |
| usage / metering | src/control-plane/neurons-economic-contract.ts: EconomicService.recordUsage(), UsageRecord, listUsage() | EconomicService | durable in EconomicStateStore | yes | yes (runId) | usage is the metering primitive |
| settlement | src/control-plane/neurons-economic-contract.ts: EconomicService.settle(), Settlement | EconomicService + SettlementProvider | durable in store + provider | yes | yes (runId) | settlement is committed through provider reconciliation semantics |
| settlement provider | src/control-plane/neurons-economic-contract.ts: SettlementProvider, InMemorySettlementProvider; src/control-plane/durable-economic-state.ts: SqliteSettlementProvider | provider adapter | provider-backed | yes | yes | provider is authoritative for external settlement evidence, not money movement |
| receipts | src/control-plane/neurons-economic-contract.ts: EconomicReceipt, EconomicService.receipt() | EconomicService | durable in EconomicStateStore | yes | yes (runId) | receipt is the execution-linked operational record |
| reconciliation | src/control-plane/neurons-economic-contract.ts: EconomicService.reconcile() | provider records + store | store repair from provider evidence | yes | yes (runId/idempotency key) | reconciliation repairs missing provider records; it is not accounting reconciliation |
| economic state repositories | src/control-plane/neurons-economic-contract.ts: EconomicStateStore; src/control-plane/durable-economic-state.ts: SqliteEconomicStateStore, InMemoryEconomicStateStore; src/control-plane/shared-state/postgres-shared-state.ts: PostgresEconomicRepository | repository adapter | SQLite / memory / Postgres shared-state | yes | yes where record type carries run id | shared-state repo stores acs_economic_records |
| shared PostgreSQL composition | src/control-plane/shared-state/shared-authority-service.ts: commitSettlement(); src/control-plane/shared-state/postgres-shared-state.ts | shared-state transaction boundary | Postgres | yes | yes | settlement commits and audit append happen in one transaction |
| Tenant isolation | EconomicService.#assertTenant(), #isVisible(), sameTenant(); src/http/control-plane-context.ts injects tenantId | tenant scope on the service instance | N/A | yes | yes via filtered visibility | cross-tenant access is rejected or hidden |
| audit correlation | src/control-plane/neurons-economic-contract.ts: #auditService.recordEvent(); src/control-plane/audit-service.ts: AuditEvent.correlationId, executionRunId | audit service | durable in audit store | yes | yes (executionRunId) | settlement audit events carry correlation and execution run ids |
| Product API economics | src/http/routes/product-api-routes.ts; src/control-plane/operational-evidence-service.ts; src/control-plane/product-api-client.ts | Product API read model | read-only projection over existing services | yes | yes, where source exists | mutations are governed/unsupported |
| Dashboard economics | src/control-plane/product-api-client.ts: getDashboardSummary(), #agentDetail(), getPricingInvoiceBoundaryReport(), getSettlementReconciliationBoundaryReport() | Dashboard consumer contract | mostly derived / unavailable | yes when sourced | partial | current Dashboard does not expose live monetary totals |

## 2. Canonical terminology matrix

| Term | Source object | Authority | Durable / derived | Persistence | Tenant key | Execution/run correlation | Allowed API/UI representation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| quoted | UsageQuote | EconomicService.quote() | durable | EconomicStateStore | tenantId on quote | no direct run id | quote detail / list / provenance |
| estimated | UsageQuote.estimatedByDimension, UsageQuote.total | quote policy + estimation input | derived then persisted with the quote | EconomicStateStore | tenantId | no direct run id | API/UI may show estimate with policy id and revision |
| authorized | EconomicService.authorize() result | active reservation | derived / transient | none | reservation tenant | no direct run id | boolean authorization only; no persisted authorization record |
| reserved | UsageReservation | EconomicService.reserve() | durable | EconomicStateStore | tenantId | indirect through quote/workload | reservation detail/list |
| metered | UsageRecord | EconomicService.recordUsage() | durable | EconomicStateStore | tenantId | yes (runId) | metering list/detail and execution-run metering |
| settled | Settlement / EconomicReceipt.status | EconomicService.settle() and provider commit | durable | EconomicStateStore + provider | tenantId | yes (runId) | settlement detail/list and execution-run settlement |
| released | UsageReservation.status = released | EconomicService.release() | durable | EconomicStateStore | tenantId | no direct run id | reservation detail/list; terminal reservation state |
| reconciled | provider commit repaired into store | EconomicService.reconcile() | derived from provider evidence | EconomicStateStore | tenantId | yes (runId) | exposed as reconciliation outcome, not a standalone persisted state |
| mismatch | ACS_ECONOMIC_RECONCILIATION_CONFLICT / EconomicIdempotencyConflictError / RevisionConflictError | conflict detection | derived exception | no direct persistence | tenant visible when applicable | yes where conflict is keyed | API should surface as error / degraded state, not as a monetary value |
| exception | AcsError, EconomicPersistenceError, SettlementProviderUnavailableError | service / adapter failures | derived error state | no | tenant visible when applicable | yes when in event metadata | error / unavailable / blocked state |
| zero | aggregate count/amount 0 | explicit empty state or no records | derived | no extra persistence | tenant-filtered scope | maybe | represent only as truthful zero, never as fabricated history |
| unavailable | AgentEconomicSummary.state = unavailable and boundary reports with unavailable states | read model / UI contract | derived | no | tenant-filtered scope | maybe | honest unavailable / empty / degraded UI state |
| not applicable | EconomicMultiInstanceClassification = not_applicable and adapter descriptors | adapter capability | derived | no | N/A | N/A | capability/descriptor only, not a financial state |

## 3. Source-of-truth / provenance map

| Future field | Source service / repository | Source identity | Tenant correlation | Execution/run correlation | Timestamp / version | Unit semantics | Degraded behavior | Historical availability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quote total | EconomicService.quote() / UsageQuote.total | quoteId, policyId, policyRevision | tenantId | none | expiresAt only; no createdAt field on the quote | NeuronsAmount | unavailable when quote is cross-tenant or absent | available from quote store |
| estimate by dimension | UsageQuote.estimatedByDimension | quoteId | tenantId | none | policyRevision | NeuronsAmount per dimension | empty map if no dimensions were estimated | available from quote store |
| reservation amount | UsageReservation.reserved | reservationId, quoteId, idempotencyKey | tenantId | none | expiresAt | NeuronsAmount | absent if reservation not found | available from reservation store |
| authorization result | EconomicService.authorize() | reservationId, planId | tenantId via reservation | none | derived at call time | boolean | throws if reservation inactive or invisible | not persisted |
| metered amount | UsageRecord.quantity | recordId, runId, dimension | tenantId | runId | observedAt | raw quantity + unit | empty list when no usage exists | available from usage store |
| settlement amount | Settlement.totalCharged | settlementId, reservationId, idempotencyKey | tenantId | runId | provider settledAt via SettlementProviderRecord | NeuronsAmount | unavailable if provider/store missing | available from settlement store/provider |
| receipt totals | EconomicReceipt.totalQuoted, totalCharged, totalReleased | receiptId, runId, settlementId | tenantId | runId | settlement commit time / provider settledAt | NeuronsAmount | absent if settlement not committed | available from receipt store |
| reconciliation outcome | EconomicService.reconcile() | provider settlement records | tenantId | runId | provider settledAt | settlement units | repaired = 0 when already committed | only via provider history |
| audit correlation | AuditEvent.correlationId, executionRunId | audit event id + correlation fields | tenantId | executionRunId | audit timestamp | n/a | unavailable if audit service absent | available from audit store |

Classify missing truth explicitly as:

- UNAVAILABLE when the repository or adapter does not expose the value;
- DERIVATION_REQUIRED when the value can only be computed from existing primitives;
- MISSING when the primitive does not exist;
- DECISION_GATED when the value exists only after a product decision;
- OUT_OF_SCOPE for invoice, payment, tax, accounting, and unrestricted remediation.

## 4. Existing Product API inventory

| Route / contract | Current read/write behavior | Tenant scope | Current semantics | M1 action |
| --- | --- | --- | --- | --- |
| GET /api/v1/economics and GET /api/v1/economics/summary | read-only | yes, via underlying services | zeroed operational summary with ECONOMIC_DATA_LIMITED warning | EXTEND |
| GET /api/v1/agents/:agentId/economics | read-only | yes | agent economics summary is currently unavailable in the client surface | EXTEND |
| GET /api/v1/deployments/:deploymentId/economics | read-only | yes | summary projection only | EXTEND |
| GET /api/v1/runtimes/:runtimeId/economics | read-only | yes | summary projection only | EXTEND |
| GET /api/v1/execution-runs/:runId/economics | read-only | yes | summary projection only | EXTEND |
| GET /api/v1/economics/quotes and GET /api/v1/economics/quotes/:quoteId | read-only | yes | list/detail currently return empty/undefined in the client projection | REPLACE WITH READ MODEL |
| POST /api/v1/agents/:agentId/economics/quote | write attempt | yes | 405 unsupported_action | KEEP GOVERNED |
| POST /api/v1/economics/quotes/:quoteId/reserve | write attempt | yes | 405 unsupported_action | KEEP GOVERNED |
| GET /api/v1/economics/reservations and :reservationId | read-only | yes | list/detail currently empty/undefined in the client projection | REPLACE WITH READ MODEL |
| POST /api/v1/economics/reservations/:reservationId/cancel | write attempt | yes | 405 unsupported_action | KEEP GOVERNED |
| GET /api/v1/economics/metering and :meterId | read-only | yes | materialized from execution runs + EconomicService.listUsage() | KEEP / EXTEND |
| POST /api/v1/economics/metering/:meterId/settle | write attempt | yes | 405 unsupported_action | KEEP GOVERNED |
| GET /api/v1/economics/settlements and :settlementId | read-only | yes | list/detail currently empty/undefined in the client projection | REPLACE WITH READ MODEL |
| GET /api/v1/economics/receipts and :receiptId | read-only | yes | list/detail currently empty/undefined in the client projection | REPLACE WITH READ MODEL |
| GET /api/v1/economics/audit | read-only | yes | derived from audit events with economic.* type | KEEP / EXTEND |
| GET /api/v1/execution-runs/:runId/economics/metering | read-only | yes | execution-run scoped metering view | KEEP / EXTEND |
| GET /api/v1/execution-runs/:runId/economics/settlement | read-only | yes | settlement view by run id | KEEP / EXTEND |

Proposed smallest M1 boundary:

- summary;
- list/search for quotes, reservations, settlements, receipts;
- detail for each of those four entities;
- provenance and evidence references for every surfaced monetary field;
- explicit empty, unavailable, and degraded states;
- no write endpoints, no settlement execution, no invoice/payment/tax/accounting side effects.

## 5. Dashboard economics inventory

The frozen 9005e3a hierarchy is preserved; the current dashboard contract exposes very little direct financial content.

| Dashboard region / value | Current source | Classification |
| --- | --- | --- |
| main dashboard KPI area | src/control-plane/product-api-client.ts: getDashboardSummary() | UNSUPPORTED for financial totals; the summary has no monetary widgets today |
| agent detail economics slot | src/control-plane/product-api-client.ts: #agentDetail() | TRUTHFUL_UNAVAILABLE (economicSummary.state = unavailable) |
| pricing / invoice boundary report | src/control-plane/product-api-client.ts: getPricingInvoiceBoundaryReport() | TRUTHFUL_UNAVAILABLE / DECISION_GATED |
| settlement visibility report | src/control-plane/product-api-client.ts: getSettlementReconciliationBoundaryReport() | TRUTHFUL_UNAVAILABLE / DECISION_GATED |
| reconciliation evidence report | src/control-plane/product-api-client.ts: getSettlementReconciliationBoundaryReport() | TRUTHFUL_UNAVAILABLE / DECISION_GATED |

No synthetic monetary value is legitimized. Any future visible total must come from a named authority and provenance chain.

## 6. Acceptance fixture plan

| Scenario | Repository fixture | Expected Product API state | Expected Control Plane state |
| --- | --- | --- | --- |
| tenant without economic activity | empty quote/reservation/usage/settlement/receipt store under one tenant | zero/empty summary, no quote/detail rows, no settlement/receipt rows | no audit event, no economic records |
| quote / estimate without later execution | EconomicService.quote() only | quote exists once the read model is wired; no settlement/receipt | quote durable, no usage, no settlement |
| active reservation | quote + reserve() | reservation is visible and reserved | reservation durable, tenant scoped |
| usage recorded | quote + reservation + recordUsage() | metering list contains the run and usage rows | usage durable and run-correlated |
| settlement completed | quote + reservation + usage + settle() | settlement and receipt are visible | settlement + receipt durable; audit event emitted |
| reservation released | quote + reservation + release() | reservation status released | reservation updated with zero remaining |
| reconciliation mismatch | provider record exists but store does not | read model should surface conflict / repair outcome, not success | reconciliation reports conflict or repair count |
| provider unavailable | provider adapter fails or is absent | degraded/unavailable semantics, no invented settlement | fail closed, no fake settlement |
| cross-tenant attempt | service instance tenant differs from record tenant | not found / tenant mismatch / no leakage | EconomicTenantMismatchError or filtered visibility |

## 7. Scope guardrails

Out of scope for this sprint and for M1 implementation:

- invoice issuance;
- payment capture;
- money movement;
- tax;
- accounting journals;
- unrestricted manual financial adjustments;
- provider expansion not authorized by the normative package.

Existing adjacent code is only inventoried, not expanded.

## 8. E16-M1 freeze

Sequence confirmed:

1. E16-M1-S01 — Economic Read-Model Contract
2. E16-M1-S02 — Pricing Provenance
3. E16-M1-S03 — Product API Exposure
4. E16-M1-S04 — Dashboard Integration
5. E16-M1-S05 — Acceptance and Milestone Closure

### S01 boundary

- contracts: quote, reservation, settlement, receipt, metering, and provenance read-models;
- principal files/modules: src/control-plane/operational-evidence-service.ts, src/http/routes/product-api-routes.ts, src/control-plane/product-api-client.ts, and read-model tests;
- persistence impact: read-only over existing economic stores;
- API impact: add/replace read-model responses only;
- tests: read-only contract tests for tenant isolation, provenance, empty/unavailable/degraded states;
- non-goals: settlement execution, billing mutation, invoice/payment/tax/accounting;
- commit boundary: one read-model slice only.

## 9. Readiness decision

E16-M1-S00: PASS
EPIC-16 EXECUTION READINESS: READY
AUTHORIZED NEXT SPRINT: E16-M1-S01 — Economic Read-Model Contract
PRODUCT CODE CHANGED: NO
GIT DIFF CHECK: PASS
