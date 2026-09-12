# ACS-V2-IMP-03F — Workforce Application Domain & Experience

## Status

`COMPLETE / ACCEPTED`

The standalone ACS Control Plane now presents Workforces as a peer application domain backed only by accepted Product API and Native Core semantics.

## Delivered experience

- global Workforces entry, collection navigation, and selected-Workforce local navigation;
- list, loading, error, retry, empty, filter, sort, and first-Workforce creation states;
- canonical draft `r1` creation and redirect to the selected Workforce;
- current definition, member slots, immutable history, and direct historical revision routing;
- a successor-revision form seeded from the current canonical head, submitted with expected-head CAS, canonical policy references, idempotency, and a change reason;
- canonical lifecycle transitions with only the accepted target states available for the current head;
- Workforce-scoped Runs that show the exact revision admitted for each Run and link to that historical revision;
- Run/task operations investigation using explicit admitted snapshot, coordination, assignment, and attempt projections.

The application retains URL state, form drafts, loading, errors, selection, and retry only. Product API and Native Core retain Workforce identity, revisions, lifecycle, admission, events, outbox, and historical Run semantics.

## Acceptance boundary

On September 12, 2026, the full repository suite passed with 731 tests, 0 failures, and 0 skips using the canonical PostgreSQL configuration. A standalone application instance was also inspected against a schema-isolated canonical host: collection, selected-Workforce navigation, revision preparation, lifecycle actions, and historical Workforce Runs rendered from Product API data.

See the companion documents for the endpoint boundary and validation evidence.
