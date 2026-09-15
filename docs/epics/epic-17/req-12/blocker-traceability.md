# REQ-12 Raw Blocker Traceability

**Inherited blocker coverage:** `84 / 84`
**REQ-12 blockers:** `2`
**Implementation authority:** none

Every inherited blocker remains open until its governing IMP explicitly
resolves, defers or escalates it. Consolidation does not change source status.

| Blocker | Source finding | Consolidated cause | Candidate resolution | Classification | Escalation trigger | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `E17-R01-B01` | Canonical Native Agent mutation is not exposed through the current Product API client; writes still use `AgentService`. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-01](../req-01/contract-deltas-and-adrs.md) |
| `E17-R01-B02` | Head/lifecycle fields are not part of the current Agent revision fingerprint/history payload. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-01](../req-01/contract-deltas-and-adrs.md) |
| `E17-R01-B03` | Deployment/readiness/composition paths still consume legacy Agent structures. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-01](../req-01/contract-deltas-and-adrs.md) |
| `E17-R02-B01` | Legacy `GovernedProfileResource.capabilityIds` contributes to effective capabilities. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-02](../req-02/contract-deltas-and-adrs.md) |
| `E17-R02-B02` | No canonical presentation-state contract or durable history exists. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-02](../req-02/contract-deltas-and-adrs.md) |
| `E17-R02-B03` | Product API Profile summary synthesizes OpenClaw flags/sections and lacks canonical source provenance. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-02](../req-02/contract-deltas-and-adrs.md) |
| `E17-R02-B04` | REQ-01 `B02` leaves head fields outside current revision history. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-02](../req-02/contract-deltas-and-adrs.md) |
| `E17-R03-B01` | Current runtime intent configuration/provenance are generic and partial. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-03](../req-03/contract-deltas-and-adrs.md) |
| `E17-R03-B02` | `E17-R01-B02` leaves Agent head/lifecycle history incomplete. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-03](../req-03/contract-deltas-and-adrs.md) |
| `E17-R03-B03` | Several policy/resource catalogs lack proven immutable durable history. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-03](../req-03/contract-deltas-and-adrs.md) |
| `E17-R03-B04` | Legacy consumers and Profile-derived capabilities can create competing effective configuration. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-03](../req-03/contract-deltas-and-adrs.md) |
| `E17-R03-B05` | Existing `plan_fingerprint` is not proven equivalent to a full effective-configuration fingerprint. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-03](../req-03/contract-deltas-and-adrs.md) |
| `E17-R04-B01` | Only Role has proven durable governed history. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R04-B02` | Static Skill/Tool/Capability/Profile revisions lack fingerprints/history. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R04-B03` | No canonical general MCP definition catalog exists. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R04-B04` | Provider/model observations lack immutable revision semantics. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R04-B05` | Legacy Profile capability union can appear to grant capability. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R04-B06` | Product API legacy IDs lose exact resource revisions/fingerprints. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-04](../req-04/contract-deltas-and-adrs.md) |
| `E17-R05-B01` | Existing `CredentialConnection` combines configured connection and credential metadata; semantic projection/history must be accepted before migration. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-05](../req-05/contract-deltas-and-adrs.md) |
| `E17-R05-B02` | No generic Channel owner, contract or durable history exists. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-05](../req-05/contract-deltas-and-adrs.md) |
| `E17-R05-B03` | General MCP definition/connection split remains unimplemented. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-05](../req-05/contract-deltas-and-adrs.md) |
| `E17-R05-B04` | Exact historical Connection/secret-version reconstruction is not uniformly proven. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-05](../req-05/contract-deltas-and-adrs.md) |
| `E17-R05-B05` | Channel ingress idempotency/admission/evidence contract is absent. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-05](../req-05/contract-deltas-and-adrs.md) |
| `E17-R06-B01` | `memory_policy_ref` has no implemented resolvable policy contract/history under Governance authority | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R06-B02` | No canonical Memory record/store contract exists | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R06-B03` | User/subject identity, consent and privacy-deletion decision contract is insufficiently unified | `E17-R12-C11` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R06-B04` | Content deletion and historically reproducible execution can conflict | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R06-B05` | Workforce has no Memory field by design | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | Architecture if excluded boundary is expanded incompatibly | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R06-B06` | REQ-03 snapshot is not yet a typed implemented contract | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-06](../req-06/contract-deltas-and-adrs.md) |
| `E17-R07-B01` | Canonical Delegation Grant/reference/history now exists | `E17-R12-C05` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B02` | Typed attenuation resolver and single authority basis now exist | `E17-R12-C05` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B03` | Exact chain/depth/cycle contract now exists | `E17-R12-C05` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B04` | New-use/admission revocation and expiry enforcement preserves historical snapshots | `E17-R12-C05` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B05` | Delegation Event/Evidence/outbox correlation now exists | `E17-R12-C08` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B06` | Legacy sub-Agent metadata remains non-authoritative | `E17-R12-C05` | `IMP-04` | `RESOLVED / REJECTED-BY-DESIGN` | None currently active | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R07-B07` | Cross-Tenant Delegation is fail-closed | `E17-R12-C11` | `IMP-04` | `RESOLVED / IMP-04 PUBLISHED` | Architecture if excluded boundary is expanded incompatibly | [REQ-07](../req-07/contract-deltas-and-adrs.md) |
| `E17-R08-B01` | No canonical Automation identity/revision/lifecycle contract or durable history exists | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B02` | Exact admission-capable target identity/revision semantics are not uniformly implemented, especially for Workflow | `E17-R12-C06` | `IMP-05` | `SAFE TO DEFER` | Architecture if excluded boundary is expanded incompatibly | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B03` | No Automation CAS, fingerprint, lifecycle event or transactional outbox contract exists | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B04` | Authored Automation configuration is not integrated with the typed REQ-03 effective snapshot | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B05` | Direct/delegated authority revalidation at Activation has no contract | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B06` | No Activation identity/idempotency/history or Run correlation exists | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B07` | Evidence lacks an Automation subject/reference vocabulary | `E17-R12-C08` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R08-B08` | Usage/Cost records lack explicit Automation/Activation correlation | `E17-R12-C08` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-08](../req-08/contract-deltas-and-adrs.md) |
| `E17-R09-B01` | No canonical Activation identity, lifecycle or durable causal history exists | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B02` | No normalized Trigger/Schedule/Channel/Manual observation contract or trusted source key exists | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B03` | No Activation occurrence key, payload-digest conflict rule or durable claim exists | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B04` | No schedule rule owner implementation, durable watermark or missed-occurrence reconciliation contract exists | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B05` | Current `RuntimeExecutionIntentV2` is post-admission/post-assignment while the architecture shorthand says execution intent before admission | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B06` | Direct/delegated authority, lifecycle and policy revalidation is not connected to an Activation contract | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B07` | REQ-03 effective snapshot and REQ-08 exact target resolution are not connected to Activation/admission | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B08` | No recoverably idempotent Activation-to-admission-to-Run correlation exists | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B09` | Activation retry/cancellation/recovery and execution retry/cancellation/recovery are not contractually separated | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B10` | Exact Workflow target revision/admission support remains incomplete | `E17-R12-C07` | `IMP-06` | `SAFE TO DEFER` | Architecture if excluded boundary is expanded incompatibly | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B11` | Events/Evidence lack Activation subject and occurrence vocabulary | `E17-R12-C08` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B12` | Usage/Cost lacks explicit Automation revision and Activation correlation | `E17-R12-C08` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R09-B13` | No provider-neutral Trigger/Schedule observation adapter exists; OpenClaw exposes execution/target operations only | `E17-R12-C07` | `IMP-06` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-09](../req-09/contract-deltas-and-adrs.md) |
| `E17-R10-B01` | Native Agent reads coexist with legacy AgentService mutation paths. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B02` | Current Agent projection is lossy and Profile is partly synthetic. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B03` | Resource classes have uneven durable lineage guarantees. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B04` | Canonical Connector Definition and Channel contracts are absent. | `E17-R12-C03` | `IMP-03A` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B05` | Canonical Memory Policy/Store/Reference contracts are absent. | `E17-R12-C04` | `IMP-03B` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B06` | Canonical Delegation Grant/history contracts are absent. | `E17-R12-C05` | `IMP-04` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B07` | Canonical Automation and Activation contracts are absent. | `E17-R12-C06` | `IMP-05` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B08` | No typed, durable effective-configuration Run snapshot contract is implemented. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B09` | Product API lacks common source/lineage/freshness/reconstruction metadata. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B10` | Product API lacks a common owner-routed action/command contract for the proposed domains. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B11` | Current `SystemConfigurationView` is an operational read model, not sufficient Global Settings ownership. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B12` | Product API has no routes for several future EPIC-17 domains. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B13` | Current UI has a generic Memory placeholder and no complete Delegation, Automation or Activation modules. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R10-B14` | EPIC-14 IA and current navigation disagree on Administration placement. | `E17-R12-C12` | `IMP-09` | `RESOLVED / CLOSED` | Reopens only if Administration regains primary or independent ownership | [IMP-09 conformance](../implementation-gate/imp-09-final-conformance.md) |
| `E17-R10-B15` | Tenant-safe search, reference lookup and history behavior is not proven for future projections. | `E17-R12-C11` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-10](../req-10/contract-deltas-and-adrs.md) |
| `E17-R11-B01` | No canonical trait vocabulary owner or version contract is implemented. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B02` | No assertion identity/digest, provenance, lifecycle, correction or durable history contract exists. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B03` | Agent-owned presentation state and its durable history remain absent. | `E17-R12-C01` | `IMP-01` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B04` | No presentation-asset owner, binding, lifecycle, visibility, consent/license or deletion contract exists. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B05` | `ArtifactReferenceV2` is an Evidence primitive and does not prove a reusable presentation-asset catalog/storage lifecycle. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B06` | No verification policy, trusted verifier/issuer, validity, revocation or reevaluation contract exists. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B07` | Existing Evidence subject refs do not define trait-specific assertion-to-proof association and sufficiency. | `E17-R12-C10` | `IMP-08` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B08` | Product API and Control Plane have no canonical trait/asset/verification projections or owner-routed actions. | `E17-R12-C09` | `IMP-07` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B09` | Agent head/Profile and some resource histories remain incomplete for deterministic reconstruction. | `E17-R12-C02` | `IMP-02` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B10` | `AcsPerformanceRecord` is bounded capability/trading data with mock fixtures, not canonical Agent performance/reputation. | `E17-R12-C10` | `IMP-08` | `SAFE TO DEFER` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B11` | Tenant/public visibility, consent/license, correction, deletion and cross-Tenant non-disclosure are not specified for future trait/assets. | `E17-R12-C11` | `owning IMP + IMP-10` | `BLOCKS SPECIFIC IMP` | None currently active | [REQ-11](../req-11/contract-deltas-and-adrs.md) |
| `E17-R11-B12` | REQ-10 records unresolved Administration placement in the Control Plane IA. | `E17-R12-C12` | `IMP-09` | `RESOLVED / CLOSED` | Reopens only if Administration regains primary or independent ownership | [IMP-09 conformance](../implementation-gate/imp-09-final-conformance.md) |
| `E17-R12-B01` | No concrete IMP-01 charter/decision package is accepted. | First-implementation gate | CTO IMP-01 gate | `BLOCKS FIRST IMPLEMENTATION` | None | [Consolidation](blocker-consolidation.md) |
| `E17-R12-B02` | `ACS-BLOCKER-014` status sources disagree. | First-implementation validation gate | Governing status reconciliation | `BLOCKS FIRST IMPLEMENTATION` | None | [Consolidation](blocker-consolidation.md) |

## Mechanical reconciliation

```text
Inherited blocker IDs: 84 / 84
Blocks specific IMP: 80
Safe to defer: 4
Architecture escalation active: 0
CEO escalation active: 0
REQ-12 first-implementation blockers: 2
Unmapped inherited blockers: 0
```

## Consolidated cause counts

| Cause | Inherited blockers |
| --- | ---: |
| `E17-R12-C01` | 11 |
| `E17-R12-C02` | 13 |
| `E17-R12-C03` | 6 |
| `E17-R12-C04` | 6 |
| `E17-R12-C05` | 6 |
| `E17-R12-C06` | 7 |
| `E17-R12-C07` | 11 |
| `E17-R12-C08` | 5 |
| `E17-R12-C09` | 6 |
| `E17-R12-C10` | 7 |
| `E17-R12-C11` | 4 |
| `E17-R12-C12` | 2 |
