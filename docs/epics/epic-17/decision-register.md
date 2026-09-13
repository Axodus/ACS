# EPIC-17 Architecture Review Decision Register

**Architecture review:** `COMPLETE / ACCEPTED`
**REQ decomposition:** `COMPLETE / ACCEPTED`
**REQ-01:** `COMPLETE / ACCEPTED`
**REQ-02:** `COMPLETE / ACCEPTED`
**REQ-03:** `COMPLETE / READY FOR CTO ACCEPTANCE`

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
| E17-BR-D17 | The dependency-derived sequence contains twelve REQs, ending with an integrated implementation-readiness gate. | `ACCEPTED` |
| E17-BR-D18 | Each REQ closes in its own validated documentation commit; dependent REQs wait for CTO acceptance. | `ACCEPTED` |

## 2. Repository contradictions and REQ gates

| ID | Finding | Evidence | Consequence |
| --- | --- | --- | --- |
| E17-BR-G01 | Native and legacy Control Plane Agent representations coexist. | `src/native-core/agent.ts`; `src/control-plane/unified-agent-model.ts` | Every REQ must name the canonical Native seam and required compatibility projection; no third model. |
| E17-BR-G02 | Governed Profile currently contributes capability IDs to effective Agent composition. | `AgentService.compose` in `src/control-plane/agent-service.ts` | REQ-02 proposes Profile as a derived presentation projection and routes the legacy capability preset to REQ-04; future implementation remains blocked until accepted resource/configuration contracts resolve it. |
| E17-BR-G03 | Runtime configuration snapshot is structurally generic. | `RuntimeExecutionIntentV2.runtime_configuration` | REQ-03 proposes class-specific admission resolution and one immutable snapshot per binding generation; future implementation remains blocked pending accepted contract deltas and downstream owner history. |
| E17-BR-G04 | Memory has a policy reference and UI vocabulary but no canonical policy/store owner. | `AgentRevisionV2.knowledge.memory_policy_ref`; Control Plane navigation | Memory ownership, retention, deletion, retrieval and isolation must be frozen before implementation. |
| E17-BR-G05 | Automation is visible only as blocked/manual/disabled capability and readiness state. | `src/capability-registry.ts`; `src/http/services/operational-status-service.ts`; Product API summaries | Domain identity, activation and schedule semantics remain unimplemented. |
| E17-BR-G06 | Connector overlaps provider, tool, MCP and credential concepts. | Native Agent resource refs; `src/intelligence/`; governed composition resources | A Connector entity cannot be proposed until a distinct responsibility is proven. |
| E17-BR-G07 | Evidence artifacts do not prove a reusable profile-asset owner. | `ArtifactReferenceV2` in `src/native-core/evidence.ts` | Profile asset ownership/storage remains a REQ decision. |

None of these gates authorizes code changes. They determine REQ ordering.

REQ-02's accepted resolution and eleven decisions are recorded in
[REQ-02 Decision Record](req-02/decision-record.md). Its contract deltas and
ADRs remain candidates.

## 3. Candidate ADRs

The REQ decomposition should decide whether these ADRs are required:

- canonical Native/legacy Agent compatibility seam;
- Profile projection ownership and overloaded legacy naming (`ADR-17-004`, accepted as candidate by REQ-02);
- Persona ownership and structured behavior compilation (`ADR-17-005`, accepted as candidate by REQ-02);
- historical presentation provenance (`ADR-17-006`, accepted as candidate by REQ-02);
- governed resource catalog persistence and history;
- Connector versus provider/tool/MCP/connection boundary;
- Global Settings ownership;
- Memory policy/store ownership and deletion semantics;
- delegation relationship and authority attenuation;
- Automation identity, activation and schedule ownership;
- class-specific resolver and immutable snapshot (`ADR-17-007` through `ADR-17-010`, proposed by REQ-03);
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
REQ-01 canonical Agent seam
  -> REQ-02 Profile / Persona
  -> REQ-03 effective configuration / snapshot
  -> REQ-04 governed resources
       -> REQ-05 Connectors --+
       -> REQ-06 Memory -------+-> REQ-07 Delegation
                                    -> REQ-08 Automation
                                    -> REQ-09 Activation / Runtime
                                    -> REQ-10 API / Administration
                                    -> REQ-11 Genome semantics
                                    -> REQ-12 Conformance / IMP plan
```

The planning groups are resolved by [Dependency Graph](dependency-graph.md),
[REQ Decomposition](req-decomposition.md) and
[Capability-to-REQ Matrix](capability-to-req-matrix.md). The resulting sequence
is `EPIC-17-REQ-01 ... EPIC-17-REQ-12`.

This resolves planning order only. `REQ-01` and `REQ-02` are accepted. `REQ-03`
is complete and awaits CTO acceptance; `REQ-04` and later REQs remain
dependency-gated. Implementation authority remains `NONE`.
