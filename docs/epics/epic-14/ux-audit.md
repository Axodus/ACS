# AEES-01 UX Audit

## 1. Audit scope and evidence

Audit date: 2026-08-14. This is a source and contract audit; no new browser
acceptance was executed.

Primary evidence:

- `.design/app-standalone/src/App.tsx` — shell, global navigation, routes,
  domain pages, state and action patterns.
- `.design/app-standalone/src/index.css` and `operational.css` — hierarchy and
  responsive behavior.
- `.design/app-standalone/src/api/product-api.ts` — frontend data contracts.
- `src/http/routes/product-api-routes.ts` — actual Product API capability and
  mutation boundary.
- `src/control-plane/product-api-client.ts` — projections, guardrails and claim
  semantics.
- EPIC-10 contracts and EPIC-11–13 architecture, contracts and closure reports.

## 2. Current-state IA map

### Current global navigation

The sidebar exposes 22 destinations in 14 visual groups:

```text
Dashboard | Readiness
Agents
Composition | Roles | Profiles | Capabilities | Skills | Tools & Plugins
Operational Execution | Runtime
Operational Evidence | Audit | Logs
Economics
Billing Boundary & Financial Truth
Pricing & Invoice Boundary
Payment Rails Boundary
Tenant Billing & Account Responsibility
Receipts, Settlement & Reconciliation
Financial Audit & Compliance
Billing UX & Operator Acceptance
Governance & System | Settings
```

`Memory` exists as a route and View value but is absent from the sidebar.
Engines, providers, tools and plugins have detail routes whose parentage is
partly implicit.

### Current route hierarchy

| Conceptual area | Routes |
|---|---|
| Awareness | `/`, `/readiness` |
| Agents | `/agents`, `/agents/new`, `/agents/:agentId`, `/agents/:agentId/edit`, `/agents/:agentId/composition` |
| Composition | `/composition`, `/roles[/id]`, `/profiles[/id]`, `/capabilities[/id]`, `/skills[/id]`, `/plugins[/id]`, `/tools/:id`, `/engines[/id]`, `/providers/:id` |
| Operations | `/operational-execution`, `/runtime` |
| Evidence | `/operational-evidence`, `/audit`, `/logs` |
| Economics | `/economics` |
| Financial boundaries | seven `/system/*` routes for billing, pricing/invoice, payment rails, tenant billing, settlement/reconciliation, financial audit and billing acceptance |
| Governance/System | `/system`, `/system/operational-reliability`, `/settings` |
| Placeholder | `/memory` |

### Conceptual hierarchy mismatch

- The route tree places financial reports under `/system`, while global nav
  promotes each as a peer domain.
- Composition is a domain overview but its backend resource types are also
  global peers.
- Operational Execution contains credentials, provider connections, readiness,
  plans, deployments, runtimes, runs and workers in one long view, while Runtime
  is also a global peer.
- Governance, policies, configuration, tenants, administration, acceptance and
  system readiness are grouped under one destination.
- Dashboard and Readiness both expose system health/readiness with overlapping
  summaries.

### Current operator entry and drill-down

- `/` is the default entry and provides aggregate metrics and blockers.
- Agent cards drill into agent detail; agent detail links to composition and
  executes lifecycle actions.
- Composition cards drill into resource catalogs and resource details.
- Operations largely remains a consolidated page rather than collection/detail
  journeys for deployment, runtime, execution run and worker.
- Evidence pages expose separate global collections; entity-specific Product
  API evidence routes exist, but contextual UI continuity is uneven.
- Cross-domain links exist through ad hoc `CrossLinks` and page-specific Links,
  not a single navigation contract.

## 3. Findings

Severity reflects operator correctness and governance risk, not visual taste.

| ID | Title | Affected surface | Category | Severity | Operator impact | Architectural cause | Recommended disposition | Target AEES | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| UX-001 | Global nav mirrors accumulated implementation resources | sidebar | Information Architecture | High | hard to form a domain model; too many peers | delivery-order nav with resource collections promoted globally | replace with eight operator domains | AEES-02 | `App.tsx` `navGroups` |
| UX-002 | Financial boundary reports appear as seven top-level domains | sidebar, `/system/*` | Governance / Boundaries | High | boundary evidence can be mistaken for operational financial products | EPIC-13 milestones mapped directly to global nav | consolidate under Economics and preserve no-claim copy | AEES-03 | `navGroups`, EPIC-13 closure |
| UX-003 | Governance and System mix authority, configuration and administration | `/system` | Governance / Boundaries | High | operator cannot tell governed policy from workspace/system configuration | one container for unrelated control concerns | split Governance and System; keep Admin contextual | AEES-02 | `GovernanceView`, system endpoints |
| UX-004 | Lifecycle, readiness, connectivity and runtime states use similar positive tones | shared `Status`, dashboard, agent cards | State Communication | Critical | `active`, `connected` or `running` may be read as ready/healthy/authorized | regex-based tone mapping and colocated metrics | use semantic state families tied to Product API fields | AEES-04 | `Status()` and `SummaryRow` usage |
| UX-005 | Dashboard states “Connected” without rendering the returned health status | `/` | Claim-to-Evidence | High | connectivity can be overstated during degraded/unverified conditions | fixed UI value rather than source projection | render authoritative field and evidence age | AEES-04 | `Dashboard` System overview |
| UX-006 | Readiness and Dashboard duplicate global health concepts | `/`, `/readiness` | Information Architecture | Medium | uncertain canonical location and repeated scanning | awareness implemented as two peer destinations | Overview owns triage; System owns readiness detail | AEES-02 | `Dashboard`, `Readiness` |
| UX-007 | Composition children compete with their parent globally | `/composition`, catalogs | Navigation | Medium | sidebar depth/length and weak parent-child orientation | every resource catalog receives a global item | Capabilities domain with child navigation | AEES-02 | `navGroups`, routes |
| UX-008 | Operations combines many object types in a single page | `/operational-execution` | Cognitive Load | High | investigation requires long scanning and weak entity continuity | milestone flow rendered as one surface | Operations landing plus domain collections/details | AEES-02 | `OperationalExecution` |
| UX-009 | Runtime is both part of Operational Execution and a global peer | `/operational-execution`, `/runtime` | Information Architecture | Medium | competing homes for runtime state | flow surface plus resource surface without canonical ownership | Operations owns Runtime child; agent detail links contextually | AEES-02 | `navGroups`, routes |
| UX-010 | Evidence concepts are split among Evidence, Audit, Logs and financial audit | evidence routes | Information Architecture | Medium | investigation context switches and correlation is hard to follow | separate milestone pages without shared evidence hierarchy | Evidence owns technical proof; financial audit remains Economics child with links | AEES-02/03 | routes and Product API evidence endpoints |
| UX-011 | Entity detail navigation is inconsistent across entity types | agent and resource details | Navigation | High | backtracking and current context differ by object | page-specific links and tabs | standardize Domain > Collection > Entity > tab | AEES-02 | agent/resource detail routes |
| UX-012 | Tenant context is visible as data but not persistent navigation context | system tenant and financial surfaces | Governance / Boundaries | High | operator may lose accountable tenant across transitions | tenant-aware backend without shell-context contract | preserve authoritative tenant in shell/entity context | AEES-02/03 | `/system/tenants`, tenant financial contract |
| UX-013 | Administrative actions and ordinary operational actions share generic controls | agent lifecycle, system/config pages | Governance / Boundaries | Critical | destructive/governed authority can be misunderstood | action hierarchy is component-local | introduce action classes and governed confirmations | AEES-04 | agent actions, unsupported panels |
| UX-014 | Unsupported, blocked and unavailable are not consistently separated | multiple pages | Terminology | High | operator cannot distinguish policy denial, absent support and temporary failure | labels vary by component/milestone | canonical state lexicon and reason display | AEES-04 | Product API structured errors; UI badges |
| UX-015 | Memory route is a placeholder without a defined domain home | `/memory` | Information Architecture | Low | dead-end/ambiguous capability | legacy View/route not in navigation | remove/redirect or explicitly place after capability review | AEES-02 | `View`, route, `GenericView` |
| UX-016 | Settings copy suggests configuration beyond implemented authority | `/settings` | Claim-to-Evidence | High | “Configure ACS” can imply supported administration/mutation | prototype wording and read-only field | reframe as System workspace configuration visibility until supported | AEES-04 | `Settings()` |
| UX-017 | Operational Execution uses a hard-coded agent for readiness/plans | `/operational-execution` | Operator Journey | Critical | displayed operational context may not match selected operator entity | milestone probe bound to `dev-agent-sandbox` | select explicit entity or present aggregate with no implied selection | AEES-02 | `OperationalExecution()` |
| UX-018 | Cross-domain references are ad hoc | multiple detail pages | Navigation | Medium | transitions vary and can duplicate content | no canonical link registry/pattern | define typed domain/entity reference links | AEES-02 | `CrossLinks` and scattered `Link` |
| UX-019 | Dense raw identifiers and evidence paths appear at primary level | readiness, composition, evidence | Cognitive Load | Medium | primary comprehension competes with diagnostic details | implementation metadata exposed without tiering | move IDs/paths to Diagnostic or Expert/raw disclosure | AEES-02 | mono IDs, evidence path lists |
| UX-020 | Page-level refresh patterns do not communicate shared snapshot scope | dashboard and multi-query pages | State Communication | Medium | operator may assume all data shares one timestamp | independent queries with common-looking refresh controls | expose per-source freshness and aggregate refresh semantics | AEES-04 | `useOperationalSummary`, `refreshAll` |
| UX-021 | Mobile sidebar hides the domain model behind an unstructured long list | responsive shell | Responsive / Browser | Medium | small-screen orientation is especially poor | desktop nav list translated directly to drawer | implement grouped domain navigation and context retention | AEES-05 | mobile CSS and current nav count |
| UX-022 | Current browser evidence does not accept the new IA | whole app | Responsive / Browser | Medium | no basis to claim redesigned nav works across viewports | AEES-01 is planning-only | execute route/visual/accessibility matrix after implementation | AEES-05 | EPIC-13 browser execution not executed |

## 4. Primary/secondary/diagnostic tier preparation

| Surface | Primary | Secondary | Diagnostic | Administrative | Expert/raw |
|---|---|---|---|---|---|
| Overview | attention, critical blockers, affected entity, next safe step | summaries and recency | readiness evidence links | none | source timestamps |
| Agent detail | identity, lifecycle, readiness, allowed action | composition and recent operations | findings/evidence | revisions and governed lifecycle controls | IDs/fingerprints/raw refs |
| Operation detail | state, target, progress, failure/next step | agent/worker/runtime relationships | events/logs/audit | retry/cancel only when governed | correlation IDs/payload refs |
| Capability detail | purpose, support, assignment impact | related roles/profiles/tools | compatibility findings | governed assignment/install controls | package/source/revision metadata |
| Evidence detail | finding, source, time, affected entity | related evidence chain | raw logs/diagnostics | retention/export when supported | payloads/paths |
| Economics | claim status, cost/reservation context, blockers | quote/metering/settlement summaries | receipts and financial evidence | future governed finance configuration | provider/account identifiers |
| Governance | policy effect, authority, blocked reason | policy relationships | decision evidence | governed policy actions | policy IDs/revisions |
| System | readiness, environment and service state | reliability/tenant/config summaries | gate/evidence detail | administration/settings | paths/raw configuration |

## 5. Claim-to-evidence review

| Claim | Authoritative source | Current disposition | UX rule |
|---|---|---|---|
| healthy | Product API health/component indicator | supported only at reported scope | include component, check time and degradation |
| ready | readiness projection/gate report | supported only by named readiness scope | never infer from active/connected |
| active | Agent lifecycle status | supported lifecycle state | do not style as readiness/authorization |
| connected | runtime/provider connectivity projection | supported connectivity state | do not equate with healthy or ready |
| governed | policy/guardrail/authority projection | supported as boundary/constraint | does not imply approved action |
| deployed | deployment record | supported deployment state | does not imply running or production-ready |
| running | runtime/execution observation | supported observed state | show source/freshness; not control-plane truth |
| isolated | isolation projection | supported only when source reports it | no inference from tenant or sandbox labels |
| available | worker/target/capability projection | source-specific | distinguish available from eligible/authorized |
| compliant | no authoritative compliance certification | unsupported | display `not claimed`, never definitive |
| synchronized | no universal sync contract | unsupported/inferred | avoid unless a specific projection exists |
| production-ready | production readiness report | explicitly not claimed | always preserve blockers/caveats |
| billing/payment/invoice ready | EPIC-13 boundary reports | explicitly not claimed | canonical Economics no-claim presentation |

## 6. Audit conclusion

The implementation already contains the required domains and substantial state
handling. The central problem is that delivery artifacts became navigation
peers. AEES-01 therefore recommends consolidation and clearer ownership, not a
backend rewrite or feature invention.
