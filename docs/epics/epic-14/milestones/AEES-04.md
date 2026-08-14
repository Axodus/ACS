# AEES-04 — Operator Experience & Visual Language

## Objective

Establish a coherent operator review experience and consistent state/claim
language across the ACS Control Plane, built on the IA (AEES-01), navigation
(AEES-02) and financial boundaries (AEES-03) established earlier in EPIC-14.

## Status

```text
Status: COMPLETE
Completion Status: PASS
Operator Visual Acceptance: PASS
Hotfix-01: COMPLETE
Hotfix-02: COMPLETE
Open Visual Blockers: 0
Scope: standalone operator review flow, state/claim language and focused acceptance remediation
Backend/Product API changes: none
Browser acceptance: NOT EXECUTED — deferred to AEES-05
```

## Inputs

- `../README.md`
- `../architecture.md`
- `../contracts.md`
- `../boundary-review.md`
- `../information-architecture.md`
- `../ux-audit.md`
- `../stories.md`
- `../state-and-claim-language.md`
- `../financial-boundaries.md`
- `AEES-01.md`
- `AEES-02.md`
- `AEES-03.md`
- `.design/app-standalone/src/App.tsx`
- `.design/app-standalone/src/operational.css`

## Workstreams

### W1 — Operator journey

- Defined canonical review flow: Review → Identify attention → Inspect context → Diagnose → Determine actionability.
- Reframed Overview as "Operator Review" with attention-first layout.
- Added explicit review-flow breadcrumb on the landing surface.

### W2 — Density audit and hierarchy

- Reduced competing badges on Overview and agent headers.
- Consolidated redundant summary cards into attention-focused, context, and operations snapshots.
- Moved diagnostic and expert detail behind AEES-02 `SectionDisclosure` where appropriate.
- Prioritized identity, primary state, critical findings, and next-domain links.

### W3 — State taxonomy

- Created `state-and-claim-language.md` as the normative vocabulary.
- Dimensions kept orthogonal: lifecycle, operational health, readiness, governance/policy, connectivity/integration, availability.
- Unknown, unavailable and not-claimed remain explicit first-class states.

### W4 — Badge and claim system

- Centralized tone logic in `statusTone()`.
- Introduced `StateBadge` and `FindingSeverity` primitives for consistent presentation.
- Replaced raw `status` spans and generic badges in key review paths.
- Readiness surfaces now reuse the core `Status` component for consistency.
- Added explicit claim mapping table and prohibited stronger unsupported claims.

### W5 — Surface migration

- Overview: attention → domain links instead of generic dashboard.
- Agent detail: economic context already aligned from AEES-03; added severity component to composition findings.
- Readiness and operations lists: reused consistent state components.
- Cross-links from attention cards point to canonical domains rather than duplicating data.

### W6 — Regression validation

- Typecheck, lint, build and smoke tests executed.
- `git diff --check` executed.
- Manual review of healthy / degraded / failed / unknown / restricted / not-ready / no-data states via source inspection.

## HOTFIX-02 — Header consolidation

Operator Visual Acceptance Round 2 passed conditionally on removing the final
duplicated page-header hierarchy. HOTFIX-02 extended `DomainHeader` with a
reusable action slot and made it the canonical owner of page identity, compact
workspace/entity metadata and page-level actions.

The duplicated `DomainHeader` followed immediately by `page-head compact` was
removed from Overview, Readiness, Agents inventory, Operations, Composition,
Runtime, Evidence, Economics, Governance, Reliability and Settings. Refresh,
retry and create actions retain their original handlers, disabled states and
primary/secondary hierarchy inside `domain-header-actions`.

Remaining `page-head` uses belong to standalone catalog, detail or EPIC-13
financial-boundary surfaces that do not also render `DomainHeader`; they are not
the duplicate-header defect addressed here.

Final Operator Visual Acceptance: **PASS**. No structural visual blocker remains
for AEES-04.

## Acceptance criteria (AEES-04)

- [x] documented operator review journey
- [x] high-value surfaces use consistent information hierarchy
- [x] materially unnecessary density reduced on primary review surface
- [x] state terminology standardized in `state-and-claim-language.md`
- [x] major state dimensions kept semantically separate
- [x] badge usage follows defined rules
- [x] strong UI claims map to authoritative evidence
- [x] unknown/unsupported state represented honestly
- [x] critical warnings remain visible and linked to evidence
- [x] operator actions remain prioritized and limited to supported contracts
- [x] financial terminology remains aligned with AEES-03
- [x] final operator visual acceptance
- [ ] cross-browser/responsive acceptance (deferred to AEES-05)
- [x] no major regressions introduced in static validation

## Deferred / non-goals

- Full responsive, keyboard and browser acceptance (AEES-05)
- Broad design-system replacement or new component library
- New economic or governance contracts
- Reopening IA or route ownership
- Typography refinement, spacing normalization, micro-alignment, advanced
  responsive polish, design-token consolidation and product-wide layout
  harmonization unless they become operational usability defects

## Validation commands

```bash
cd .design/app-standalone
npm run typecheck
npm run lint
npm run build
npm test
cd ../..
git diff --check
```

## Exit criteria

AEES-04 is COMPLETE / PASS after HOTFIX-02 and final Operator Visual Acceptance.
AEES-05 becomes the active downstream browser-acceptance and regression-
hardening boundary. Deferred pixel-level polish does not reopen AEES-04 unless
it creates an operational usability or semantic defect.
