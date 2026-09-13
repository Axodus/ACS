# EPIC-17-REQ-04 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R04-D01` | Agents reference governed resources by exact identity/revision and never own registries. | `PROPOSED` |
| `E17-R04-D02` | Role is the only resource class with currently proven durable fingerprinted history. | `PROPOSED` |
| `E17-R04-D03` | Resource kinds retain distinct semantics; no universal Resource aggregate is presumed. | `PROPOSED` |
| `E17-R04-D04` | Capability definition, requirement, support Evidence and authority grant are distinct. | `PROPOSED` |
| `E17-R04-D05` | Skill is reusable authored/materialized knowledge; Tool is invocable functionality under policy; neither is Profile. | `PROPOSED` |
| `E17-R04-D06` | Tool availability or binding does not grant invocation permission. | `PROPOSED` |
| `E17-R04-D07` | MCP server definition is a governed resource gap; endpoint/connection/credential semantics remain for REQ-05. | `PROPOSED` |
| `E17-R04-D08` | MCP endpoint or tool inventory cannot become provider identity. | `PROPOSED` |
| `E17-R04-D09` | Existing provider/model registries remain canonical owners; model identity is provider-neutral `providerId/modelId`. | `PROPOSED` |
| `E17-R04-D10` | Dynamic provider/model availability is observed Evidence, not immutable resource revision truth. | `PROPOSED` |
| `E17-R04-D11` | Legacy `GovernedProfileResource` is a capability-requirement preset candidate, never Agent Profile or grant. | `PROPOSED` |
| `E17-R04-D12` | REQ-03 snapshots require exact resource refs or verified immutable catalog observations. | `PROPOSED` |

Rejected: unversioned canonical bindings, silent latest substitution, Agent-owned
catalog copies, Profile capability grants, Tool-as-permission, MCP-as-provider,
provider-specific Agent identity and a presumed universal Resource aggregate.

Acceptance makes both REQ-05 and REQ-06 ready for independent documentation
execution. It authorizes no IMP, schema, migration, API, UI or database change.
