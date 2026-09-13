# REQ-01 Proposed Contract Deltas and ADRs

**Authority:** proposals for later acceptance and implementation planning only

## 1. Proposed contract deltas

| ID | Gap | Proposed normative delta | Boundary preserved |
| --- | --- | --- | --- |
| `E17-R01-CD01` | Native reads and legacy writes coexist in Product API | Define one canonical Agent command adapter over `AsyncNativeCoreRepository`; unsupported Native mutations fail explicitly until implemented. | Product API remains application boundary; Native Core remains domain/persistence owner. |
| `E17-R01-CD02` | Current Native projection is structurally lossy | Version and name the projection; declare omitted fields, source revision/fingerprint and read-only capability. | Projection cannot become canonical or bidirectional by implication. |
| `E17-R01-CD03` | `name`, `status` and `sharing_mode` are current-head fields outside the revision fingerprint | Define one additive historical representation under the Agent aggregate so head/lifecycle interpretation is reconstructable. | No second lifecycle database or revision authority. |
| `E17-R01-CD04` | Native lineage read catches can become application not-found | Preserve typed not-found, scope-denied and lineage-integrity outcomes through the supported boundary. | Integrity failures remain fail-closed. |
| `E17-R01-CD05` | Legacy lifecycle includes physical remove | Explicitly exclude Native physical delete from ordinary Agent lifecycle; require a separate legal-erasure/retention decision. | Immutable history and admitted revision references survive. |
| `E17-R01-CD06` | Legacy operational services accept `AgentDefinition`/integer revision | Require exact Native `AgentRevisionRef` at canonical deployment, readiness, Workforce and execution seams. | Historical execution binds identity, revision and fingerprint. |

REQ-01 does not select field names, endpoint payloads, table changes or a
migration. Those details require accepted downstream contracts and separate IMP
authority.

## 2. Candidate ADRs

### ADR-17-001 — Canonical Agent contract and compatibility ownership

- **Decision candidate:** accept Native Agent contracts and shared PostgreSQL
  Native lineage as the sole canonical owner; classify legacy Agent models as
  compatibility surfaces.
- **Alternative rejected:** retain Native and legacy as equal write authorities.
- **Reason:** equal authority creates split identity, inconsistent reads/writes,
  non-atomic history and ambiguous execution references.

### ADR-17-002 — Agent head/lifecycle historical representation

- **Decision candidate:** keep lifecycle/head state under the same Agent
  aggregate and canonical event/lineage authority, with an additive
  reconstructable representation.
- **Alternatives rejected:** mutable shadow lifecycle state, a second revision
  stream or a lifecycle service that can change Agent truth independently.
- **Open representation choice:** embed revisioned head state in a future Agent
  revision contract or preserve it through a typed canonical head event/snapshot
  tied to the same monotonic commit. The selected form must not weaken current
  fingerprint and lineage guarantees.

### ADR-17-003 — Legacy migration and deprecation policy

- **Decision candidate:** use explicit, versioned, provenance-bearing mapping;
  prohibit dual write and destructive conversion.
- **Alternative rejected:** relabel existing JSON payloads as `native_v2`.
- **Reason:** legacy fields are structurally incomplete and not semantically
  equivalent to Native references.

## 3. Implementation blockers

| ID | Blocker | Resolution gate |
| --- | --- | --- |
| `E17-R01-B01` | Canonical Native Agent mutation is not exposed through the current Product API client; writes still use `AgentService`. | Accept `CD01`, define command/API/error contract and prove one-owner mutation tests. |
| `E17-R01-B02` | Head/lifecycle fields are not part of the current Agent revision fingerprint/history payload. | Accept ADR-17-002 and prove deterministic historical reconstruction. |
| `E17-R01-B03` | Deployment/readiness/composition paths still consume legacy Agent structures. | Inventory all callers and adapt them to exact Native revision references without changing runtime ownership. |

These blockers stop an Agent-seam IMP. They do not block REQ-01 acceptance or
authorize changes.

## 4. Escalation result

No CEO escalation is required. No NFT, Genome economics, ownership transfer,
provider authority or organizational-policy decision enters REQ-01.
