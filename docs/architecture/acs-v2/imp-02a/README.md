# ACS-V2-IMP-02A — Application Shell & Navigation

**Status:** `COMPLETE`
**Date:** 2026-09-10
**Scope:** frontend-only application shell and navigation work in `.design/app-standalone`.

## Objective

Implement the shell and navigation architecture frozen by REQ-05 so ACS has a
clear global control-plane context and an explicit Agent-local context. Reuse
the existing routes, Product API client, Agent detail read model, and governed
editor. Do not add backend contracts, persistence, dependencies, provider
integrations, or production behavior.

## Baseline

This implementation uses the REQ-05 audit and its target information
architecture, screen inventory, API sufficiency assessment, implementation
plan, and decision record. The current architecture package remains
`PLANNING / DISCOVERY`.

## Implemented shell and navigation

The primary shell now presents these global domains in order:

```text
Dashboard → Agents → Runs → Evidence → Usage & Cost → Runtime → Administration
```

Existing URLs remain compatible. Legacy operational surfaces are grouped under
the canonical domains and remain reachable through compatibility links.

Agent routes expose this local context:

```text
Overview → Configuration → Validate → Runs → Revisions → Evidence → Usage & Cost → Advanced
```

Configuration uses the existing `/agents/:agentId/edit` editor. Validate is
composition and readiness inspection; no test or playground execution was
introduced. Revisions use the existing revision endpoint and keep lifecycle
controls on the governed overview. Agent-scoped Runs, Evidence, and Usage &
Cost routes render an explicit unavailable state because the client has no
verified unified Agent-scoped aggregation contract.

## Compatibility and boundaries

- Existing `/agents/:agentId`, `/agents/:agentId/edit`, and
  `/agents/:agentId/composition` routes remain available.
- No new API, read model, database migration, dependency, or backend file was
  added.
- No activation, deployment, provider, runtime, test/playground, or revision
  semantics were changed.
- Advanced links keep composition, readiness, execution planning, runtime, and
  audit access discoverable without making those details the primary Agent
  surface.

## Validation state

Typecheck, lint, build, the isolated frontend suite, and localhost smoke
validation passed. The exact commands and observed routes are recorded in
[localhost-validation.md](localhost-validation.md).

## Follow-up

The next recommended milestone is **ACS-V2-IMP-02B — Agent Creation &
Configuration**. It must remain separate from this package and must not add
prompt, purpose, variable, or playground contracts without an architecture
decision.
