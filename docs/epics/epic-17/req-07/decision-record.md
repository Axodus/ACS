# EPIC-17-REQ-07 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `5dc66772e07ec3a6d00170ac622ff590301672cc`
**Implementation authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R07-D01` | Delegation relates canonical Agent A to canonical Agent B; no `SubAgent` identity exists. | `CTO ACCEPTED` |
| `E17-R07-D02` | Governance owns authority; Delegation records a governed, attenuated authorization relationship and never mints authority. | `CTO ACCEPTED` |
| `E17-R07-D03` | Logical grant semantics are required, while entity/relation/policy/aggregate representation remains deferred. | `CTO ACCEPTED` |
| `E17-R07-D04` | Effective delegated authority is the intersection of delegator authority, grant, policy, scope, time and all Agent/Workforce/operation constraints. | `CTO ACCEPTED` |
| `E17-R07-D05` | Agent B cannot union delegated authority with unrelated authority or references; each operation records one explicit authority basis. | `CTO ACCEPTED` |
| `E17-R07-D06` | References, membership, availability and bindings never become authority grants. | `CTO ACCEPTED` |
| `E17-R07-D07` | Credential use delegates only an action, opaque reference and purpose; raw credential and lease values never transfer. | `CTO ACCEPTED` |
| `E17-R07-D08` | Memory use delegates only bounded scope, operations and policy; raw Memory never transfers. | `CTO ACCEPTED` |
| `E17-R07-D09` | Onward delegation is opt-in, attenuation-only and depth-bounded; absent depth policy means no onward delegation. | `CTO ACCEPTED` |
| `E17-R07-D10` | Repeated canonical Agent identity and self-delegation are rejected as cycles/invalid authority paths. | `CTO ACCEPTED` |
| `E17-R07-D11` | Expiry/revocation blocks new admission and applicable retries; active work uses explicit existing cancellation/reconciliation policy without snapshot mutation. | `CTO ACCEPTED` |
| `E17-R07-D12` | Grant chains and effective authority are historically reconstructable through exact refs/digests, decisions, events and Evidence. | `CTO ACCEPTED` |
| `E17-R07-D13` | Delegation authorizes a request only; Workforce membership, coordination, Assignment and Runtime remain authoritative for execution. | `CTO ACCEPTED` |
| `E17-R07-D14` | Cross-Tenant delegation fails closed because no accepted cross-Tenant authority contract exists. | `CTO ACCEPTED` |
| `E17-R07-D15` | Legacy `canSpawnSubAgents`, `subAgentScope` and related permissions are non-authoritative compatibility metadata. | `CTO ACCEPTED` |
| `E17-R07-D16` | Any incompatible Workforce, membership, admission, Assignment, Run, Task or Attempt requirement becomes a blocker and architecture escalation. | `CTO ACCEPTED` |

Rejected: `SubAgent`, nested Agent identity, delegation in Agent revisions,
grant-by-reference, permission union, implicit onward delegation, unbounded
depth, cycle tolerance, raw secret/Memory transfer, Assignment-as-grant,
Workforce membership-as-grant and silent active-snapshot mutation.

CTO acceptance authorizes REQ-08 documentation only. It authorizes no IMP,
migration, schema, API, database, runtime or production change.
