# EPIC-17-REQ-05 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R05-D01` | Connector definition, Connection, Credential and Channel are distinct. | `PROPOSED` |
| `E17-R05-D02` | Connector is an adapter/projection unless distinct reusable integration semantics are proven. | `PROPOSED` |
| `E17-R05-D03` | Existing Connection/secret/lease owners remain canonical; no duplicate store is created. | `PROPOSED` |
| `E17-R05-D04` | Agent and snapshots store authorized opaque references only. | `PROPOSED` |
| `E17-R05-D05` | Channel is a Tenant-scoped interaction endpoint, not provider, credential, Agent or executor. | `PROPOSED` |
| `E17-R05-D06` | Channel ingress always passes policy, activation and admission boundaries. | `PROPOSED` |
| `E17-R05-D07` | Existence/reachability/availability does not grant authority. | `PROPOSED` |
| `E17-R05-D08` | Health observations remain Evidence and do not rewrite configuration history. | `PROPOSED` |
| `E17-R05-D09` | REQ-05 and REQ-06 remain independent inputs to delegation. | `PROPOSED` |

Acceptance does not authorize implementation and does not make REQ-07 ready
until REQ-06 is also accepted.
