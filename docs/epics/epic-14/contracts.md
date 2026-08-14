# EPIC-14 UX & Navigation Contracts

## UX-IA-01 — Canonical ownership

Each major concept MUST have one canonical domain. Secondary exposure MUST use
a summary or filtered context and provide a link to the canonical home.

Review: the ownership matrix contains no competing canonical homes.

## UX-IA-02 — Operator-domain global navigation

Global navigation MUST expose the eight target domains: Overview, Agents,
Operations, Capabilities, Evidence, Economics, Governance and System. Backend
resource types MUST NOT be promoted solely because an endpoint exists.

Review: the global navigation definition contains only domain entries.

## UX-IA-03 — Navigation responsibilities

Global navigation selects a domain; domain navigation selects a workflow or
collection; contextual navigation selects a view of the current entity.

Review: every route is assigned exactly one responsibility level.

## UX-IA-04 — Entity context retention

Detail and drill-down views MUST retain entity identity, canonical parent,
tenant context when present, and a route back to the originating collection.

Review: direct and linked detail navigation expose consistent breadcrumbs or
equivalent context.

## UX-IA-05 — Product API authority

Status, readiness, governance, tenant, execution and financial claims MUST map
to authoritative Product API/backend state. The UI MUST NOT compute a stronger
claim from local state, route presence or visual tone.

Review: important labels have a claim-to-evidence mapping.

## UX-IA-06 — State distinction

Lifecycle, readiness, connectivity, health, deployment and runtime states MUST
remain semantically separate. `active`, `connected`, `healthy`, `ready`,
`deployed` and `running` MUST NOT be synonyms.

Review: status components and copy preserve the source field and meaning.

## UX-IA-07 — Operational versus administrative actions

Observational, governed operational and administrative actions MUST be
structurally distinguishable. Unsupported actions MUST remain disabled or
absent and MUST NOT simulate success.

Review: action metadata includes authority, confirmation and unsupported reason.

## UX-IA-08 — Financial boundary

Economics is the canonical domain for operational economics and EPIC-13
financial evidence. Operations MAY expose contextual cost/reservation data but
MUST link to Economics for canonical detail. No financial surface may imply
money movement or financial readiness.

Review: EPIC-13 reports are Economics children and preserve `not_claimed`.

## UX-IA-09 — Governance and administration separation

Governance owns policies, authority, guardrails and governed-action constraints.
System owns configuration, readiness, tenant visibility, administration
boundary and settings. Administration MUST NOT be a global peer or imply tenant
administration readiness.

Review: navigation and page headings reflect the separation.

## UX-IA-10 — Tenant context

Tenant context MUST be preserved across tenant-scoped navigation when the
Product API supplies an authoritative tenant. Absence of tenant context MUST be
shown as unavailable/not applicable, never inferred.

Review: tenant-scoped deep links retain context and cross-tenant transitions are
explicit.

## UX-IA-11 — Progressive disclosure tiers

Every major surface MUST classify information as Primary, Secondary,
Diagnostic, Administrative or Expert/raw before layout redesign.

Review: implementation stories name the expected tiers.

## UX-IA-12 — Complete operational states

Surfaces MUST preserve loading, empty, ready, warning, blocked, error, pending,
stale and recovery states where applicable.

Review: route/component tests cover applicable states; browser acceptance checks
their readable presentation.

## UX-IA-13 — Deep-link compatibility

Existing externally usable routes SHOULD remain functional or redirect to the
canonical destination during migration. Redirects MUST preserve entity and
tenant identifiers.

Review: route regression covers the current inventory.

## UX-IA-14 — Readiness claim discipline

EPIC-14 MUST NOT claim Production, Administration, Tenant Governance, Billing,
Payment, Invoice, Compliance or Browser Acceptance readiness without explicit
evidence and closure approval.

Review: automated copy scan plus closure review.
