# Acceptance Report

## Status

`PARTIAL / DOMAIN ENTRY ACCEPTED / DOMAIN NAVIGATION INCOMPLETE`

## Proven read-domain criteria

- Workforce is a first-class global application domain.
- The implementation separates collection and entity navigation: `All Workforces` is collection-scoped, while a selected Workforce can expose Overview, Members, Revisions, Runs, and Operations.
- The sidebar implementation marks only the current entity-local section as active.
- Direct list, detail, member, revision, Runs, and Operations routes are registered.
- List/detail loading, empty, error, retry, filtering, and sorting are implemented.
- Member slots, pinned revisions, admission-time resolution, and governed role revision references are explicit.
- Historical revisions are direct-addressable and read-only.
- Admitted Run membership, coordination lineage, assignment history, runtime attempts, revision references, slot, generation, and recovery are available when explicit Run and Task IDs are supplied.
- Product API remains the sole data boundary.

## Blocked criteria

- Workforce create, revision creation, and lifecycle writes are blocked by missing Product API writes.
- Workforce-scoped Run list is blocked by missing Product API query support.
- On September 12, 2026, the local API returned HTTP 404 `route not found` for `GET /api/v1/workforces`. The running process had neither `ACS_STATE_BACKEND=shared` nor `ACS_SH_DATABASE_URL` configured, so it did not create the `nativeCore` required to register Workforce routes. No real Workforce can be selected in the app; visible entity navigation and display-name resolution are therefore not accepted.
- PostgreSQL-required acceptance remains blocked in this environment: the root suite has 11 skips because `ACS_SH_DATABASE_URL` is not configured.

No backend contract was expanded. These gaps require a scoped Product API proposal and CTO decision before the milestone can become `COMPLETE`.
