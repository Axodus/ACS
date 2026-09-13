# EPIC-17-REQ-06 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `5f8fcf0f55c139f0bcb0c9d375f027329f481273`
**Implementation authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R06-D01` | Memory is a missing companion domain and never part of canonical Agent, Workforce or Run identity. | `CTO ACCEPTED` |
| `E17-R06-D02` | Governance policy authority owns Memory policy semantics; the existing Agent `memory_policy_ref` remains an exact revision reference to its future additive contract. | `CTO ACCEPTED` |
| `E17-R06-D03` | Governance owns Memory policy; the Memory companion domain owns records and store semantics. These concerns may not be assumed to share an aggregate. | `CTO ACCEPTED` |
| `E17-R06-D04` | Working Memory is Run/Task-scoped context and cannot replace runtime state or checkpoints. | `CTO ACCEPTED` |
| `E17-R06-D05` | Agent Memory references canonical `agent_id`; it creates no Agent aggregate field or revision stream. | `CTO ACCEPTED` |
| `E17-R06-D06` | Workforce Shared Memory is companion state constrained by exact Workforce revision, admitted membership and Run; Workforce Core remains unchanged. | `CTO ACCEPTED` |
| `E17-R06-D07` | User/context Memory requires Tenant, subject, purpose, consent/privacy and deletion authority. | `CTO ACCEPTED` |
| `E17-R06-D08` | Knowledge remains source truth; Memory retrieval/index state is derived and provenance-bearing. | `CTO ACCEPTED` |
| `E17-R06-D09` | Historical/episodic Memory cannot alias or replace events and Evidence. | `CTO ACCEPTED` |
| `E17-R06-D10` | Every read/write is policy-evaluated and attenuation-only; possession, membership or resource availability grants nothing. | `CTO ACCEPTED` |
| `E17-R06-D11` | Run snapshots freeze policies, decisions and immutable result refs/digests, excluding raw Memory content. | `CTO ACCEPTED` |
| `E17-R06-D12` | Storage, embedding, indexing and retrieval providers are replaceable adapters; persistence technology remains undecided. | `CTO ACCEPTED` |
| `E17-R06-D13` | Retention/deletion may make content unavailable while preserving content-free proof; reconstruction cannot override deletion authority. | `CTO ACCEPTED` |

Rejected: Memory inside Agent/Workforce revisions, Memory as checkpoint, current
Memory lookup as historical reconstruction, raw content in the configuration
snapshot, provider-owned identity, implicit member access, Knowledge replacement
and Evidence/history aliasing.

Acceptance authorizes REQ-07 documentation because REQ-05 is also accepted. It
authorizes no IMP, schema, migration, API, UI, database or provider change.
