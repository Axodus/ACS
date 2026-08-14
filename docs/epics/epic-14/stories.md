# EPIC-14 Implementation Stories

The audit records problems. These stories define executable outcomes and are
grouped by target AEES.

## AEES-02 — Navigation & Progressive Disclosure

### IA-01 — Replace resource-first global navigation

- **Problem:** 22 current destinations mix domains, resources and milestone reports.
- **Operator outcome:** eight stable global domains with clear current-domain context.
- **Scope:** shell nav, domain entry routes, active state and mobile drawer.
- **Dependencies:** UX-IA-01–03, target hierarchy.
- **Affected surfaces:** `App.tsx` shell and all global routes.
- **Acceptance:** only eight domain entries globally; every current route has a
  domain owner; direct routes remain functional or redirect.
- **Contracts:** UX-IA-01, 02, 03, 13.

**AEES-02 status:** Implemented. Global navigation now contains only the eight
operator domains. Remaining caveats are visual/responsive acceptance, not IA.

### IA-02 — Introduce domain navigation

- **Problem:** composition, operations, evidence and system children appear as peers.
- **Operator outcome:** child collections are discoverable inside their domain.
- **Scope:** local nav for Operations, Capabilities, Evidence, Governance, System.
- **Dependencies:** IA-01.
- **Affected surfaces:** composition catalogs, execution/runtime, evidence, system.
- **Acceptance:** child links are absent from global nav and present in the
  correct domain; parent context remains visible.
- **Contracts:** UX-IA-02, 03.

**AEES-02 status:** Implemented. Domain children live in local domain
navigation. Financial children remain compatibility routes under `/system/*`.

### IA-03 — Standardize entity detail context

- **Problem:** detail orientation and cross-links differ by entity.
- **Operator outcome:** consistent Domain > Collection > Entity > tab navigation.
- **Scope:** agent first, then operations and capability resources.
- **Dependencies:** IA-01/02.
- **Affected surfaces:** agent/resource detail, future run/runtime details.
- **Acceptance:** direct and linked entry retain parent/entity/tenant context.
- **Contracts:** UX-IA-04, 10, 13.

**AEES-02 status:** Implemented for agent and capability-resource details
through shared context tabs and breadcrumbs. Dedicated execution-run/runtime
detail pages remain future work if Product API adds canonical entity pages.

### IA-04 — Split Operations into operator journeys

- **Problem:** one long surface mixes access, readiness, plans, deployments,
  runtimes, runs and workers and uses a hard-coded agent probe.
- **Operator outcome:** explicit aggregate or selected-entity context and focused children.
- **Scope:** Operations landing and child collections; remove implicit agent context.
- **Dependencies:** Product API lists/details.
- **Affected surfaces:** `/operational-execution`, `/runtime`.
- **Acceptance:** no hard-coded entity masquerades as current selection; Runtime
  is Operations-owned; summaries link to canonical details.
- **Contracts:** UX-IA-01, 03–05.

**AEES-02 status:** Implemented as an Operations landing with Runtime as a
compatibility child and explicit planning-context labeling. A persisted
operator-selected execution context remains deferred.

### IA-05 — Prepare progressive disclosure tiers

- **Problem:** raw IDs, evidence paths and configuration compete with primary state.
- **Operator outcome:** immediate comprehension with diagnostic depth available.
- **Scope:** tier annotations/components for major domain and entity pages.
- **Dependencies:** tier matrix in `ux-audit.md`.
- **Affected surfaces:** Overview, agent, operation, capability, evidence, system.
- **Acceptance:** primary area contains identity/state/attention/next action;
  diagnostic/admin/raw information is secondary or disclosed.
- **Contracts:** UX-IA-11, 12.

**AEES-02 status:** Implemented as reusable primitives plus Operations
application. Broader table/detail density work remains AEES-04.

## AEES-03 — Financial Boundaries

### FIN-01 — Consolidate financial navigation under Economics

- **Problem:** seven read-only boundary reports appear globally.
- **Operator outcome:** one Economics domain with workflow-oriented child nav.
- **Scope:** `/economics` landing and current `/system/*` financial routes.
- **Dependencies:** EPIC-13 contracts and reports.
- **Affected surfaces:** all financial boundary pages and sidebar.
- **Acceptance:** reports are Economics children; no no-claim copy is weakened;
  existing deep routes remain compatible.
- **Contracts:** UX-IA-08, 13, 14.

### FIN-02 — Preserve contextual economics references

- **Problem:** cost/reservation evidence is mixed into operations without ownership rules.
- **Operator outcome:** enough context to understand impact, with canonical detail in Economics.
- **Scope:** agent/run/deployment contextual summaries and links.
- **Dependencies:** FIN-01 and authoritative Product API data.
- **Affected surfaces:** Operations and Agent details.
- **Acceptance:** no invented values; tenant/account context preserved; financial
  detail is not duplicated.
- **Contracts:** UX-IA-01, 08, 10.

### FIN-03 — Label operational economics by authority

- **Problem:** Economics shows values without making estimate, recorded usage,
  operational settlement and billing boundaries explicit.
- **Operator outcome:** an operator can identify the authority, unit, scope and
  limitation of each displayed economic value.
- **Scope:** Economics landing summary, disclosure tiers, missing-data language
  and `$Neurons` boundary copy.
- **Dependencies:** Product API economics projections, UX-IA-16–18.
- **Affected surfaces:** `/economics`, agent economic contextual summary.
- **Acceptance:** estimated/reserved/metered/settled values are distinct;
  unavailable is not zero; receipts are operational evidence; unsupported
  billing, wallet and exchange claims are absent.
- **Contracts:** UX-IA-05, 08, 16–19.

### FIN-04 — Treat EPIC-13 reports as boundary evidence

- **Problem:** compatibility `/system/*` routes can be mistaken for product
  billing capabilities.
- **Operator outcome:** the operator understands that these routes document
  financial no-claims and controls, not active payment or billing workflows.
- **Scope:** Economics cross-links and financial boundary copy.
- **Dependencies:** EPIC-13 closed contracts, UX-IA-08 and 17.
- **Affected surfaces:** `/economics` and existing financial compatibility routes.
- **Acceptance:** every financial boundary route links to Economics; all
  `not_claimed` language survives; no monetary action is exposed.
- **Contracts:** UX-IA-08, 13, 14, 17, 19.

## AEES-04 — Operator Experience & Visual Language

### UX-01 — Normalize state language and status presentation

- **Problem:** lifecycle/readiness/connectivity/runtime states share tones and wording.
- **Operator outcome:** state meaning is readable without color inference.
- **Scope:** status taxonomy, badges, legends and copy.
- **Dependencies:** claim-to-evidence table and Product API fields.
- **Affected surfaces:** all domains.
- **Acceptance:** active/connected/deployed/running/ready remain distinct; fixed
  “Connected” copy is removed; unsupported/blocked/unavailable differ.
- **Contracts:** UX-IA-05, 06, 12, 14.

### UX-02 — Distinguish action authority

- **Problem:** observational, operational and administrative actions look similar.
- **Operator outcome:** safe understanding of what can change and why.
- **Scope:** action types, disabled reasons, confirmations and governed markers.
- **Dependencies:** Product API action metadata.
- **Affected surfaces:** Agents, Operations, Governance, System.
- **Acceptance:** unsupported actions never simulate success; destructive/admin
  actions have explicit authority and confirmation.
- **Contracts:** UX-IA-07, 09.

### UX-03 — Reframe Settings and System copy

- **Problem:** “Configure ACS” overstates current authority.
- **Operator outcome:** current read-only/limited configuration boundary is explicit.
- **Scope:** System/Settings headings and action availability.
- **Dependencies:** System ownership decision.
- **Affected surfaces:** `/settings`, `/system`.
- **Acceptance:** copy maps to supported contracts and no admin readiness is implied.
- **Contracts:** UX-IA-05, 09, 14.

## AEES-05 — Browser Acceptance & Regression Hardening

### ACC-01 — Accept critical operator journeys

- **Problem:** source correctness does not prove usable navigation.
- **Operator outcome:** desktop/mobile direct and linked journeys are reliable.
- **Scope:** Overview -> Agent -> Evidence; Overview -> Operation -> Evidence;
  Capability -> Agent; Operation -> Economics; System/Governance boundary.
- **Dependencies:** AEES-02–04 implementation.
- **Acceptance:** browser screenshots/manifest, keyboard focus, mobile drawer,
  empty/error/stale states and route regressions pass.
- **Contracts:** all UX-IA contracts.

## AEES-06 — Closure & Certification

### CLS-01 — Reconcile architecture to evidence

- **Problem:** implementation can drift from the normative package.
- **Operator outcome:** target IA and claims are demonstrably implemented within caveats.
- **Scope:** ownership, routes, terminology, state/action semantics and browser evidence.
- **Dependencies:** all prior AEES.
- **Acceptance:** no blocking decision remains; no competing canonical homes;
  all no-claims preserved; closure report names caveats and changed files.
- **Contracts:** all UX-IA contracts.
