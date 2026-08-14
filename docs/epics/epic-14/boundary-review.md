# EPIC-14 Boundary Review

## 1. Previous EPIC alignment

### EPIC-10

EPIC-10 remains authoritative for Agent, AgentRevision, Composition, Runtime,
Deployment, ExecutionPlan, ExecutionRun, Worker, Credential, Provider, Engine,
Policy, Eligibility, Sandbox, Economic Contract and Product API semantics.
EPIC-14 changes discovery and presentation only.

### EPIC-11

EPIC-11 remains closed. EPIC-14 preserves its operational flows, state model,
Product API authority and `Fluxo > Módulo > Tela`. It addresses the documented
navigation-polish caveat without reopening the underlying domains.

### EPIC-12

EPIC-12 remains closed. EPIC-14 preserves control-plane/runtime/external-target
separation, readiness no-claim discipline, governance/administration caveats,
observability correlation and the decision that Economics is operational
evidence rather than billing.

### EPIC-13

EPIC-13 remains closed as a read-only financial boundary foundation. EPIC-14
may consolidate its seven app surfaces under Economics, but must preserve all
`not_claimed`, no-money-movement, tenant-accountability, compliance and
financial-truth constraints.

## 2. Explicit boundaries

| Boundary | EPIC-14 owns | EPIC-14 does not own |
|---|---|---|
| IA vs backend | taxonomy, ownership, navigation, drill-down | domain or API redefinition |
| UX vs semantics | presentation and discoverability | inventing status or authority |
| Operations vs administration | operational execution journeys | production administration suite |
| Governance vs configuration | authority/policy vs system configuration placement | new RBAC or policy engine |
| Evidence vs execution | proof and investigation routes | runtime mutation or orchestration |
| Financial vs operational | canonical Economics home and contextual references | payment, billing, settlement execution |
| Global vs contextual | domain nav vs selected-entity nav | making every entity/resource global |
| Current vs future | supported Product API capabilities | speculative product capabilities |

## 4. AEES-03 economic boundary

| Boundary | Implemented ACS truth | Explicit non-claim |
|---|---|---|
| Usage vs cost | Product API operational metering and `NEURONS` values | generic or fiat billing cost |
| Estimate vs recorded | quotes and `totalEstimated` are estimates; metering is recorded | estimate presented as settled amount |
| Operational settlement vs billing | settlement/receipt records are operational evidence | legal settlement, invoice, payment capture |
| Tenant attribution | optional internal tenant/workload fields; UI shows unavailable when not projected | inferred tenant ownership or cross-tenant aggregate |
| `$Neurons` | operational asset/unit, quote/reserve/meter/settle/receipt contract | wallet, exchange, balance, public tokenomics |
| EPIC-13 reports | read-only `not_claimed` financial-boundary evidence | readiness for billing, payment, invoice or production finance |

Frontend calculations cannot replace Product API authority. AEES-03 adds no
economic mutation, billing endpoint or financial readiness claim.

## 3. Contradictions discovered

No contradiction was found in backend domain contracts. Two presentation-level
conflicts must be resolved by EPIC-14:

1. EPIC-12 fixed Economics as operational evidence, while the current sidebar
   promotes seven EPIC-13 boundary reports as independent global destinations.
   Resolution: Economics is the canonical top-level domain; the reports become
   children and remain read-only.
2. The current `Governance & System` destination combines governance, policies,
   configuration, administration, tenants, acceptance and readiness concerns.
   Resolution: Governance and System become separate top-level domains;
   Administration remains System-contextual and governed.

## 4. Deferred work

- **AEES-02**: shell/nav implementation, breadcrumbs, contextual tabs, route
  migration and progressive disclosure mechanics.
- **AEES-03**: Economics landing and financial-boundary consolidation.
- **AEES-04**: tables, badges, state language, action hierarchy and visual
  consistency.
- **AEES-05**: browser, responsive, accessibility and regression acceptance.
- **AEES-06**: evidence reconciliation and bounded certification.

## 5. Out of scope

- Product API redesign for navigation convenience
- production authentication/RBAC implementation
- multi-tenant administration suite
- production financial operations or real money movement
- advanced runtime orchestration/fleet scaling
- new visual design system during AEES-01
- broad CSS or responsive implementation during AEES-01
- changes to `./static`

## 5.1 AEES-02 implementation deviations

No IA deviation was made. Two planned compatibility choices are explicit:

1. Current financial routes remain under `/system/*` because changing them is a
   route migration decision, not a requirement for domain ownership. The shell
   and domain navigation place them under Economics; AEES-03 may introduce new
   canonical Economics URLs with tested redirects.
2. `/runtime` remains a direct route but is an Operations compatibility child.
   This preserves existing deep links while preventing Runtime from appearing as
   a global domain.

The Operations planning view no longer assumes the literal `dev-agent-sandbox`
as the active operator context. It selects the first non-archived Product API
agent only to request available read-only readiness/plan projections and labels
that selection as planning context. A user-selectable operational context is
future refinement, not a claim of session-level selection.

## 6. Decision register

| ID | Decision | Status | Rationale / owner |
|---|---|---|---|
| D01 | Eight global domains | Resolved | operator domains, AEES-01 |
| D02 | Overview is attention/triage, not canonical storage | Resolved | prevents dashboard duplication |
| D03 | Agents owns identity/lifecycle; Operations owns executions/runtime | Resolved | preserves entity and runtime boundaries |
| D04 | Runtime and executions live under Operations | Resolved | execution journey continuity |
| D05 | Capabilities owns composition resources | Resolved | avoids seven global resource links |
| D06 | Governance and System are separate; Administration is System child | Resolved | authority differs from configuration/admin |
| D07 | Evidence owns observability and audit | Resolved | proof separate from action |
| D08 | Economics is canonical financial domain | Resolved | EPIC-12/13 alignment |
| D09 | Tenant is shell/entity context, not global domain | Resolved for current boundary | tenant admin remains not ready |
| D10 | Readiness is System-owned with Overview summary | Resolved | global state without a ninth domain |
| D11 | Canonical detail pattern is Domain > Collection > Entity > tab | Resolved | consistent drill-down |

## 7. Open questions

### Blocking decisions

None for AEES-02 navigation implementation.

### Non-blocking refinements

| ID | Question | Alternatives | Preferred direction | Dependency | Owner |
|---|---|---|---|---|---|
| OQ-01 | Final URLs for domain children | preserve existing / nested canonical URLs | preserve routes first, add redirects only with tested migration | route regression | AEES-02 |
| OQ-02 | Tenant selector visibility when no tenant exists | hidden / disabled / explicit unavailable | explicit unavailable in tenant-aware views, hidden elsewhere | Product API tenant projection | AEES-02/04 |
| OQ-03 | Default agent detail tab | summary / operations | summary with attention and authoritative state | usage/browser validation | AEES-02 |
| OQ-04 | Financial child grouping labels | boundaries by contract / operator workflow | operator workflow with contract identifiers secondary | EPIC-13 evidence | AEES-03 |
| OQ-05 | System acceptance/readiness grouping | single readiness area / separate children | single System readiness area with acceptance child | surface density test | AEES-02/04 |
