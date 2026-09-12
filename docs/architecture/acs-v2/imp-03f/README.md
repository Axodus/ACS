# ACS-V2-IMP-03F — Workforce Application Domain & Experience

## Status

`PARTIAL`

The Workforce read domain is implemented in the standalone ACS Control Plane application. It consumes only the accepted IMP-03E Product API reads and presents Workforces as a peer application domain.

Creation, revision writes, lifecycle writes, and Workforce-scoped Run discovery remain unavailable because no corresponding accepted Product API write or query route exists. The application deliberately does not synthesize these capabilities.

## Scope delivered

- global Workforces navigation and direct routes;
- list, loading, empty, error, retry, filtering, and sorting states;
- current definition, member slots, immutable revision history, and direct historical revision routes;
- Run/task investigation using explicit admitted snapshot, coordination, assignment, and attempt projections;
- no client-side canonical inference or orchestration.

See the companion documents for the implemented boundary and validation evidence.
