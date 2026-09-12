# Contract closure matrix

| Contract | Status |
| --- | --- |
| Workforce identity | PASS |
| Immutable revisions | PASS through r3 |
| Expected-head CAS | PASS |
| Member slot identity | PASS |
| Pinned Agent revision | PASS at Run A admission |
| `current_head_at_admission` | PASS at Run A admission |
| Governed role history | reused accepted IMP-03A coverage |
| Lifecycle | PASS through draft → active |
| Run admission | PASS for active; draft rejection semantics PASS |
| Immutable Run membership | PASS at Run A admission |
| Coordination proposal | PASS |
| Canonical decision | PASS |
| Assignment | PASS generation 1 |
| Reassignment history | BLOCKED before execution |
| Runtime compilation | FAIL — VAL-03-DEFECT-001 |
| Attempt historical binding | BLOCKED |
| Lease/fencing independence | reused accepted IMP-03D coverage; not re-proven transitively |
| Recovery | BLOCKED |
| Events/outbox | FAIL for integrated runtime event stream |
| Idempotency | PASS for initial Workforce creation |
| Product API | PASS for reached Workforce surfaces; runtime chain blocked |
| Application | static and local creation UI PASS; integrated runtime chain blocked |
| Provider neutrality | PASS by static boundary audit and accepted suites |
| Tenant boundary | reused accepted focused coverage |

No `?` is used: each unclosed item is explicitly `BLOCKED` or `FAIL`.

## Required remediation decision

CTO review is required for a bounded implementation remediation. The failure is in `compileTaskExecution`: it asks `nextEventSequence` for `run:<runId>` while the event it emits includes `agent_id`; `streamScope` prioritizes `agent_id`, so `appendEvent` validates the event against `agent:<agentId>`. The compiler must use one canonical stream identity consistently. VAL-03 does not select the repair.
