# EPIC-14 Strategic & Operational Plan

## 1. Mission

Create a coherent UX and navigation system for the ACS Control Plane without
changing the domain truth consolidated by EPIC-10 or the governed operational,
readiness and financial boundaries delivered by EPIC-11–13.

## 2. Strategic problem

The Control Plane grew by adding operational and boundary surfaces in delivery
order. The current shell exposes 22 sidebar destinations, including individual
composition resources and seven EPIC-13 financial boundary reports. This makes
implementation artifacts and milestone history compete with operator domains.

The problem is architectural before it is visual: ownership, hierarchy,
context and drill-down are not deterministic enough for later UX work.

## 3. Organizing principle

```text
Understand > Structure > Boundaries > Target IA > Execution
```

The established ACS planning boundary remains:

```text
Fluxo > Módulo > Tela
```

## 4. Operator outcomes

The target system must let an operator answer, in order:

1. What needs attention?
2. Which agent or execution is affected?
3. What is the authoritative state and supporting evidence?
4. What capabilities and governed composition apply?
5. What action is allowed, blocked or unsupported?
6. What financial or tenant context is relevant?

## 5. Target top-level domains

AEES-01 resolves the global hierarchy as:

1. **Overview**
2. **Agents**
3. **Operations**
4. **Capabilities**
5. **Evidence**
6. **Economics**
7. **Governance**
8. **System**

Administration is a governed subsection of System, not a peer domain.
Readiness is global and System-owned, with attention summaries in Overview.
Tenant context is persistent shell context when authoritative and entity context
otherwise; it is not a global destination in the current single/tenant-aware
boundary.

## 6. AEES roadmap

### AEES-01 — UX Audit & IA Redesign

Planning-only current-state map, finding inventory, target hierarchy, ownership
matrix, claim review, contracts and implementation stories.

### AEES-02 — Navigation & Progressive Disclosure

Implement shell/global navigation, domain landing pages, entity breadcrumbs,
contextual tabs, route redirects and primary/secondary/diagnostic tiers.

### AEES-03 — Financial Boundaries

Implement Economics as the canonical financial evidence home. Consolidate the
EPIC-13 boundary reports under domain navigation without weakening no-claim and
no-money-movement contracts.

### AEES-04 — Operator Experience & Visual Language

Normalize status/action language, density, hierarchy, tables, badges, forms,
empty states and governed-action distinction.

### AEES-05 — Browser Acceptance & Regression Hardening

Validate desktop/mobile navigation, direct routes, keyboard/accessibility,
critical journeys, visual regressions and Product API error states.

### AEES-06 — Closure & Certification

Reconcile implementation to contracts, record caveats, prove closure gates and
issue a bounded EPIC report without production-readiness inflation.

## 7. Dependencies

- EPIC-10: canonical Agent, Composition, Runtime, Deployment, Execution,
  Worker, Provider, Policy, Sandbox, Evidence and Economic Contract domains.
- EPIC-11: first operational surface, Product API consumption and state model.
- EPIC-12: readiness, governance, observability, operational reliability and
  Economics-as-operational-evidence decision.
- EPIC-13: governed read-only Billing & Financial Operations boundaries.

## 8. Implementation boundaries

- Reuse current Product API routes; do not change backend contracts to fit nav.
- Preserve deep links where practical; add redirects only during implementation.
- Do not expose every API resource globally.
- Do not hide governance or financial caveats through simplification.
- Do not turn System into an unbounded administration console.
- Do not claim browser acceptance during documentation work.

## 9. Validation strategy

- documentation reference and terminology checks in AEES-01;
- component and route tests in AEES-02–04;
- Product API contract regression throughout;
- browser, responsive and accessibility evidence in AEES-05;
- contract-to-evidence reconciliation in AEES-06.

## 10. Success condition

After AEES-01, a coder may implement the navigation model without deciding
domain taxonomy, concept ownership, financial placement, governance/system
separation, tenant-context behavior or canonical detail navigation.
