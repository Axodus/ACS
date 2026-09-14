# REQ-06 Contract Deltas, ADRs and Blockers

## Candidate contract deltas

1. `E17-R06-CD01`: versioned Memory policy contract under canonical Governance
   policy authority.
2. `E17-R06-CD02`: provider-independent Memory record/reference with Tenant,
   scope, subject, provenance, sensitivity and lifecycle metadata.
3. `E17-R06-CD03`: policy decision contract for read/search/write/correct/
   forget/export actions and attenuation trace.
4. `E17-R06-CD04`: Working, Agent, Workforce and user/context scope
   discriminators referencing canonical owners.
5. `E17-R06-CD05`: retrieval/write result reference and digest for the REQ-03
   execution snapshot/Evidence seam.
6. `E17-R06-CD06`: retention, expiry, legal-hold, consent withdrawal,
   tombstone and content-free deletion Evidence contract.
7. `E17-R06-CD07`: Knowledge source/index observation adapter that preserves
   source ownership and provenance.
8. `E17-R06-CD08`: Product API projection requirements reserved for REQ-10.

These deltas are candidates only. They do not select an aggregate shape,
service, database, table, index engine, vector store, endpoint or UI.

## Candidate ADRs

- `ADR-17-020`: Memory policy and store ownership.
- `ADR-17-021`: Memory scopes and canonical companion references.
- `ADR-17-022`: Memory versus runtime state, Knowledge and Evidence.
- `ADR-17-023`: retention, deletion, consent and historical reconstruction.
- `ADR-17-024`: provider-independent retrieval and indexing adapters.

## Blockers

| ID | Finding | Consequence |
| --- | --- | --- |
| `E17-R06-B01` | `memory_policy_ref` has no implemented resolvable policy contract/history under Governance authority | Future admission must fail closed when Memory is required until contract/history exist |
| `E17-R06-B02` | No canonical Memory record/store contract exists | No persistence, API or provider implementation can be planned as canonical |
| `E17-R06-B03` | User/subject identity, consent and privacy-deletion decision contract is insufficiently unified | User/context Memory remains implementation-blocked |
| `E17-R06-B04` | Content deletion and historically reproducible execution can conflict | Future IMP must prove content-free evidence/tombstone behavior and policy precedence |
| `E17-R06-B05` | Workforce has no Memory field by design | Shared Memory requires a companion reference/access contract; incompatible Workforce change escalates architecture |
| `E17-R06-B06` | REQ-03 snapshot is not yet a typed implemented contract | Memory resolution and result references cannot be wired to Runtime before snapshot IMP planning |

The blockers do not prevent REQ-06 architectural closure. They block future
implementation until REQ-12 assigns accepted contract work and validation.

## IMP-03B implementation reconciliation

**Status:** `COMPLETE / CTO ACCEPTED / PUBLISHED`.

| Item | Slice disposition | Remaining boundary |
| --- | --- | --- |
| `E17-R06-B01` | `RESOLVED FOR IMP-03B` — Governance-owned Policy head and immutable revisions are durable and reconstructible. | None for the Memory domain. |
| `E17-R06-B02` | `RESOLVED FOR IMP-03B` — Memory Domain owns encrypted content-bearing records, successors and tombstones. | No second owner is permitted. |
| `E17-R06-B03` | `OPEN / DEFERRED` — User Context Memory remains absent. | Explicit human identity, consent and privacy owner. |
| `E17-R06-B04` | `RESOLVED FOR ACTIVE_STORE_DELETED` — exact Policy decision, tombstone, active-content removal, rollback and retrieval denial are proven. | `CRYPTOGRAPHIC_ERASURE` and `BACKUP_ERASURE` remain unclaimed infrastructure capabilities. |
| `E17-R06-B05` | `RESOLVED FOR IMP-03B` — Workforce Shared Memory uses exact companion references and governed access without a Workforce-owned store. | Workforce model remains unchanged. |
| `E17-R06-B06` | `RESOLVED FOR IMP-03B` — typed exact Policy and Memory Record/result references are available to the governed Memory boundary. | Runtime injection/admission remains a later boundary. |
| `E17-R06-CD01`–`CD07` | `IMPLEMENTED` across Slices 1–4. | No Runtime or RAG expansion. |
| `E17-R06-CD08` | `IMPLEMENTED` in Slice 5 as safe, Tenant-scoped Product API projection. | Product API remains a projection, not a Memory owner. |
| `ADR-17-020`–`ADR-17-024` | `DECIDED / IMPLEMENTED` within the accepted Memory boundary. | Production KMS/Transit validation remains a production-readiness dependency. |
