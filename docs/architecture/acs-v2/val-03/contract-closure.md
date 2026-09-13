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
| Application | ACCEPTED for IMP-03F: canonical Agent discovery, creation flow, contextual navigation, revisions, lifecycle, Runs, and Operations |
| Tenant, authority, and secret boundary | PASS through VAL-03 plus accepted focused coverage |
| Provider, Eigent, and CAMEL neutrality | PASS |
| Migration and persistence topology | PASS: no change required |

The former Application creation mismatch was resolved by `ACS-BLOCKER-020` and
accepted together with `ACS-V2-IMP-03F-FIX-03`. VAL-03 remains an independent
transversal gate; this matrix records the reconciled evidence and does not by
itself declare the full Workforce v1 contract formally closed.
