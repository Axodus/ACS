# AEES-02 — Navigation & Progressive Disclosure

## Objective

Implement the AEES-01 navigation shell, operator-domain grouping, contextual
orientation and progressive-disclosure baseline without changing Product API or
backend domain contracts.

## Status

```text
Status: PASS WITH FORMAL CAVEATS
Scope: standalone Control Plane navigation and hierarchy
Backend/Product API changes: none
Browser acceptance: NOT EXECUTED — deferred to AEES-05
```

## Inputs

- `../README.md`
- `../architecture.md`
- `../contracts.md`
- `../boundary-review.md`
- `../ux-audit.md`
- `../information-architecture.md`
- `../stories.md`
- `AEES-01.md`
- `.design/app-standalone/src/App.tsx`
- `.design/app-standalone/src/operational.css`

## Workstreams and delivered output

### W1 — Navigation Shell

- Replaced the 22-item resource/milestone sidebar with eight global domains:
  Overview, Agents, Operations, Capabilities, Evidence, Economics, Governance
  and System.
- Added active-domain state, `aria-current`, mobile close/open labels,
  breadcrumbs and explicit workspace/tenant boundary language.

### W2 — Route & Domain Alignment

- Added centralized path-to-domain and route-ownership classification.
- Kept `/runtime` and EPIC-13 `/system/*` financial links as compatibility
  routes while locating them under Operations/Economics local navigation.
- Preserved existing deep links; no route removal or redirect migration was
  required for this AEES.

### W3 — Contextual Navigation

- Added consistent domain navigation for every domain.
- Added contextual agent/resource tabs in the shell, preserving a route back to
  collection and canonical cross-domain destinations.
- Added domain/entity breadcrumb orientation.

### W4 — Disclosure Primitives

- Added reusable `SectionDisclosure` using native `details`/`summary`.
- Implemented Secondary, Diagnostic and Expert / Raw tiers in Operations.
- Added reusable styles for disclosure, route ownership, domain headers and
  mobile-safe horizontal domain/context navigation.

### W5 — Surface Migration

- Added domain headers to Overview, System Readiness, Agents, Operations,
  Capabilities, Evidence, Economics, Governance, Reliability and Settings.
- Reframed Settings as workspace/configuration visibility rather than a
  production administration console.
- Removed the literal hard-coded `dev-agent-sandbox` request from Operations.
  Readiness/planning requests now use a clearly-labelled available non-archived
  Product API agent as planning context when present.

### W6 — Validation & Regression

- Standalone typecheck: PASS.
- Standalone lint: PASS.
- Standalone production build: PASS.
- Standalone smoke tests: PASS (3/3).
- `git diff --check`: recorded at completion.

## Navigation state model

| State | Meaning |
|---|---|
| default | navigable domain/child not currently selected |
| hover/focus | interactive affordance; does not imply authorization |
| active | current route/domain only |
| compatibility | retained deep link whose canonical domain is shown by shell |
| contextual | selected agent/resource route |
| legacy | retained but not globally exposed (`/memory`) |
| unavailable | contextual tab/capability not currently supported |

Navigation state is separate from lifecycle, readiness, health or authority.

## Empty/loading/error behavior

- Shell and domain navigation remain present during Product API loading/error.
- Existing `useOperationalSummary` behavior retains stale snapshots where data
  exists and presents child errors locally.
- Operations distinguishes absent planning context from a valid readiness/plan
  response and does not simulate an agent selection.

## Responsive and accessibility preparation

- Domain and context navigation use links and scroll horizontally instead of
  requiring fixed desktop width.
- Global navigation uses `aria-current`; shell icon controls have labels.
- Disclosure uses semantic native `details`/`summary`.
- Full visual, keyboard and mobile acceptance remains AEES-05 work.

## Deferred work

- Domain-specific redirects/new canonical Economics URLs: AEES-03.
- Broader state/badge language normalization: AEES-04.
- Apply disclosure tiers across all details/tables: AEES-04.
- Browser, responsive and accessibility acceptance: AEES-05.
- User-selectable, persisted operational planning context: future refinement
  after a supporting Product API contract.

## Exit criteria

- [x] approved domain grouping appears in the shell
- [x] major routes have centralized canonical ownership
- [x] duplication materially reduced in global navigation
- [x] active domain/entity orientation is present
- [x] deep links remain available for major workflows
- [x] reusable disclosure primitive exists and is applied to dense operations
- [x] Product API/backend contracts unchanged
- [x] frontend validation suite passes
- [ ] browser acceptance evidence — deferred to AEES-05
