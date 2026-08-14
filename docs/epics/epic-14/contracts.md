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

**AEES-02 evidence:** `/runtime` and the seven EPIC-13 financial routes remain
directly addressable; the shell marks them as compatibility routes and places
them under Operations or Economics domain navigation.

## UX-IA-14 — Readiness claim discipline

EPIC-14 MUST NOT claim Production, Administration, Tenant Governance, Billing,
Payment, Invoice, Compliance or Browser Acceptance readiness without explicit
evidence and closure approval.

Review: automated copy scan plus closure review.

## UX-IA-15 — Navigation accessibility baseline

Global and domain navigation MUST use links for route transitions, expose
`aria-current` for the active global domain, label icon-only shell controls and
keep disclosure controls semantic through native `details`/`summary`.

Review: typecheck/lint and later browser keyboard acceptance.

## UX-IA-16 — Economic authority and missing-data discipline

Economic values MUST preserve the Product API authority class and scope. Missing
or unavailable values MUST NOT be rendered as zero. The UI MUST distinguish
estimated, reserved, metered and operationally settled values.

Review: Economics labels include unit, authority context and unavailable states;
no local aggregation upgrades a value into billing truth.

## UX-IA-17 — Usage is not billing

Operational usage, quotes, reservations, metering, settlements and receipts MUST
NOT be labeled as invoices, payments, balances, revenue or legal/financial
settlement without an authoritative billing contract.

Review: copy scan and Economics boundary review preserve the \`not_claimed\`
posture of EPIC-13.

## UX-IA-18 — \`$Neurons\` contract boundary

\`$Neurons\` MAY be presented only according to the implemented ACS operational
economic contract (\`NEURONS\` asset/unit, quote, reserve, usage, settle and
receipt). Wallet, exchange, fiat, marketplace and ecosystem transaction claims
are unsupported unless a future contract explicitly establishes them.

Review: financial-boundaries inventory and UI claim-discipline panel contain no
speculative token or payment semantics.

## UX-IA-19 — Canonical Economics ownership

Economics MUST own canonical financial detail and EPIC-13 boundary evidence.
Agents, Operations and Evidence MAY expose contextual summaries or
unavailability states, but MUST link to Economics rather than duplicate
financial tables or imply tenant-wide scope.

Review: route ownership, cross-links and contextual panels identify Economics as
the canonical destination.

## UX-IA-20 — Orthogonal state dimensions

Lifecycle, operational health, readiness, governance, connectivity and
availability MUST remain distinct presentation dimensions. A single generic
status label MUST NOT replace authoritative source fields.

Review: representative entity and system surfaces expose separate labels when
more than one state dimension is relevant.

## UX-IA-21 — Claim strength and unknown state

Strong UI claims MUST map to an authoritative Product API/backend source.
Unknown, unavailable, unsupported and not-claimed states MUST remain explicit
and MUST NOT be rendered as healthy, ready or zero.

Review: state-and-claim-language.md contains the claim mapping; copy scans do
not find stronger unsupported claims.

## UX-IA-22 — Attention, severity and actionability

Finding severity MUST remain distinct from parent entity state and actionability.
Critical/blocking findings remain visible from review surfaces; non-blocking
warnings may be progressively disclosed. Actions MUST be limited to supported
Product API contracts and visibly distinguish governed or unavailable actions.

Review: Overview links attention to evidence/domain surfaces and does not imply
that every warning has a remediation action.

## UX-IA-23 — Badge and hierarchy discipline

Badges MUST communicate concise categorical state only. Each entity header SHOULD
have at most one primary state badge; secondary dimensions belong in summary
rows or disclosed sections. Badge color MUST NOT be the sole state or severity
signal.

Review: state-and-claim-language.md rules are applied to migrated surfaces and
critical warnings remain text-readable.

## UX-IA-24 — Sidebar owns domain-to-surface navigation

The global/sidebar navigation MUST own Domain → Surface hierarchy. Page-level
horizontal domain submenus are not the canonical navigation pattern and domain
navigation MUST NOT depend on horizontal scrolling.

Review: active domains expand in the sidebar, active child surfaces are
highlighted, and the content region contains no normal-domain horizontal menu.

## UX-IA-25 — Entity tabs and cross-domain transitions

Horizontal/context tabs are reserved for genuine contexts of the selected
entity. A cross-domain destination MUST be presented as a related link or a
supported contextual transition, not as a same-entity tab.

Review: Agent tabs contain Overview, Composition and Manage only; Operations,
Evidence and Economics are related canonical links.

## UX-IA-26 — Creation route isolation

`/agents/new` MUST be treated as a collection creation route, never as an
Agent entity identifier. Creation surfaces MUST NOT render entity tabs,
entity-only actions or entity diagnostics.

Review: targeted regression test proves that `/agents/new` is excluded from
EntityContextNav and route matching.
