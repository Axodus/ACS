# VAL-03 pre-validation coverage map

| Contract | Existing evidence | Layer | PostgreSQL | HTTP | Browser | Transversal result |
| --- | --- | --- | --- | --- | --- | --- |
| Workforce identity, lineage, CAS, lifecycle | IMP-03A, IMP-03E2 | Core/Product API | yes | yes | indirect | exercised through r3 and active lifecycle |
| Immutable member slots and admission resolution | IMP-03A, IMP-03B | Core | yes | read | indirect | exercised through Run A setup |
| Product API creation/revision/lifecycle/Runs | IMP-03E2, IMP-03F-FIX-02 | HTTP | yes | yes | yes | creation through lifecycle/revision works |
| Proposal, decision, assignment lineage | IMP-03C, IMP-03E Gate A | Core/Product API | yes | read | indirect | exercised through proposal/decision setup |
| Runtime intent, Attempt, stale assignment | IMP-03D | Core/Product API | yes | read | indirect | blocked at first integrated compilation |
| Reload/recomposition and Product API projections | IMP-03D, IMP-03E Gate A, IMP-03E2 | Core/HTTP | yes | yes | indirect | blocked by runtime compilation |
| Workforce application | IMP-03F | Application | host fixture | API-backed | static matrix | local Create Workforce UI observed; full integrated chain blocked |

VAL-03 adds one cross-contract PostgreSQL scenario rather than duplicating lower-level assertions. Its fixture uses only temporary schemas and canonical Native Core/Product API operations.
