# EPIC-17-REQ-06 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R06-D01` | Memory is a missing companion domain and never part of canonical Agent, Workforce or Run identity. | `PROPOSED` |
| `E17-R06-D02` | Governance policy authority owns Memory policy semantics; the existing Agent `memory_policy_ref` remains an exact revision reference to its future additive contract. | `PROPOSED` |
| `E17-R06-D03` | Governance owns Memory policy; the Memory companion domain owns records and store semantics. These concerns may not be assumed to share an aggregate. | `PROPOSED` |
| `E17-R06-D04` | Working Memory is Run/Task-scoped context and cannot replace runtime state or checkpoints. | `PROPOSED` |
| `E17-R06-D05` | Agent Memory references canonical `agent_id`; it creates no Agent aggregate field or revision stream. | `PROPOSED` |
| `E17-R06-D06` | Workforce Shared Memory is companion state constrained by exact Workforce revision, admitted membership and Run; Workforce Core remains unchanged. | `PROPOSED` |
| `E17-R06-D07` | User/context Memory requires Tenant, subject, purpose, consent/privacy and deletion authority. | `PROPOSED` |
| `E17-R06-D08` | Knowledge remains source truth; Memory retrieval/index state is derived and provenance-bearing. | `PROPOSED` |
| `E17-R06-D09` | Historical/episodic Memory cannot alias or replace events and Evidence. | `PROPOSED` |
| `E17-R06-D10` | Every read/write is policy-evaluated and attenuation-only; possession, membership or resource availability grants nothing. | `PROPOSED` |
| `E17-R06-D11` | Run snapshots freeze policies, decisions and immutable result refs/digests, excluding raw Memory content. | `PROPOSED` |
| `E17-R06-D12` | Storage, embedding, indexing and retrieval providers are replaceable adapters; persistence technology remains undecided. | `PROPOSED` |
| `E17-R06-D13` | Retention/deletion may make content unavailable while preserving content-free proof; reconstruction cannot override deletion authority. | `PROPOSED` |

Rejected: Memory inside Agent/Workforce revisions, Memory as checkpoint, current
Memory lookup as historical reconstruction, raw content in the configuration
snapshot, provider-owned identity, implicit member access, Knowledge replacement
and Evidence/history aliasing.

Acceptance keeps REQ-07 blocked until REQ-05 is also accepted. It authorizes no
IMP, schema, migration, API, UI, database or provider change.
