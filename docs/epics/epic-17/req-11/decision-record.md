# EPIC-17-REQ-11 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `50459fb27e38daabd9ea0e7905c5761316719daa`
**Implementation authority:** none
**Migration authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R11-D01` | Genome is a bounded descriptive classification/reference layer over canonical ACS state. | `CTO ACCEPTED` |
| `E17-R11-D02` | Genome owns trait vocabulary meaning/version and assertion metadata only; it owns no subject fact, Evidence, authority, execution or economics. | `CTO ACCEPTED` |
| `E17-R11-D03` | Genome aggregate, repository, persistence, schema and service topology remain undecided and unauthorized. | `CTO ACCEPTED` |
| `E17-R11-D04` | Trait is distinct from capability, permission, credential, reputation, economic right and NFT. | `CTO ACCEPTED` |
| `E17-R11-D05` | A trait cannot grant authority, satisfy operational requirements, alter effective configuration or change runtime truth. | `CTO ACCEPTED` |
| `E17-R11-D06` | Trait definitions require qualified identity plus exact version/digest so changed meaning cannot silently reuse an old definition. | `CTO ACCEPTED` |
| `E17-R11-D07` | Trait assertions require exact typed subject/definition, value, origin, producer, time/window, provenance, visibility and correction/verification state. | `CTO ACCEPTED` |
| `E17-R11-D08` | Assertion storage as entity, relation, policy record, event projection or aggregate remains a future IMP/ADR decision. | `CTO ACCEPTED` |
| `E17-R11-D09` | Revision-specific Agent assertions anchor to `agent_id + revision + fingerprint`; current-head assertions remain explicitly mutable observations. | `CTO ACCEPTED` |
| `E17-R11-D10` | Assertions do not enter or mutate `AgentRevisionV2`, Agent identity, lifecycle or fingerprint. | `CTO ACCEPTED` |
| `E17-R11-D11` | Trait version compatibility requires an explicit source/target crosswalk with transformation/loss and provenance; silent latest resolution is rejected. | `CTO ACCEPTED` |
| `E17-R11-D12` | Trait compatibility is descriptive interpretation and cannot replace resource/configuration/admission compatibility. | `CTO ACCEPTED` |
| `E17-R11-D13` | Evidence and Source references are adapted for provenance; Evidence remains append-only proof owner. | `CTO ACCEPTED` |
| `E17-R11-D14` | Governance owns verification/publication policy and verifier authority; Genome stores/projects their exact references only. | `CTO ACCEPTED` |
| `E17-R11-D15` | Profile projects policy-visible trait assertions but retains no identity, aggregate or independent revision stream. | `CTO ACCEPTED` |
| `E17-R11-D16` | Agent-owned presentation state owns asset binding/role; storage owns bytes/integrity/retention; Product API/Profile project the result. | `CTO ACCEPTED` |
| `E17-R11-D17` | `ArtifactReferenceV2` may supply immutable media identity but does not become a presentation-asset catalog or lifecycle owner. | `CTO ACCEPTED` |
| `E17-R11-D18` | Agent/Profile references exact asset/digest; binary/media content never enters `AgentRevisionV2`. | `CTO ACCEPTED` |
| `E17-R11-D19` | Asset replacement/rendition preserves immutable source, transformation and retained-output provenance; deletion follows storage/privacy policy. | `CTO ACCEPTED` |
| `E17-R11-D20` | Decorative, assertion, verified-assertion and canonical-state badges are semantically distinct. | `CTO ACCEPTED` |
| `E17-R11-D21` | A verified badge requires exact assertion, subject, Evidence, authorized verification decision, scope, time and validity/freshness. | `CTO ACCEPTED` |
| `E17-R11-D22` | Verification is non-boolean over time; stale, disputed, revoked, unavailable and corrected proof cannot remain an unqualified verified claim. | `CTO ACCEPTED` |
| `E17-R11-D23` | Badges grant no capability, authority, readiness, reputation, ownership, transferability or economic right. | `CTO ACCEPTED` |
| `E17-R11-D24` | Historical trait/presentation views use exact subject, definition, assertion, Evidence, asset/binding and projection sources and expose gaps. | `CTO ACCEPTED` |
| `E17-R11-D25` | Current heads, assets or trait definitions never substitute silently for missing historical inputs. | `CTO ACCEPTED` |
| `E17-R11-D26` | Performance history is a bounded projection over Run/Evidence/Usage/Cost with explicit method, window, mode, completeness and warnings. | `CTO ACCEPTED` |
| `E17-R11-D27` | Performance-derived traits remain time-bounded descriptive assertions; fitness, reputation, ranking, prediction and economic valuation are rejected. | `CTO ACCEPTED` |
| `E17-R11-D28` | Future projections use the existing Product API and REQ-10 source/Tenant/history/redaction semantics; parallel Genome API and client truth are rejected. | `CTO ACCEPTED` |
| `E17-R11-D29` | Visibility cannot exceed the most restrictive subject, source, Evidence, consent/license, policy or asset classification. | `CTO ACCEPTED` |
| `E17-R11-D30` | REQ-11 does not resolve the Administration IA divergence; REQ-12 must classify it before UI implementation planning. | `CTO ACCEPTED` |

Rejected: Genome Agent/identity/lineage, final Genome/DNA schema, trait-derived
authority, operational compatibility by label, inline Agent media, proof owned
by Genome, decorative verification, universal score, reputation, fitness,
ranking, inheritance, crossover, mutation, breeding, autonomous evolution,
tokenization, NFT, marketplace, royalties, economic rights, Genome economics,
on-chain storage and parallel Product API/persistence.

CTO acceptance authorizes REQ-12 documentation only. It authorizes no IMP,
endpoint, DTO, UI, schema, migration, database, storage, production or rollout
change.
