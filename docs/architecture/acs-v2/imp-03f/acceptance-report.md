# Acceptance Report

## Status

`PARTIAL / DOMAIN ENTRY ACCEPTED / CONTEXTUAL NAVIGATION ACCEPTED IN CODE / FIRST WORKFORCE CREATION ACCEPTED`

## Proven criteria

- Workforce is a first-class global application domain.
- The implementation separates collection and entity navigation: `All Workforces` is collection-scoped, while a selected Workforce can expose Overview, Members, Revisions, Runs, and Operations.
- The sidebar implementation marks only the current entity-local section as active.
- Direct list, detail, member, revision, Runs, and Operations routes are registered.
- List/detail loading, empty, error, retry, filtering, and sorting are implemented.
- Member slots, pinned revisions, admission-time resolution, and governed role revision references are explicit.
- Historical revisions are direct-addressable and read-only.
- Admitted Run membership, coordination lineage, assignment history, runtime attempts, revision references, slot, generation, and recovery are available when explicit Run and Task IDs are supplied.
- Product API remains the sole data boundary.
- `POST /api/v1/workforces` creates the initial canonical draft `r1` through the native lineage repository, with tenant governance, idempotency, event, and outbox inputs.
- The collection page and its empty state expose Create Workforce; successful creation navigates to the canonical Workforce detail route.
- On September 12, 2026, a canonical shared-state HTTP host against PostgreSQL proved first-Workforce creation, same-key idempotent retry, durable collection readback, and direct-detail readback after a control-plane restart. The repository suite completed with 726 passes, 0 failures, and 0 skips.

## Remaining criteria

- Later Workforce revision creation and lifecycle writes remain outside FIX-02 and require their own Product API mutations.
- Workforce-scoped Run list remains blocked by missing Product API query support.
- The existing standalone browser process on port 3000 is still configured for the separate host on port 8788, whose current process does not register Workforce routes. That process is not the canonical host used for the PostgreSQL acceptance above. A browser run against the canonical host remains useful UI evidence, but it does not invalidate the completed FIX-02 host/API persistence acceptance.

`ACS-V2-IMP-03F-FIX-02` is accepted for initial Workforce creation. `ACS-V2-IMP-03F` remains partial until the material revision/lifecycle and Workforce-scoped Run write/query gaps are resolved.
