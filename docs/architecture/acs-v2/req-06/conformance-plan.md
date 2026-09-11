# Workforce v1 Conformance Plan

No test is added by this documentation-only REQ. These tests are mandatory for
future implementation.

| Area | Conformance test |
| --- | --- |
| Identity | ACS creates opaque Workforce id; provider, executor, Worker, CAMEL node, and Eigent ids cannot substitute it. |
| Revision | Revision 1 is root; successor fingerprints/predecessors are correct; history cannot change. |
| Head selection | Direct historical-head rewind is rejected; reproducing a prior composition creates an authorized successor with new revision/fingerprint. |
| Membership | Duplicate slot ids, absent members, unauthorized scope, and invalid selectors are rejected; same Agent in two slots is deterministic. |
| Roles | Role ref is immutable; stale/unknown role behavior is explicit; role grants no authority itself. |
| Agent lifecycle | Archived/disabled Agents cannot receive prohibited new admission; historical refs remain readable. |
| Selector resolution | Pinned revision validates exactly; current-head resolves once; later Agent head change does not change Run membership. |
| CAS | Competing revisions from the same expected head yield one success and one conflict. |
| Run binding | Workforce revision and all membership snapshots write atomically; duplicate command is idempotent. |
| Admission head | A new operational Run binds only the active current Workforce head; an authorized replay/reconstruction records its historical-revision authority and cannot alter the head. |
| Reproducibility | Historical roster, roles, Agent revisions, Task/Attempt/evidence reconstruct after head changes and archive. |
| Events/outbox | Revision and Run binding atomically write event/outbox/idempotency records. |
| Evidence | Participation, assignment, reassignment, and source completeness link to correct refs. |
| Cost | Usage and Cost aggregate through Workforce revision, Run, and Task without fabricating unavailable provider cost. After the separately reviewed additive Attempt reference or bridge exists, retries aggregate by immutable Attempt without double counting. |
| Assignment | Task uses only eligible admitted slot; reassignment appends an authority/policy/rationale-bearing decision without rewriting old attempt or Task lifecycle. |
| Recovery outside snapshot | Replacement with an Agent revision or member outside the admitted snapshot is rejected until a separately frozen Run-membership amendment contract exists. |
| Runtime fencing | Stale worker/executor result cannot commit after lease recovery or reassignment. |
| Adapter sovereignty | Fake adapter cannot write canonical stores or select unauthorized identity/binding. |
| Eigent/CAMEL absence | Definition, persistence, admission, reconstruction, event/evidence, and cost pass with no ~/.eigent and no CAMEL package. |
| Provider leakage | Workforce validation rejects provider/model/executor/credential/session/queue fields. |

## Validation stages

1. Pure native-contract serialization, fingerprint, and validation tests.
2. PostgreSQL transaction, CAS, idempotency, outbox, and recovery tests.
3. Runtime lease/fencing and duplicate-delivery integration tests.
4. Product API authorization and read-boundary tests.
5. Optional adapter tests using fake proposal sources only.
