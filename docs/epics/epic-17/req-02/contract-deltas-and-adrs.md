# REQ-02 Proposed Contract Deltas and ADRs

**Authority:** candidates for later acceptance and implementation planning only

## 1. Proposed contract deltas

| ID | Gap | Proposed normative delta | Boundary preserved |
| --- | --- | --- | --- |
| `E17-R02-CD01` | `Profile` names both a capability-bearing legacy preset and proposed presentation | Reserve `Profile` in EPIC-17 for the Agent presentation projection; give the legacy preset an explicit compatibility kind/name before canonical use. | Presentation and operational resource semantics remain separate. |
| `E17-R02-CD02` | Product API Profile summary is synthetic and source-light | Define a versioned, read-only presentation projection contract with source Agent revision and projection provenance. | Product API remains projection owner, not domain owner. |
| `E17-R02-CD03` | Headline, bio and description have no typed owner | Permit an optional Agent-owned presentation-state extension with no operational effect. | No Profile aggregate or second Agent lineage is implied. |
| `E17-R02-CD04` | Persona lacks structured semantics beyond current behavior fields | Permit typed behavioral facets only inside or exactly referenced by `AgentRevisionV2` and included in its fingerprint. | Persona remains subordinate to Agent revision. |
| `E17-R02-CD05` | Displayed skills could be mistaken for grants | Require displayed resource entries to derive from exact canonical bindings and identify source catalog revisions when retained. | Skill/catalog and governance owners remain authoritative. |
| `E17-R02-CD06` | Retained presentation lacks historical reconstruction inputs | Require exact Agent revision, head/presentation source, projection version and artifact/source provenance for retained output. | Existing Agent, Evidence and artifact-reference authorities are reused. |
| `E17-R02-CD07` | Current Profile contributes capabilities to legacy composition | Prohibit a presentation Profile from contributing effective capabilities; route legacy preset semantics to REQ-04 compatibility resolution. | Capability resolution remains with governed resources/configuration. |
| `E17-R02-CD08` | Head state is not fingerprinted with Agent behavior | Require REQ-03 to distinguish revision, head and lifecycle source state in historical snapshots and fail closed when required source history is unavailable. | Consumes `E17-R01-B02` without inventing a second history stream. |

No delta selects fields, endpoints, persistence, tables, migrations, UI or
runtime behavior.

## 2. Candidate ADRs

### ADR-17-004 — Profile projection and overloaded legacy naming

- **Decision candidate:** define Agent Profile as a derived presentation
  projection with no independent aggregate/revision and classify
  `GovernedProfileResource` as a legacy operational composition preset.
- **Rejected alternative:** reinterpret the capability-bearing legacy resource
  as presentation or add presentation fields to it without separating owners.
- **Reason:** that would let display state influence capability truth and retain
  ambiguous history.

### ADR-17-005 — Persona ownership within canonical Agent revision

- **Decision candidate:** keep Persona as a structured semantic view inside or
  exactly referenced by `AgentRevisionV2`.
- **Rejected alternative:** independent Persona identity, lifecycle, revision
  stream or provider-owned prompt truth.
- **Reason:** behavior already has a canonical immutable owner and lineage.

### ADR-17-006 — Historical presentation provenance

- **Decision candidate:** reconstruct retained presentation from explicit Agent
  revision, head/presentation source, projection version and artifact/source
  provenance.
- **Rejected alternative:** treat current Product API summary or current Agent
  head as sufficient historical evidence.
- **Dependency:** final form depends on REQ-03 treatment of revision state, head
  state and lifecycle history, including `E17-R01-B02`.

## 3. Implementation blockers

| ID | Blocker | Resolution gate |
| --- | --- | --- |
| `E17-R02-B01` | Legacy `GovernedProfileResource.capabilityIds` contributes to effective capabilities. | REQ-04 must freeze its resource/preset destination; a later IMP must remove or explicitly adapt the grant-like behavior without dual truth. |
| `E17-R02-B02` | No canonical presentation-state contract or durable history exists. | Accept `CD03`/`CD06`, settle REQ-03 source/snapshot semantics and prove historical reconstruction before implementation. |
| `E17-R02-B03` | Product API Profile summary synthesizes OpenClaw flags/sections and lacks canonical source provenance. | Accept a versioned projection contract and prove source fidelity before changing API/UI. |
| `E17-R02-B04` | REQ-01 `B02` leaves head fields outside current revision history. | REQ-03 must resolve the source distinction before claiming deterministic historical Profile/configuration reconstruction. |

These blockers stop future Profile/Persona implementation. They do not block
REQ-02 acceptance or authorize changes.

## 4. Escalation result

No CEO escalation is required. No identity transfer, reputation, NFT, Genome
economics or organizational-policy decision is introduced.
