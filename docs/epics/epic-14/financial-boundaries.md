# EPIC-14 Financial Boundaries

## Mission

Establish a truthful economic boundary for the ACS Control Plane so operators
can distinguish operational usage, operational economics, financial no-claim
evidence and unsupported billing semantics without architectural guesswork.

## Normative principles

1. Operational truth does not equal economic truth.
2. Economic truth does not equal billing truth.
3. Missing values are unavailable, not zero.
4. Estimated, metered and settled values must remain distinct.
5. Economics is the canonical home for financial detail and EPIC-13 boundary
   evidence.
6. Cross-domain financial exposure is contextual only.
7. \`$Neurons\` semantics must not exceed implemented ACS contracts.

## Current implemented economic sources

| Datum / surface | Product source | Authority class | Unit | Scope | Freshness | UI status | Notes |
|---|---|---|---|---|---|---|---|
| Economics summary | \`GET /economics\` via Product API | Authoritative projection | operational unit / \`NEURONS\` context | global control-plane projection | request-time snapshot | exposed | Source of truth for totals and aggregate warnings |
| Quote list | \`GET /economics/quotes\` | Authoritative projection | operational unit / \`NEURONS\` | quote, optional agent/workload context | request-time snapshot | exposed | Estimated pre-execution economics only |
| Reservation list | \`GET /economics/reservations\` | Authoritative projection | operational unit / \`NEURONS\` | reservation, optional agent/execution context | request-time snapshot | exposed | Reserved operational value, not payment authorization |
| Metering records | \`GET /economics/metering\` | Authoritative projection | operational unit plus usage dimensions | execution/runtime/provider context | request-time snapshot | exposed | Recorded operational usage evidence |
| Settlement records | \`GET /economics/settlements\` | Authoritative projection | operational unit / \`NEURONS\` | execution/reservation settlement context | request-time snapshot | exposed | Operational settlement record, not legal settlement |
| Receipt records | \`GET /economics/receipts\` | Authoritative projection | operational unit / \`NEURONS\` | execution/settlement context | request-time snapshot | exposed | Operational receipt evidence, not invoice/payment receipt |
| Agent economic summary | \`AgentDetail.economicSummary\` | Authoritative unavailability state | n/a | agent | request-time snapshot | exposed | Current state is only \`unavailable\` with message |
| Deployment/runtime/run economics | Product API economic summary filters | Authoritative projection | operational unit / \`NEURONS\` | deployment/runtime/run | request-time snapshot | partially exposed | Canonical detail remains Economics-owned |
| Billing boundary | \`GET /system/billing-boundary\` | Authoritative boundary report | no monetary truth claimed | system / product boundary | request-time snapshot | exposed | Claim must remain \`not_claimed\` |
| Pricing & invoice boundary | \`GET /system/pricing-invoice-boundary\` | Authoritative boundary report | no invoice/currency readiness claimed | system / product boundary | request-time snapshot | exposed | Read-only no-claim surface |
| Payment rails boundary | \`GET /system/payment-rails-boundary\` | Authoritative boundary report | no payment-settlement truth claimed | system / product boundary | request-time snapshot | exposed | No money movement |
| Tenant billing boundary | \`GET /system/tenant-billing-boundary\` | Authoritative boundary report | no tenant-billing readiness claimed | tenant/account boundary | request-time snapshot | exposed | Tenant/accountability evidence only |
| Settlement reconciliation boundary | \`GET /system/settlement-reconciliation\` | Authoritative boundary report | no legal/financial reconciliation readiness claimed | system / product boundary | request-time snapshot | exposed | Read-only boundary evidence |
| Financial audit boundary | \`GET /system/financial-audit\` | Authoritative boundary report | no audit-readiness claim | system / product boundary | request-time snapshot | exposed | Boundary evidence only |
| Billing acceptance review | \`GET /system/billing-acceptance\` projections and static review flow | Informational | n/a | operator review flow | request-time snapshot + static package | exposed | Acceptance baseline, not readiness |

## Semantic classification

### Authoritative

- Product API responses for economics summary, quotes, reservations, metering
  records, settlements, receipts, EPIC-13 boundary reports and explicit
  \`unavailable\` economic summaries on agent surfaces.

### Derived

- None are promoted as canonical UI truth in AEES-03.
- Aggregated totals remain authoritative because the Product API already returns
  them as projections.

### Estimated

- Quote amounts.
- Summary \`totalEstimated\`.
- Any value explicitly described as estimated before execution.

### Projected

- EPIC-13 readiness/boundary reports when they describe future financial
  capabilities or blocked claims.
- Review/acceptance sequencing that exists only as no-claim boundary planning.

### Informational

- Billing acceptance review sequencing.
- Cross-domain links and contextual explanations.
- UI wording that explains absence of tenant scope or missing data.

### Unsupported

- Wallet balances
- Fiat settlement
- Invoices as real financial records
- Payment capture
- Revenue accounting
- Exchange rates
- Budget judgments such as within budget / over budget
- Quota or balance claims without Product API evidence
- \`$Neurons\` exchange or marketplace semantics

## Unit system

| Concept | Supported unit | Rule |
|---|---|---|
| Operational economics totals | \`NEURONS\` / Product API operational unit | canonical for current economics surfaces |
| Usage dimensions | dimension-specific units from metering records | must remain labeled per dimension |
| Currency | Product API field only | informational unless a concrete billing contract exists |
| Billing amount | unsupported | must not be inferred from operational values |

## \`$Neurons\` boundary

Implemented ACS semantics for \`$Neurons\` are limited to the operational
economic contract:

- asset code: \`NEURONS\`
- quote
- reserve
- authorize
- record usage
- settle
- receipt

AEES-03 must not reinterpret this as wallet product, user balance product,
payment rail, exchange asset, settlement network or public ecosystem
transaction ledger.

## Tenant and attribution findings

1. The economic contract supports optional \`tenantId\` and \`workloadId\`
   internally.
2. The current standalone shell does not receive a reliable tenant projection
   for global navigation context.
3. Agent detail economics are currently only exposed as \`unavailable\`.
4. Execution/provider/runtime attribution exists in operational evidence records
   and may be shown contextually, but canonical economic interpretation remains
   inside Economics.

## Cross-domain rules

- Agents may show economic availability/unavailability plus a link to Economics.
- Operations may show contextual quote, reservation, metering or settlement
  references only when the Product API already provides them.
- Evidence may reference settlement/receipt records as supporting evidence.
- System and Governance must not become competing financial homes.

## Prohibited claim language

Do not present the following without a future authoritative billing contract:

- billed
- paid
- payment due
- outstanding balance
- invoice issued
- financially settled
- revenue
- wallet balance
- exchange value
- within budget
- over budget

## AEES-03 implementation consequence

The Economics landing must lead with current scope and claim discipline,
authoritative operational economics totals, contextual attribution and
estimated/reserved distinctions, diagnostic metering/settlement/receipt
evidence and EPIC-13 financial boundary evidence.

