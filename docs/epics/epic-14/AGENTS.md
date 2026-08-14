# EPIC-14 Agent Guide

This directory is the normative execution boundary for the ACS Control Plane UX
and navigation redesign. EPIC-14 reorganizes the existing surface; it does not
redefine Product API or backend domain truth.

## Read first

1. `README.md`
2. `EPIC-14_Strategic_Operational_Plan.md`
3. `architecture.md`
4. `contracts.md`
5. `boundary-review.md`
6. `ux-audit.md`
7. `information-architecture.md`
8. `stories.md`
9. `milestones/README.md`
10. the active milestone file

## Execution rules

- Preserve `Fluxo > Módulo > Tela`; implement operator journeys, not a folder
  reshuffle.
- Treat the Product API as authoritative for agent, composition, execution,
  evidence, governance, readiness, tenant and financial state.
- Keep control-plane assertions, observed runtime state and external execution
  targets distinct.
- Preserve loading, empty, ready, warning, blocked, error, pending, stale and
  recovery states.
- Use one canonical UX home for each major concept. Secondary surfaces link to
  that home instead of duplicating ownership.
- Keep observational, governed operational and administrative actions visibly
  distinct.
- Preserve tenant context where it applies; do not imply tenant administration
  or tenant governance readiness.
- Treat Economics as the canonical financial evidence domain. EPIC-13 billing
  boundary reports remain read-only evidence, not seven global destinations or
  production financial operations.
- Do not claim Production, Administration, Tenant Governance, Billing, Payment,
  Invoice, Compliance or Browser Acceptance readiness without explicit evidence.
- Do not modify `./static` unless a later milestone explicitly includes it.

## AEES-01 boundary

AEES-01 is documentation and planning only. Do not change frontend, Product API
or backend contracts. Resolve documentation conflicts before later
implementation and record unresolved decisions in the decision register.

## Handoff rule

Later AEES may implement only the hierarchy, terminology, ownership and
navigation contracts defined here. If implementation reveals a Product API
conflict, stop and update the boundary review rather than inventing UI truth.
