# ACS-V2-IMP-02C — Agent Detail & Lifecycle

**Status:** COMPLETE — browser and host regression acceptance passed
**Date:** 2026-09-11
**Scope:** Agent Overview, Revisions, Advanced, and existing governed lifecycle commands in the standalone ACS frontend.

## Objective

Make Agent Overview the lifecycle-oriented starting point for an existing Agent. The primary hierarchy is identity, lifecycle state, current revision, readiness, and one safe next action. Technical composition is retained but moved to Advanced context.

## Implemented experience

Agent Overview
→ current lifecycle state
→ current immutable revision
→ readiness
→ next safe action
→ deployment and runtime context
→ recent revision lineage
→ governed lifecycle actions
→ Advanced technical context

Revisions explicitly distinguish the canonical CURRENT head from read-only HISTORICAL records and order newest revision first. The existing adopt and restore commands remain Product API operations that create a new revision; they do not mutate history.

## Boundaries preserved

- No backend, API, database, migration, dependency, provider, governance, or economic change.
- No Agent-scoped Runs, Evidence, or Usage and Cost aggregation.
- No revision comparison engine, historical revision editor, or synthetic activity timeline.
- Purpose, description, instructions, variables, and playground remain unsupported or deferred.
- Deployment and runtime are related context, not Agent lifecycle.

See the mapping, information architecture, revision behavior, traceability, and localhost evidence in the other files in this package.

## Validation checkpoint

Typecheck, lint, standalone focused tests, standalone build, relevant Agent HTTP and composition integration tests pass. The local Product API created the disposable Agent imp02c-api-20260911, saved a name change as r2, and returned r2 plus r1 through independent detail and revisions reads. The canonical host suite completed under the VAL-02B conditions with 692 total tests, 688 passed, 0 failed, and 4 documented PostgreSQL-gated skips.

Browser automation opened direct Overview, Configuration, Revisions, Validate, and Advanced routes at 127.0.0.1:3001. Overview and Revisions were actually reloaded and showed the canonical Agent r2 context after re-fetch. No blocking route or visible runtime error occurred.
