# EPIC-17-IMP-09
# Control Plane IA & Administrative Domain

**STATUS:** `AUTHORIZED FOR CONTRACT/DESIGN REVIEW`
**IMPLEMENTATION:** `HOLD` pending CTO approval

## 1. Goal

Define the target Information Architecture (IA) for the ACS Control Plane, resolving the active `E17-R10-B14` blocker ("EPIC-14 IA and current navigation disagree on Administration placement"). IMP-09 must transition the current UI from its legacy layout to the canonical `Flow -> Module -> Screen` structure required by EPIC-14 and EPIC-17 REQ-10.

## 2. Blockers addressed

- **`E17-R10-B14`**: EPIC-14 IA and current navigation disagree on Administration placement.
- **`E17-R12-C12`**: Control Plane IA mapping.
- **`E17-R10-CD17` / `ADR-17-051`**: Reconciliation of the Administration IA divergence.

## 3. IA Reconciliation Decision (ADR-17-051 Candidate)

**Decision:** The primary global navigation will implement the EPIC-14 normative hierarchy:
1. Overview
2. Agents
3. Operations
4. Capabilities
5. Evidence
6. Economics
7. Governance
8. System

**Administration placement:**
"Administration" is no longer a top-level domain. Its capabilities are split based on ownership:
- **System Domain**: Receives system-wide readiness, configuration, operation models, workspace settings, and cross-tenant platform administration boundaries.
- **Governance Domain**: Receives Tenant administration, policies, guardrails, and authority boundaries.

This strictly conforms to the EPIC-14 specification and REQ-10 architectural limits.

## 4. Required Implementation Scope (Once authorized)

1. **Navigation rewrite:** Update the standalone app navigation to reflect the 8 canonical domains.
2. **Domain routing:** Relocate the current `Administration.tsx` contents into `System.tsx` (for readiness, settings, operational models) and `Governance.tsx` (for tenant administration and boundary visibility).
3. **Flow -> Module -> Screen structure:** Ensure that any nested views use canonical drill-down (e.g., Overview -> System -> Readiness) rather than flattened UI state.
4. **Product API alignment:** The UI must continue exclusively consuming the Product API. No new API routes or persistence models are authorized to support this UI refactoring.

## 5. Excluded Scope

- No changes to underlying Product API routes (IMP-07 remains the source of truth).
- No new Backend persistence, Schema 12 changes, or Schema 13.
- No changes to Runtime, Admission, or Execution logic.
- No modifications to Genome or Trait semantics (handled in IMP-08).

## 6. Required Validation for Closure

- `npm run build` passes with the new IA structure.
- UI tests (if any) and type checks pass.
- No parallel API calls or direct repository access from the UI.
- Blockers `E17-R10-B14` and `E17-R12-C12` can be formally marked as RESOLVED.

---
**CTO Action Required:**
Review this charter and authorize `ADR-17-051` (IA Reconciliation) so that IMP-09 implementation can begin.
