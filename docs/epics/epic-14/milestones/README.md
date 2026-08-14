# EPIC-14 AEES Index

## Consumption order

1. `../README.md`
2. `../EPIC-14_Strategic_Operational_Plan.md`
3. `../architecture.md`
4. `../contracts.md`
5. `../boundary-review.md`
6. `../ux-audit.md`
7. `../information-architecture.md`
8. `../stories.md`
9. active AEES document

## AEES sequence and status

| AEES | Name | Status | Primary output |
|---|---|---|---|
| AEES-01 | UX Audit & IA Redesign | PASS | normative current/target IA package |
| AEES-02 | Navigation & Progressive Disclosure | PASS WITH FORMAL CAVEATS | shell/domain/context navigation and disclosure baseline |
| AEES-03 | Financial Boundaries | PASS WITH FORMAL CAVEATS | economic authority and financial-boundary implementation |
| AEES-04 | Operator Experience & Visual Language | PASS | operator review, state/claim language and header consolidation |
| AEES-05 | Browser Acceptance & Regression Hardening | ACTIVE | browser evidence and regression gates |
| AEES-06 | Closure & Certification | QUEUED | blocked until AEES-05 PASS or PASS WITH CAVEATS |

## Execution rule

Implement one AEES at a time. Preserve Product API and prior-EPIC boundaries.
An AEES does not pass because files changed; it passes only when its acceptance
criteria and validation evidence are complete.
