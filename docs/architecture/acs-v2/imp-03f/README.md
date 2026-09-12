# ACS-V2-IMP-03F — Workforce Application Domain & Experience

## Status

`PARTIAL / DOMAIN ENTRY ACCEPTED / DOMAIN NAVIGATION INCOMPLETE`

The Workforce domain is implemented in the standalone ACS Control Plane application. It presents Workforces as a peer application domain and consumes the Product API read surface plus the authorized initial-creation route.

`ACS-V2-IMP-03F-FIX-02` adds `POST /api/v1/workforces` for initial canonical draft creation only. Later revision writes, lifecycle writes, and Workforce-scoped Run discovery remain unavailable because no corresponding Product API route exists. The application deliberately does not synthesize these capabilities.

`ACS-V2-IMP-03F-FIX-01` adds the entity-local navigation implementation. `All Workforces` remains a collection-level link; a selected Workforce can expose `Overview`, `Members`, `Revisions`, `Runs`, and `Operations` in the sidebar and the entity context strip. The local environment does not currently return a Workforce collection, so a real selection and its visible navigation cannot be accepted yet.

## Scope delivered

- global Workforces navigation and direct routes;
- list, loading, empty, error, retry, filtering, sorting, and Create Workforce states;
- canonical initial Workforce creation with one eligible Agent member and draft revision `r1`;
- current definition, member slots, immutable revision history, and direct historical revision routes;
- Run/task investigation using explicit admitted snapshot, coordination, assignment, and attempt projections;
- no client-side canonical inference or orchestration.

See the companion documents for the implemented boundary and validation evidence.
