# EPIC-14 — ACS Control Plane UX & Navigation System

## Mission

Reorganize the ACS Control Plane around operator questions and canonical domain
ownership while preserving Product API authority, governed boundaries and
truthful state communication.

```text
Understand -> Structure -> Define Boundaries -> Specify Target IA -> Prepare Execution
```

## Current status

```text
EPIC-14: IN PROGRESS
AEES-01: PASS — normative UX audit and IA baseline
AEES-02: PASS — shell, domain/context navigation and disclosure baseline
AEES-03: PASS WITH FORMAL CAVEATS — operational economics and financial-boundary semantics
AEES-04: PASS — operator journey, state/claim language and final visual acceptance
AEES-05: PASS — browser acceptance and regression hardening
Frontend implementation: navigation/disclosure, operator-language, header consolidation and browser hardening implemented
Browser acceptance: PASS — AEES-05 complete
Production readiness: NO / not claimed
```

AEES-01 establishes an execution-ready architectural answer. It does not claim
that the target IA has been implemented or browser-accepted.

## AEES sequence

1. **AEES-01 — UX Audit & IA Redesign**: current-state audit, target IA,
   ownership, contracts and execution handoff.
2. **AEES-02 — Navigation & Progressive Disclosure**: shell, navigation,
   domain/context patterns and information-tier implementation.
3. **AEES-03 — Financial Boundaries**: Economics navigation and EPIC-13
   financial evidence consolidation.
4. **AEES-04 — Operator Experience & Visual Language**: hierarchy, actions,
   status language and visual consistency.
5. **AEES-05 — Browser Acceptance & Regression Hardening**: responsive,
   accessibility, visual and route acceptance.
6. **AEES-06 — Closure & Certification**: evidence reconciliation, caveats and
   bounded closure.

## Normative precedence

When documents disagree, apply this order:

1. Product API/backend contracts and closed EPIC-10–13 boundaries
2. `contracts.md`
3. `architecture.md`
4. `information-architecture.md`
5. `boundary-review.md`
6. `ux-audit.md`
7. `EPIC-14_Strategic_Operational_Plan.md`
8. `stories.md` and milestone execution documents

Planning assumptions and open questions never override a normative contract.

## Required reading order

1. `README.md`
2. `EPIC-14_Strategic_Operational_Plan.md`
3. `architecture.md`
4. `contracts.md`
5. `boundary-review.md`
6. `ux-audit.md`
7. `information-architecture.md`
8. `stories.md`
9. `milestones/AEES-01.md`
10. `milestones/AEES-02.md`
11. `financial-boundaries.md`
12. `milestones/AEES-03.md`
13. `state-and-claim-language.md`
14. `milestones/AEES-04.md`
15. `browser-acceptance.md`
16. `regression-inventory.md`
17. `milestones/AEES-05.md`

## Scope boundaries

EPIC-14 owns Control Plane information architecture, navigation semantics,
operator orientation, progressive disclosure preparation, terminology and
truthful state presentation. It does not own backend domain redesign,
production administration, tenant governance expansion, real financial
operations, runtime orchestration or speculative capabilities.

The implementation surface is `.design/app-standalone`. `./static` remains out
of scope unless a later AEES explicitly includes it.

## Implementation philosophy

- `Fluxo > Módulo > Tela`
- operator questions before backend resources
- one canonical home per major concept
- references instead of duplicated ownership
- global navigation for domains, contextual navigation for entities
- progressive disclosure before visual density changes
- authoritative evidence before definitive claims

## Artifact responsibility

| Artifact | Responsibility |
|---|---|
| `ux-audit.md` | authoritative current-state problem inventory |
| `information-architecture.md` | normative target taxonomy and navigation model |
| `architecture.md` | layers, ownership and implementation boundary |
| `contracts.md` | testable/reviewable UX architecture rules |
| `boundary-review.md` | previous-EPIC alignment, deferrals and open boundaries |
| `stories.md` | executable outcomes derived from the audit |
| `milestones/AEES-01.md` | AEES-01 inputs, workstreams, outputs and exit criteria |
| `milestones/AEES-02.md` | implemented navigation/disclosure baseline and validation record |
| `financial-boundaries.md` | authoritative economic inventory, semantic classes and claim boundary |
| `milestones/AEES-03.md` | AEES-03 implementation, validation and handoff record |
| `state-and-claim-language.md` | authoritative state dimensions, claim mapping and badge rules |
| `milestones/AEES-04.md` | AEES-04 activation, implementation and validation record |

## Validation expectations

Each AEES must validate referenced routes and files, Product API compatibility,
concept ownership, terminology, state handling, scope isolation and repository
checks. Browser claims require actual browser evidence; static validation alone
is insufficient.

## Closure conditions

EPIC-14 closes only when the target IA is implemented, critical journeys are
accepted in a browser, regressions pass, unresolved decisions are non-blocking,
and closure language preserves all readiness and financial caveats. AEES-01
closes when implementation no longer needs to decide how the Control Plane is
organized.
