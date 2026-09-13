# Contract closure matrix

| Contract | Status |
| --- | --- |
| Workforce identity and immutable revisions | PASS |
| Expected-head CAS and slot identity | PASS |
| Pinned and current-head-at-admission references | PASS |
| Governed role history | PASS through accepted IMP-03A coverage |
| Lifecycle and draft admission rejection | PASS |
| Immutable Run membership and historical lineage | PASS |
| Proposal / Decision distinction | PASS |
| Assignment and reassignment history | PASS |
| Runtime compilation and stale-assignment rejection | PASS |
| Attempt historical identity and recovery | PASS |
| Lease/fencing independence | PASS through accepted IMP-03D coverage |
| Events, outbox, and idempotency | PASS |
| PostgreSQL reload and process recomposition | PASS |
| Product API | PASS |
| Application | PARTIAL: current Create Workforce selector cannot select canonical Native Core Agents |
| Tenant, authority, and secret boundary | PASS through VAL-03 plus accepted focused coverage |
| Provider, Eigent, and CAMEL neutrality | PASS |
| Migration and persistence topology | PASS: no change required |

The Application creation path remains unresolved in the current worktree. Workforce v1 cannot be formally closed until CTO accepts a bounded remediation for VAL-03-DEFECT-003.
