# VAL-03 pre-validation coverage map

| Contract | Existing evidence | Layer | PostgreSQL | HTTP | Browser | VAL-03 result |
| --- | --- | --- | --- | --- | --- | --- |
| Workforce identity, immutable lineage, CAS, lifecycle | IMP-03A, IMP-03E2 | Core / Product API | yes | yes | yes | PASS through r5 |
| Slot identity and Agent resolution | IMP-03A, IMP-03B | Core | yes | read | indirect | PASS with two Agent A slots |
| Creation, revision, lifecycle, scoped Runs | IMP-03E2, IMP-03F-FIX-02 | Product API | yes | yes | yes | PASS |
| Proposal, Decision, assignment history | IMP-03C, IMP-03E | Core / Product API | yes | yes | operations UI | PASS through generation 2 |
| Runtime intent, Attempt, stale assignment, recovery | IMP-03D | Core / Product API | yes | yes | operations UI | PASS |
| Recomposition and historical projections | IMP-03D, IMP-03E Gate A | Core / HTTP | yes | yes | reload | PASS |
| Workforce Application | IMP-03F | Application | shared host | API-backed | integrated and static | PARTIAL: Agent selector omits canonical Native Core Agents |

VAL-03 adds one transversal scenario and reuses lower-level evidence rather than duplicating each unit assertion.
