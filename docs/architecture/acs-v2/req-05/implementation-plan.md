# Implementation Plan

This is a dependency-ordered recommendation. It is not authorization to implement.

## IMP-02A — Application shell and navigation

**Scope:** reorganize top-level domains, contextual Agent navigation, breadcrumbs, global versus Agent-scoped entry points, terminology, and responsive hierarchy.

**Frontend dependencies:** existing routes/components and Product API client.

**Backend/API dependencies:** none for the first pass if links use existing routes; optional read-model work should remain separate.

**Validation:** route inventory checks, keyboard navigation review, responsive smoke review, and localhost navigation acceptance.

**Stop conditions:** any need to change ownership, authorization, or API semantics; unresolved terminology decision for organization/tenant; broken deep links.

## IMP-02B — Agent creation and configuration

**Scope:** guided progressive form using current create/update/revision commands; primary versus advanced grouping; catalog-backed selectors; clearer validation and revision consequences.

**Dependencies:** IMP-02A; current AgentDefinition and catalog contracts.

**API work:** none required for the minimum UX. A read model may be proposed if form catalogs become too fragmented.

**Validation:** create first Agent, edit current Agent, create revision, stale revision conflict, catalog failure, and recovery states.

**Stop conditions:** request to add instructions, variables, or playground fields without a frozen ACS contract.

## IMP-02C — Agent detail and lifecycle

**Scope:** split dense detail into Overview, Configuration, Revisions, and Advanced; add contextual action hierarchy and explicit lifecycle consequences.

**Dependencies:** IMP-02A and IMP-02B; REQ-04 lineage semantics.

**API work:** possibly a composed Agent overview read model; no mutation redesign.

**Validation:** current revision visibility, immutable history, adopt/restore, archive/restore, duplicate, delete guardrails, and revision conflict handling.

**Stop conditions:** any proposal to mutate historical revisions or create a second Agent identity owner.

## IMP-02D — Agent operational views

**Scope:** Agent-local Runs, Evidence, Usage/Cost, and Advanced operational links; preserve global cross-Agent pages.

**Dependencies:** IMP-02C and current entity-scoped Product API routes.

**API work:** assess a scoped activity/read model for consistent pagination/freshness.

**Validation:** correlation from Agent to run/evidence/economics, empty/error/partial states, provenance visibility.

**Stop conditions:** browser-side reconstruction becomes authoritative or hides unavailable evidence.

## IMP-02E — Validation/Test capability

**Scope:** only after a separate ACS contract decision for test admission, inputs, outputs, safety, and evidence.

**Dependencies:** contract decision, security/governance review, execution/evidence semantics.

**Validation:** test isolation, authorization, no production side effects, evidence and cost correlation.

**Stop conditions:** reliance on Agenta runtime, provider-owned identity, or an ungoverned direct invocation.

## VAL-02 — Localhost Agent Experience acceptance

Validate the complete flow: no Agents → create → configure → validate available readiness → save revision → overview → operate through existing governed paths → inspect run/evidence/economics → revise. Record missing test/playground as an explicit boundary until IMP-02E exists.

## Safe parallelism

Documentation, terminology review, and component inventory can proceed in parallel. IMP-02B depends on the navigation decisions from IMP-02A. IMP-02D depends on Agent context from IMP-02C. IMP-02E is contract-gated and must not run in parallel with implementation based only on Agenta patterns.

