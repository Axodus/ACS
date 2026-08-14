# AEES-04 — Operator Experience & Visual Language

## Objective

Establish a coherent operator review experience and consistent state/claim
language across the ACS Control Plane, built on the IA (AEES-01), navigation
(AEES-02) and financial boundaries (AEES-03) established earlier in EPIC-14.

## Status

```text
Status: ACTIVE
Hotfix: IMPLEMENTED
Automated Validation: PASS WITH ENVIRONMENT CAVEAT
Operator Visual Acceptance Round 2: PENDING
Scope: standalone operator review flow, state/claim language and HOTFIX-01 remediation
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
- [ ] browser/visual acceptance (deferred to AEES-05)
- [x] no major regressions introduced in static validation

## Deferred / non-goals

- Full responsive, keyboard and visual acceptance (AEES-05)
- Broad design-system replacement or new component library
- New economic or governance contracts
- Reopening IA or route ownership

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

AEES-04 may be considered complete for commit when static validation passes,
the normative state language is in place, the primary review surfaces follow the
new hierarchy and terminology, and a dedicated local commit is created.

Browser acceptance and broader visual polish remain AEES-05.

