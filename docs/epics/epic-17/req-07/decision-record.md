# EPIC-17-REQ-07 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R07-D01` | Delegation relates canonical Agent A to canonical Agent B; no `SubAgent` identity exists. | `PROPOSED` |
| `E17-R07-D02` | Governance owns authority; Delegation records a governed, attenuated authorization relationship and never mints authority. | `PROPOSED` |
| `E17-R07-D03` | Logical grant semantics are required, while entity/relation/policy/aggregate representation remains deferred. | `PROPOSED` |
| `E17-R07-D04` | Effective delegated authority is the intersection of delegator authority, grant, policy, scope, time and all Agent/Workforce/operation constraints. | `PROPOSED` |
| `E17-R07-D05` | Agent B cannot union delegated authority with unrelated authority or references; each operation records one explicit authority basis. | `PROPOSED` |
| `E17-R07-D06` | References, membership, availability and bindings never become authority grants. | `PROPOSED` |
| `E17-R07-D07` | Credential use delegates only an action, opaque reference and purpose; raw credential and lease values never transfer. | `PROPOSED` |
| `E17-R07-D08` | Memory use delegates only bounded scope, operations and policy; raw Memory never transfers. | `PROPOSED` |
| `E17-R07-D09` | Onward delegation is opt-in, attenuation-only and depth-bounded; absent depth policy means no onward delegation. | `PROPOSED` |
| `E17-R07-D10` | Repeated canonical Agent identity and self-delegation are rejected as cycles/invalid authority paths. | `PROPOSED` |
| `E17-R07-D11` | Expiry/revocation blocks new admission and applicable retries; active work uses explicit existing cancellation/reconciliation policy without snapshot mutation. | `PROPOSED` |
| `E17-R07-D12` | Grant chains and effective authority are historically reconstructable through exact refs/digests, decisions, events and Evidence. | `PROPOSED` |
| `E17-R07-D13` | Delegation authorizes a request only; Workforce membership, coordination, Assignment and Runtime remain authoritative for execution. | `PROPOSED` |
| `E17-R07-D14` | Cross-Tenant delegation fails closed because no accepted cross-Tenant authority contract exists. | `PROPOSED` |
| `E17-R07-D15` | Legacy `canSpawnSubAgents`, `subAgentScope` and related permissions are non-authoritative compatibility metadata. | `PROPOSED` |
| `E17-R07-D16` | Any incompatible Workforce, membership, admission, Assignment, Run, Task or Attempt requirement becomes a blocker and architecture escalation. | `PROPOSED` |

Rejected: `SubAgent`, nested Agent identity, delegation in Agent revisions,
grant-by-reference, permission union, implicit onward delegation, unbounded
depth, cycle tolerance, raw secret/Memory transfer, Assignment-as-grant,
Workforce membership-as-grant and silent active-snapshot mutation.

Acceptance authorizes REQ-08 documentation only. It authorizes no IMP,
migration, schema, API, database, runtime or production change.
