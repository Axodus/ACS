# ACS-V2-REQ-05 — Agent Experience and Application Navigation Audit

**Status:** `COMPLETE` for the documentation audit. **Implementation authorization:** none.

## Objective

Define an evidence-backed target experience for creating, configuring, validating, operating, observing, revising, and managing an ACS Agent. The audit preserves ACS ownership and treats Agenta as a UX/workflow reference only.

## Evidence inspected

- Current shell, routes, navigation, Agent inventory, detail, form, and state handling in `.design/app-standalone/src/App.tsx`.
- Product API client types and methods in `.design/app-standalone/src/api/product-api.ts`.
- Product API route handlers in `src/http/routes/product-api-routes.ts`.
- ACS-native Agent, revision, composition, deployment, runtime, and execution types in `src/control-plane/unified-agent-model.ts` and related services.
- Frozen Agent and persistence semantics in [REQ-03](../req-03/README.md) and [REQ-04](../req-04/README.md).
- Agenta local documentation and source references, especially [Build your first agent](/home/mzfshark/agenta/docs/docs/learn/_01-build-your-first-agent.mdx), [Agents concept](/home/mzfshark/agenta/docs/docs/concepts/01-agents.mdx), and the application overview source under `/home/mzfshark/agenta/web/oss/src/pages/`.

Evidence language follows the ACS architecture index: `VERIFIED LOCAL FACT`, `HISTORICAL RECORD`, `PROPOSED DESIGN`, `HYPOTHESIS TO VALIDATE`, and `PENDING DECISION`.

## Current assessment

The ACS frontend already exposes a functional Agent inventory, governed creation/update actions, composition, readiness, deployment/runtime summaries, lifecycle actions, revisions, evidence, audit, and economics. The main UX problem is hierarchy: a broad operational shell places low-level and future boundary surfaces beside the primary Agent workflow, while the creation form asks operators to make identity, composition, provider, credential-reference, and runner decisions together. The current Agent detail has useful context tabs, but it does not yet provide a validated test/playground path or a complete Agent-local activity/evidence/economics navigation.

## Target direction

Use the mental model `Agent → Configure → Validate/Test → Operate → Observe → Improve`. Keep Agent identity and revision lineage in ACS. Make Agent-local views the default for object work, retain global cross-Agent views for operations, and place runtime diagnostics, audit internals, governance, and financial boundaries behind secondary or advanced surfaces.

## Major gaps

- UI-only: navigation grouping, progressive disclosure, terminology, and contextual links.
- API/read-model: a composed Agent overview and Agent activity/read model would reduce browser-side reconstruction across detail, readiness, deployment, runtime, audit, evidence, and economics.
- Contract/product: no current ACS command/query proves a user-facing test/playground workflow; instructions, variables, prompt parameters, and interactive validation are absent from the current AgentDefinition contract.

## Decisions recorded

- Agenta: `REUSE UX PATTERN` and `ADAPT` selectively; never a runtime, identity, persistence, or provider authority.
- Creation: guided progressive form, with identity and purpose first and technical composition later.
- Agent ownership and immutable revision lineage: ACS-native, consistent with REQ-03/REQ-04.
- Dashboard: global health and attention routing, not the primary Agent configuration surface.
- Test/playground: `MISSING — FUTURE IMP`; keep it out of current-state claims.

## Implementation readiness

This audit is ready to inform a separately authorized implementation package. It does not authorize frontend, backend, API, schema, dependency, Agenta, or production changes.

## Deliverables

- [Current ACS UX audit](current-acs-ux-audit.md)
- [Agenta workflow reference](agenta-workflow-reference.md)
- [Agenta–ACS capability matrix](agenta-acs-capability-matrix.md)
- [Target information architecture](target-information-architecture.md)
- [Target Agent lifecycle](target-agent-lifecycle.md)
- [Screen inventory](screen-inventory.md)
- [API sufficiency and gaps](api-sufficiency-and-gaps.md)
- [Implementation plan](implementation-plan.md)
- [Decision record](decision-record.md)

## Proposed next milestone

Authorize and plan an application-shell and Agent-local navigation implementation package, after CTO review of the contract gaps and the proposed freeze statuses in [decision-record.md](decision-record.md).

