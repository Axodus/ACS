# REQ-11 Contract Deltas, ADR Candidates and Blockers

All items are planning inputs. They authorize no entity, aggregate, endpoint,
DTO, repository, schema, table, service, UI, storage, migration or
implementation.

## Candidate contract deltas

| ID | Candidate delta | Boundary preserved |
| --- | --- | --- |
| `E17-R11-CD01` | Logical trait-definition contract with qualified ID, exact version/digest, value semantics, scope, provenance and compatibility state. | Genome owns descriptive vocabulary only. |
| `E17-R11-CD02` | Logical trait-assertion contract with exact subject/definition, value, origin, producer, time/window, source, Evidence, visibility and correction state. | Referenced canonical owners retain fact and subject truth. |
| `E17-R11-CD03` | Explicit assertion anchoring modes for immutable revisions, mutable heads/presentation observations, resources and execution occurrences. | No competing Agent or resource lineage. |
| `E17-R11-CD04` | Versioned trait-definition crosswalk with transformation/loss and provenance. | No silent latest resolution or operational compatibility claim. |
| `E17-R11-CD05` | Append/correction/supersession/dispute/revocation semantics for assertions and verification decisions. | Historical views remain immutable and correction-aware. |
| `E17-R11-CD06` | Agent Profile projection of trait assertions with exact sources, display classification and no operational effect. | Profile remains a projection without aggregate/lineage. |
| `E17-R11-CD07` | Presentation-asset reference adapting immutable artifact identity plus owner, Tenant, role, visibility, consent/license and lifecycle semantics. | Media storage and Evidence remain separate owners. |
| `E17-R11-CD08` | Agent-owned presentation binding between Profile role and exact asset reference/digest. | Asset bytes stay outside `AgentRevisionV2`. |
| `E17-R11-CD09` | Asset replacement, rendition, deletion/tombstone and retained-output reconstruction semantics. | Storage/privacy policy owns retention and erasure. |
| `E17-R11-CD10` | Typed decorative, assertion, verified-assertion and canonical-state badge projection. | UI styling does not create domain claims. |
| `E17-R11-CD11` | Verification association with exact assertion, Evidence, verifier/policy decision, scope, time, validity and reevaluation status. | Evidence and Governance retain proof/authority ownership. |
| `E17-R11-CD12` | Bounded performance-history projection with method, window, mode, sources, completeness, warnings and correction state. | Run, Evidence, Usage and Cost remain authoritative. |
| `E17-R11-CD13` | REQ-10-compliant Product API projections/actions for traits, assets and badges after owner contracts exist. | One Product API; owner-routed commands only. |
| `E17-R11-CD14` | Tenant-safe visibility/redaction/non-disclosure rules across trait, asset, verification and history lookup. | Existing Tenant and security authority. |
| `E17-R11-CD15` | Historical reconstruction manifest for trait/presentation views with explicit unavailable/deleted/unresolved findings. | Current heads cannot rewrite history. |

## ADR candidates

| Candidate | Topic | State |
| --- | --- | --- |
| `ADR-17-052` | Minimal Genome as descriptive vocabulary/assertion boundary over canonical ACS references | `PROPOSED` |
| `ADR-17-053` | Trait-definition and trait-assertion semantics without a second Agent model | `PROPOSED` |
| `ADR-17-054` | Trait version compatibility, subject anchoring and historical reconstruction | `PROPOSED` |
| `ADR-17-055` | Presentation-asset reference and Agent-owned Profile binding | `PROPOSED` |
| `ADR-17-056` | Badge taxonomy and Evidence/Governance-backed verification | `PROPOSED` |
| `ADR-17-057` | Performance-derived views without reputation, fitness or authority | `PROPOSED` |
| `ADR-17-058` | Product API, Tenant visibility and redaction for classification/presentation | `PROPOSED` |
| `ADR-17-059` | Correction, revocation, deletion and historical tombstone semantics | `PROPOSED` |

## Implementation blockers

| Blocker | Finding | Required resolution |
| --- | --- | --- |
| `E17-R11-B01` | No canonical trait vocabulary owner or version contract is implemented. | Accept and implement bounded definition ownership before authoring traits. |
| `E17-R11-B02` | No assertion identity/digest, provenance, lifecycle, correction or durable history contract exists. | Define the logical assertion contract and owner transaction/history semantics. |
| `E17-R11-B03` | Agent-owned presentation state and its durable history remain absent. | Resolve REQ-02 blockers before persistent Profile trait/asset bindings. |
| `E17-R11-B04` | No presentation-asset owner, binding, lifecycle, visibility, consent/license or deletion contract exists. | Establish bounded metadata/binding owners before asset administration. |
| `E17-R11-B05` | `ArtifactReferenceV2` is an Evidence primitive and does not prove a reusable presentation-asset catalog/storage lifecycle. | Define an adapter/reference boundary without promoting Evidence to asset owner. |
| `E17-R11-B06` | No verification policy, trusted verifier/issuer, validity, revocation or reevaluation contract exists. | Governance must define verification authority before “verified” display. |
| `E17-R11-B07` | Existing Evidence subject refs do not define trait-specific assertion-to-proof association and sufficiency. | Define exact association and policy decision while reusing Evidence ownership. |
| `E17-R11-B08` | Product API and Control Plane have no canonical trait/asset/verification projections or owner-routed actions. | Add them only after source contracts are authorized and REQ-10 requirements are met. |
| `E17-R11-B09` | Agent head/Profile and some resource histories remain incomplete for deterministic reconstruction. | Carry REQ-01/02/04 blockers into the affected IMP sequence and fail gaps explicitly. |
| `E17-R11-B10` | `AcsPerformanceRecord` is bounded capability/trading data with mock fixtures, not canonical Agent performance/reputation. | Define source-faithful derived-view semantics before any performance trait projection. |
| `E17-R11-B11` | Tenant/public visibility, consent/license, correction, deletion and cross-Tenant non-disclosure are not specified for future trait/assets. | Define and test security/privacy semantics in each future owner/API IMP. |
| `E17-R11-B12` | REQ-10 records unresolved Administration placement in the Control Plane IA. | REQ-12 must classify it before any trait/asset/badge route or module plan. |

These blockers gate relevant future implementation. They do not block REQ-11
architecture closure and trigger no architecture or CEO escalation at this
documentation gate.
