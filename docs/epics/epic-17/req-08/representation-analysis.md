# REQ-08 Representation Analysis

| Candidate | Disposition | Reason |
| --- | --- | --- |
| Field/list inside `AgentRevisionV2` | `REJECT` | Automation has Tenant lifecycle, target and history independent from Agent behavior and may target other canonical domains |
| Workflow definition | `REJECT` | Workflow owns coordination structure; Automation configures possible future activation of a target |
| Run, Task or `RuntimeExecutionIntentV2` | `REJECT` | These represent admitted/per-execution work, not durable configured intention |
| Trigger or Schedule record | `REJECT` | Activation sources may reference Automation but cannot own its configuration identity |
| Provider/executor job | `REJECT` | External handles are replaceable observations and cannot own ACS configuration truth |
| Product API/Control Plane object | `REJECT` as owner | These surfaces project accepted contracts only |
| Stable governed identity plus immutable revision semantics | `REQUIRED` | Lifecycle, references and historical reconstruction require one subject and immutable authored state |
| Governed definition/relation representation | `NEW` candidate | Could satisfy the logical identity/revision contract within shared authority patterns |
| Separate aggregate/repository | `UNPROVEN` | Requires evidence that lifecycle, CAS/history, query and transaction needs cannot be met by a bounded governed representation |

REQ-08 proves logical identity and revision requirements. It does not prove a
new service, aggregate, table, database or independent persistence authority.
Those choices remain for REQ-12 and a separately authorized IMP plan.
