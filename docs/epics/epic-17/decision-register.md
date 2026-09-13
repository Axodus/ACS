# EPIC-17 Architecture Review Decision Register

**Architecture review:** `COMPLETE / ACCEPTED`
**REQ decomposition:** `COMPLETE / PROPOSED FOR NORMATIVE REQ AUTHORING`

## 1. Frozen decisions

| ID | Decision | Status |
| --- | --- | --- |
| E17-BR-D01 | EPIC-17 extends the implemented ACS and creates no second canonical core. | `FROZEN` |
| E17-BR-D02 | Native Agent identity, revision lineage and lifecycle remain canonical. | `FROZEN` |
| E17-BR-D03 | Workforce v1 and Run admission remain unchanged; incompatible needs become blockers. | `FROZEN` |
| E17-BR-D04 | Automation is separate from execution and feeds the existing admission boundary. | `FROZEN` |
| E17-BR-D05 | Automation aggregate identity/revision is a REQ decision. | `RESERVED_FOR_REQ` |
| E17-BR-D06 | Delegation relates canonical Agents; no distinct `SubAgent` identity exists. | `FROZEN` |
| E17-BR-D07 | Delegation representation and revision ownership are REQ decisions. | `RESERVED_FOR_REQ` |
| E17-BR-D08 | Global Settings is a capability gap; Administration/Control Plane configuration is the owner hypothesis to test. | `RESERVED_FOR_REQ` |
| E17-BR-D09 | Configuration precedence is determined by class and lower layers cannot escalate authority. | `FROZEN` |
| E17-BR-D10 | Genome traits are descriptive references without operational or economic authority. | `FROZEN` |
| E17-BR-D11 | `NEW` authorizes consideration only, never implementation. | `FROZEN` |
| E17-BR-D12 | REQ count and numbering follow the dependency graph; the original eleven are candidates only. | `FROZEN` |
| E17-BR-D13 | The 76 evidence-backed dispositions supersede the original Genome attachment as the EPIC-17 planning baseline. | `ACCEPTED` |
| E17-BR-D14 | Structural seams and ownership decisions precede UX, Administration projections and Automation execution integration. | `ACCEPTED` |
| E17-BR-D15 | Administration and Control Plane project accepted contracts through Product API; they do not originate domain truth. | `ACCEPTED` |
| E17-BR-D16 | Documentation validation is sufficient for Architecture Review closure; no ACS regression run is required for this documentation-only diff. | `ACCEPTED` |
| E17-BR-D17 | The dependency-derived planning sequence contains twelve REQs, ending with an integrated implementation-readiness gate. | `PROPOSED_FOR_REQ_AUTHORING` |

## 2. Repository contradictions and REQ gates

| ID | Finding | Evidence | Consequence |
| --- | --- | --- | --- |
| E17-BR-G01 | Native and legacy Control Plane Agent representations coexist. | `src/native-core/agent.ts`; `src/control-plane/unified-agent-model.ts` | Every REQ must name the canonical Native seam and required compatibility projection; no third model. |
| E17-BR-G02 | Governed Profile currently contributes capability IDs to effective Agent composition. | `AgentService.compose` in `src/control-plane/agent-service.ts` | Profile presentation versus capability truth must be decided before Profile/Persona implementation. |
| E17-BR-G03 | Runtime configuration snapshot is structurally generic. | `RuntimeExecutionIntentV2.runtime_configuration` | Typed effective-configuration references require a later additive contract decision. |
| E17-BR-G04 | Memory has a policy reference and UI vocabulary but no canonical policy/store owner. | `AgentRevisionV2.knowledge.memory_policy_ref`; Control Plane navigation | Memory ownership, retention, deletion, retrieval and isolation must be frozen before implementation. |
| E17-BR-G05 | Automation is visible only as blocked/manual/disabled capability and readiness state. | `src/capability-registry.ts`; `src/http/services/operational-status-service.ts`; Product API summaries | Domain identity, activation and schedule semantics remain unimplemented. |
| E17-BR-G06 | Connector overlaps provider, tool, MCP and credential concepts. | Native Agent resource refs; `src/intelligence/`; governed composition resources | A Connector entity cannot be proposed until a distinct responsibility is proven. |
| E17-BR-G07 | Evidence artifacts do not prove a reusable profile-asset owner. | `ArtifactReferenceV2` in `src/native-core/evidence.ts` | Profile asset ownership/storage remains a REQ decision. |

None of these gates authorizes code changes. They determine REQ ordering.

## 3. Candidate ADRs

The REQ decomposition should decide whether these ADRs are required:

- canonical Native/legacy Agent compatibility seam;
- Profile ownership and revision semantics;
- Persona ownership and structured behavior compilation;
- governed resource catalog persistence and history;
- Connector versus provider/tool/MCP/connection boundary;
- Global Settings ownership;
- Memory policy/store ownership and deletion semantics;
- delegation relationship and authority attenuation;
- Automation identity, activation and schedule ownership;
- typed effective-configuration snapshot;
- OpenClaw Automation adapter boundary;
- Genome trait vocabulary and provenance mapping.

## 4. Blocker policy

Create an EPIC-17 blocker and escalate architecture before implementation when
a proposed requirement needs an incompatible change to:

```text
Agent identity or immutable lineage
Workforce / WorkforceRevision / slots / membership / admission
Run / Workflow / Task / Assignment / Attempt
Runtime ownership / leases / fencing / recovery
Evidence / Usage / Cost / Economics authority
shared PostgreSQL / events / outbox / idempotency
Product API authority
Tenant or governance boundaries
```

No active blocker prevents REQ decomposition. No CEO escalation is required for
the documentation review. NFT, inheritance, mutation, marketplace, royalties
and Genome economics remain rejected.

## 5. Resolved dependency plan

```text
G1 canonical Agent seam and ownership baseline
  -> G2 Profile / Persona / presentation
  -> G3 Administration / settings / catalogs / connections / channels / memory
  -> G4 Delegation and Automation semantics
  -> G5 activation / runtime resolution / adapters / recovery
  -> G6 Product API / Control Plane / Evidence / Cost projections
  -> G7 Genome trait compatibility
  -> G8 progressive and final validation
```

The planning groups are resolved by [Dependency Graph](dependency-graph.md),
[REQ Decomposition](req-decomposition.md) and
[Capability-to-REQ Matrix](capability-to-req-matrix.md). The resulting sequence
is `EPIC-17-REQ-01 ... EPIC-17-REQ-12`.

This resolves planning order only. Every REQ remains unaccepted until its
normative package is authored and reviewed. Implementation authority remains
`NONE`.
