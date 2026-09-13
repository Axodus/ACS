# EPIC-17-REQ-05 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `fdd0c6446491e0d367652ffd3dd081afccf0a448`
**Implementation authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R05-D01` | Connector definition, Connection, Credential and Channel are distinct. | `CTO ACCEPTED` |
| `E17-R05-D02` | Connector is an adapter/projection unless distinct reusable integration semantics are proven. | `CTO ACCEPTED` |
| `E17-R05-D03` | Existing Connection/secret/lease owners remain canonical; no duplicate store is created. | `CTO ACCEPTED` |
| `E17-R05-D04` | Agent and snapshots store authorized opaque references only. | `CTO ACCEPTED` |
| `E17-R05-D05` | Channel is a Tenant-scoped interaction endpoint, not provider, credential, Agent or executor. | `CTO ACCEPTED` |
| `E17-R05-D06` | Channel ingress always passes policy, activation and admission boundaries. | `CTO ACCEPTED` |
| `E17-R05-D07` | Existence/reachability/availability does not grant authority. | `CTO ACCEPTED` |
| `E17-R05-D08` | Health observations remain Evidence and do not rewrite configuration history. | `CTO ACCEPTED` |
| `E17-R05-D09` | REQ-05 and REQ-06 remain independent inputs to delegation. | `CTO ACCEPTED` |

Acceptance authorizes REQ-07 documentation because REQ-06 is also accepted. It
does not authorize implementation.
