# REQ-10 Contract Deltas, ADR Candidates and Blockers

All items in this document are planning inputs. They authorize no endpoint,
DTO, UI, service, schema, migration or implementation.

## Candidate contract deltas

| ID | Candidate delta | Owner preserved |
| --- | --- | --- |
| `E17-R10-CD01` | Common Product API projection metadata for source kind/ID, Tenant, revision or observation, owner, freshness, compatibility and reconstruction state. | Product API projection contract |
| `E17-R10-CD02` | Server-evaluated action descriptor with availability, denial reason, confirmation and asynchronous semantics. | Canonical command owner |
| `E17-R10-CD03` | Owner-routed command envelope carrying actor, Tenant, authority basis, CAS, idempotency, purpose and correlation. | Canonical command owner |
| `E17-R10-CD04` | Loss-aware Native Agent, Profile and Persona projections that expose exact source semantics. | Agent Core and Profile projection |
| `E17-R10-CD05` | Kind-specific governed resource and model projections with truthful lineage/observation guarantees. | Existing resource/model owners |
| `E17-R10-CD06` | Connector definition, Connection, credential-reference and Channel projections/actions after their missing contracts exist. | REQ-05 owners |
| `E17-R10-CD07` | Memory Policy, scope, store/reference and bounded administrative projections/actions after their missing contracts exist. | REQ-06 owners |
| `E17-R10-CD08` | Delegation Grant, chain, authority-basis, expiry and revocation projections/actions after its canonical contract exists. | Governance/Delegation boundary |
| `E17-R10-CD09` | Automation identity, revision, lifecycle, target and action projections after its canonical contract exists. | Automation boundary |
| `E17-R10-CD10` | Observation/Activation causation, claim, admission and Run-correlation projections after their canonical contracts exist. | Activation and existing runtime owners |
| `E17-R10-CD11` | Effective-configuration snapshot and resolution-finding projection using exact REQ-03 references. | Configuration resolver/Run snapshot |
| `E17-R10-CD12` | Class-owned Global Settings index with owner, scope, source, applicability, precedence and history links. | Per-class canonical owners |
| `E17-R10-CD13` | Typed cross-domain links that preserve identity, revision/observation and correlation. | Referenced canonical owner |
| `E17-R10-CD14` | Explicit unavailable, partial, stale, redacted and historical-gap response semantics. | Product API response contract |
| `E17-R10-CD15` | Consistent Tenant-safe list, search, reference and history query contracts. | Product API and Tenant authority |
| `E17-R10-CD16` | Flow/module/screen navigation metadata or conventions that preserve canonical drill-down. | Control Plane IA |
| `E17-R10-CD17` | Explicit IA decision reconciling Administration-under-System with the current primary Administration domain. | Accepted Control Plane IA authority |

## ADR candidates

| Candidate | Topic | State |
| --- | --- | --- |
| `ADR-17-043` | One Product API boundary and additive EPIC-17 versioning policy | `PROPOSED` |
| `ADR-17-044` | Source-faithful projection metadata and loss markers | `PROPOSED` |
| `ADR-17-045` | Owner-routed commands and server-evaluated action availability | `PROPOSED` |
| `ADR-17-046` | Global Settings as a class-owned index rather than a transversal core | `PROPOSED` |
| `ADR-17-047` | EPIC-17 projection families and canonical drill-down | `PROPOSED` |
| `ADR-17-048` | Historical snapshot, reconstruction-gap and redaction semantics | `PROPOSED` |
| `ADR-17-049` | Control Plane `Flow -> Module -> Screen` hierarchy | `PROPOSED` |
| `ADR-17-050` | Tenant-safe search/reference/history and write-only credential ingress | `PROPOSED` |
| `ADR-17-051` | Reconciliation of the Administration IA divergence | `PROPOSED` |

## Implementation blockers

| Blocker | Finding | Required resolution |
| --- | --- | --- |
| `E17-R10-B01` | Native Agent reads coexist with legacy AgentService mutation paths. | Resolve the REQ-01 canonical mutation seam before exposing complete Agent administration. |
| `E17-R10-B02` | Current Agent projection is lossy and Profile is partly synthetic. | Define source-faithful Native Agent/Profile/Persona contracts and lifecycle history. |
| `E17-R10-B03` | Resource classes have uneven durable lineage guarantees. | Define truthful revision or immutable-observation representation per resource kind. |
| `E17-R10-B04` | Canonical Connector Definition and Channel contracts are absent. | Resolve REQ-05 blockers before their Product API/UI implementation. |
| `E17-R10-B05` | Canonical Memory Policy/Store/Reference contracts are absent. | Resolve REQ-06 blockers before their Product API/UI implementation. |
| `E17-R10-B06` | Canonical Delegation Grant/history contracts are absent. | Resolve REQ-07 hard implementation gates before their Product API/UI implementation. |
| `E17-R10-B07` | Canonical Automation and Activation contracts are absent. | Resolve REQ-08/09 identity, claim, history and admission blockers first. |
| `E17-R10-B08` | No typed, durable effective-configuration Run snapshot contract is implemented. | Resolve REQ-03 snapshot and reconstruction blockers. |
| `E17-R10-B09` | Product API lacks common source/lineage/freshness/reconstruction metadata. | Define and version the common projection metadata contract. |
| `E17-R10-B10` | Product API lacks a common owner-routed action/command contract for the proposed domains. | Define bounded action descriptors and command envelope without moving owner authority. |
| `E17-R10-B11` | Current `SystemConfigurationView` is an operational read model, not sufficient Global Settings ownership. | Implement only after per-class owners and projections are established. |
| `E17-R10-B12` | Product API has no routes for several future EPIC-17 domains. | Add routes only through authorized IMPs after canonical contracts exist. |
| `E17-R10-B13` | Current UI has a generic Memory placeholder and no complete Delegation, Automation or Activation modules. | Design flows only after their API/domain contracts are authorized. |
| `E17-R10-B14` | EPIC-14 IA and current navigation disagree on Administration placement. | Obtain an explicit IA decision before route/module implementation. |
| `E17-R10-B15` | Tenant-safe search, reference lookup and history behavior is not proven for future projections. | Specify and test visibility/non-disclosure consistently in each future IMP. |

These blockers gate relevant implementation planning. They do not block REQ-10
architecture closure and do not trigger an architecture escalation at this
documentation gate.
