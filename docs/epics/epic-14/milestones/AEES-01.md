# AEES-01 — UX Audit & IA Redesign

## Objective

Normatively define the current UX problem space and the target ACS Control Plane
information architecture before navigation implementation begins.

## Status

```text
Status: PASS
Scope: documentation / planning only
Frontend changes: none
Backend/Product API changes: none
Browser acceptance: not executed
```

## Inputs

- `.design/app-standalone/src/App.tsx`
- `.design/app-standalone/src/index.css`
- `.design/app-standalone/src/operational.css`
- `.design/app-standalone/src/api/product-api.ts`
- `src/http/routes/product-api-routes.ts`
- `src/control-plane/product-api-client.ts`
- `docs/epics/epic-10/**`
- `docs/epics/epic-11/**`
- `docs/epics/epic-12/**`
- `docs/epics/epic-13/**`

## Workstreams

### W1 — Current-State Inventory

Map the shell, 22 global navigation destinations, app route hierarchy, Product
API capability map, entity drill-down and current conceptual ownership.

### W2 — UX Problem Audit

Classify significant findings by category, severity, operator impact,
architectural cause, disposition, target AEES and source evidence.

### W3 — Domain & Boundary Analysis

Reconcile current concepts to EPIC-10 domain truth and EPIC-11–13 operational,
readiness, governance and financial boundaries. Assign one canonical UX home.

### W4 — Target IA

Define Overview, Agents, Operations, Capabilities, Evidence, Economics,
Governance and System, including global/domain/contextual navigation.

### W5 — Contract Definition

Translate ownership, state, authority, tenant, financial and deep-link choices
into testable/reviewable UX architecture contracts.

### W6 — Execution Preparation

Create implementation-oriented stories and explicit AEES-02–06 handoffs without
starting frontend work.

## Outputs

- `AGENTS.md`
- `README.md`
- `EPIC-14_Strategic_Operational_Plan.md`
- `architecture.md`
- `contracts.md`
- `boundary-review.md`
- `ux-audit.md`
- `information-architecture.md`
- `stories.md`
- `milestones/README.md`
- `milestones/AEES-01.md`

## Validation

- all referenced source routes/files exist;
- target domains map to current Product API capabilities;
- prior EPIC contracts are reviewed and contradictions identified;
- ownership matrix has one canonical home per concept;
- terminology and decision register are consistent;
- no implementation or `./static` files changed;
- repository documentation checks run where available;
- `git diff --check` passes;
- staged commit contains only `docs/epics/epic-14/**`.

## Exit criteria

- current IA documented;
- classified audit complete;
- target global hierarchy resolved;
- global/domain/context navigation responsibilities explicit;
- domain ownership, financial, governance and tenant boundaries explicit;
- claim-to-evidence mappings defined;
- information tiers prepared;
- later AEES inputs and stories executable;
- no blocking IA decision remains.

## Result

AEES-01 answers how the Control Plane should be organized. AEES-02 may begin
navigation implementation without architectural reinterpretation. This result
does not claim that the IA has been implemented, visually accepted or certified.
