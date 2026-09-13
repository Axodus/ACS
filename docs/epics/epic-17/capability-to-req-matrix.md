# EPIC-17 Capability-to-REQ Matrix

**Status:** `COMPLETE / 76 OF 76 DISPOSITIONS MAPPED`
**Baseline:** `08b9355c41c635910bade3700f81c03d36c8db50`
**Implementation authority:** none

## 1. Mapping rule

The IDs preserve the exact order and classification from
[Capability Inventory](capability-inventory.md). Each capability has one primary
REQ owner under the accepted dependency sequence. `REQ-12` performs final
cross-domain reconciliation for every row.

## 2. Complete mapping

| ID | Capability | Review class | Primary REQ | Planning role |
| --- | --- | --- | --- | --- |
| `E17-C01` | Administration domain | `EXTEND` | `REQ-10` | Domain-driven projection |
| `E17-C02` | Global Settings | `NEW` | `REQ-10` | Owner decision by configuration class |
| `E17-C03` | Model catalog | `ADAPT` | `REQ-04` | Preserve provider-neutral catalog |
| `E17-C04` | Skills | `ADAPT` | `REQ-04` | Governed resource history |
| `E17-C05` | Tools | `EXTEND` | `REQ-04` | Additive catalog decision |
| `E17-C06` | Capabilities | `EXTEND` | `REQ-04` | Separate requirement, grant and display |
| `E17-C07` | Connector definition | `ADAPT` | `REQ-05` | Prove distinct responsibility |
| `E17-C08` | Connection | `REUSE` | `REQ-05` | Preserve connection owner |
| `E17-C09` | Credentials and secrets | `REUSE` | `REQ-05` | Preserve opaque references and leases |
| `E17-C10` | Channels | `NEW` | `REQ-05` | Establish owner before representation |
| `E17-C11` | Runtime/system configuration | `EXTEND` | `REQ-03` | Class-specific effective snapshot |
| `E17-C12` | Agent identity | `REUSE` | `REQ-01` | Preserve canonical Native identity |
| `E17-C13` | Agent lifecycle | `REUSE` | `REQ-01` | Preserve one canonical lifecycle |
| `E17-C14` | Agent revisions | `REUSE` | `REQ-01` | Preserve immutable revisions |
| `E17-C15` | Agent lineage/history | `REUSE` | `REQ-01` | Preserve durable lineage and CAS |
| `E17-C16` | Canonical name, role and mission | `EXTEND` | `REQ-02` | Resolve behavior and presentation ownership |
| `E17-C17` | Profile | `ADAPT` | `REQ-02` | Resolve presentation/capability conflict |
| `E17-C18` | Avatar/profile asset | `NEW` | `REQ-11` | Decide bounded presentation asset reference |
| `E17-C19` | Headline, bio and description | `NEW` | `REQ-02` | Decide Profile ownership and history |
| `E17-C20` | Persona | `EXTEND` | `REQ-02` | Structure behavior without new Agent model |
| `E17-C21` | Custom instructions | `REUSE` | `REQ-02` | Preserve controlled behavioral component |
| `E17-C22` | Model preferences | `ADAPT` | `REQ-04` | Reconcile Native and legacy references |
| `E17-C23` | Skill bindings | `REUSE` | `REQ-04` | Preserve exact resource revisions |
| `E17-C24` | Connector permissions | `ADAPT` | `REQ-05` | Reuse governance and connection refs |
| `E17-C25` | Channel permissions | `NEW` | `REQ-05` | Follow Channel and governance ownership |
| `E17-C26` | Memory policy | `NEW` | `REQ-06` | Preserve existing policy reference seam |
| `E17-C27` | Displayed skills | `ADAPT` | `REQ-02` | Derive presentation from canonical bindings |
| `E17-C28` | Badges | `NEW` | `REQ-11` | Separate decorative and verified semantics |
| `E17-C29` | Historically reconstructable behavior | `EXTEND` | `REQ-03` | Freeze effective historical configuration |
| `E17-C30` | Working Memory | `NEW` | `REQ-06` | Keep distinct from runtime state |
| `E17-C31` | Agent Memory | `NEW` | `REQ-06` | Establish authority and lifecycle |
| `E17-C32` | Workforce Shared Memory | `NEW` | `REQ-06` | Companion boundary outside Workforce Core |
| `E17-C33` | User/context Memory | `NEW` | `REQ-06` | Define consent, privacy and deletion |
| `E17-C34` | Knowledge Memory | `ADAPT` | `REQ-06` | Reuse provenance-bearing knowledge refs |
| `E17-C35` | Historical/episodic Memory as an alias for Evidence/history | `REJECT` | `REQ-06` | Negative boundary gate |
| `E17-C36` | Agent-to-Agent delegation | `NEW` | `REQ-07` | Define bounded relationship |
| `E17-C37` | Delegation permissions | `NEW` | `REQ-07` | Define attenuation over governance |
| `E17-C38` | Depth/recursion policy | `NEW` | `REQ-07` | Define cycle/depth rejection |
| `E17-C39` | Delegation history | `ADAPT` | `REQ-07` | Reuse events and Evidence references |
| `E17-C40` | Sub-Agent identity | `REJECT` | `REQ-07` | Negative identity gate |
| `E17-C41` | Workforce | `REUSE` | `REQ-07` | Preserve Workforce v1 |
| `E17-C42` | Workforce membership and Run admission | `REUSE` | `REQ-07` | Preserve exact admitted revisions |
| `E17-C43` | Automation domain | `NEW` | `REQ-08` | Establish owner before aggregate choice |
| `E17-C44` | Automation identity and revisions | `NEW` | `REQ-08` | Decide necessity and ownership |
| `E17-C45` | Automation lifecycle | `NEW` | `REQ-08` | Derive domain-specific states |
| `E17-C46` | Scheduled Tasks | `NEW` | `REQ-09` | Separate schedule from Task execution |
| `E17-C47` | Triggers | `NEW` | `REQ-09` | Normalize external observations |
| `E17-C48` | Schedules | `NEW` | `REQ-09` | Establish evaluation and version owner |
| `E17-C49` | Target resolution | `ADAPT` | `REQ-08` | Reference canonical targets |
| `E17-C50` | Execution policies | `REUSE` | `REQ-03` | Preserve class-specific attenuation |
| `E17-C51` | Idempotent activation | `EXTEND` | `REQ-09` | Reuse shared transaction patterns |
| `E17-C52` | Retry and concurrency | `ADAPT` | `REQ-09` | Separate activation and execution retry |
| `E17-C53` | Automation history | `ADAPT` | `REQ-09` | Reuse history after identity decision |
| `E17-C54` | Recovery/restart | `EXTEND` | `REQ-09` | Reconcile due work without runtime fork |
| `E17-C55` | Run linkage | `EXTEND` | `REQ-09` | Add activation correlation |
| `E17-C56` | Workflow target | `REUSE` | `REQ-09` | Preserve Workflow ownership |
| `E17-C57` | Run/Task/Assignment/Attempt | `REUSE` | `REQ-09` | Preserve execution machinery |
| `E17-C58` | Runtime resolution | `EXTEND` | `REQ-03` | Type effective snapshot references |
| `E17-C59` | OpenClaw execution | `ADAPT` | `REQ-09` | Keep replaceable executor adapter |
| `E17-C60` | Codex/alternative runtime compatibility | `REUSE` | `REQ-09` | Preserve provider-neutral interfaces |
| `E17-C61` | Evidence | `REUSE` | `REQ-09` | Preserve Evidence authority in activation/runtime correlation |
| `E17-C62` | Provenance | `REUSE` | `REQ-09` | Preserve source and execution correlation |
| `E17-C63` | Usage and Cost | `REUSE` | `REQ-09` | Correlate without new economic owner |
| `E17-C64` | Economics | `REUSE` | `REQ-09` | Reject Genome economic semantics |
| `E17-C65` | Events/outbox/idempotency | `REUSE` | `REQ-09` | Reuse shared transaction rules |
| `E17-C66` | PostgreSQL shared state | `REUSE` | `REQ-09` | Reject parallel persistence |
| `E17-C67` | Product API | `EXTEND` | `REQ-10` | Add domain-owned projections only |
| `E17-C68` | Control Plane | `EXTEND` | `REQ-10` | Consume Product API projections |
| `E17-C69` | Tenant isolation | `REUSE` | `REQ-12` | Cross-domain fail-closed conformance |
| `E17-C70` | Security | `REUSE` | `REQ-12` | Cross-domain negative cases |
| `E17-C71` | Trait classification | `NEW` | `REQ-11` | Define descriptive vocabulary |
| `E17-C72` | Lineage-ready identity | `REUSE` | `REQ-11` | Reference canonical Agent revisions |
| `E17-C73` | Historical reconstruction | `EXTEND` | `REQ-11` | Reference accepted history sources |
| `E17-C74` | Evidence association | `ADAPT` | `REQ-11` | Map traits to Evidence references |
| `E17-C75` | Future representation compatibility | `NEW` | `REQ-11` | Record constraints without schema commitment |
| `E17-C76` | Performance history | `ADAPT` | `REQ-11` | Evidence-backed view without fitness claim |

## 3. Rejected-scope traceability

| Rejected scope family | Guard REQ | Required disposition |
| --- | --- | --- |
| DNA schema, inheritance, crossover, mutation, fitness, breeding or autonomous evolution | `REQ-11`, `REQ-12` | Remains rejected. |
| Tokenization, NFT, ownership economics, royalties, marketplace or on-chain storage | `REQ-11`, `REQ-12` | Remains rejected; no CEO escalation while excluded. |
| Replacement of Agent, Workforce, Workflow or Runtime Core | `REQ-01`, `REQ-07`, `REQ-09`, `REQ-12` | Blocker and architecture escalation. |
| Replacement of Evidence, Economics, persistence or Product API | `REQ-09`, `REQ-10`, `REQ-12` | Blocker and architecture escalation. |
| Provider-owned Agent or OpenClaw-owned Automation/schedules | `REQ-01`, `REQ-08`, `REQ-09`, `REQ-12` | Remains rejected. |
| Raw credentials in Agent, Profile, history or API | `REQ-03`, `REQ-05`, `REQ-10`, `REQ-12` | Remains rejected. |
| Profile or badges granting operational capability | `REQ-02`, `REQ-04`, `REQ-11`, `REQ-12` | Remains rejected. |
| Unrelated global UI redesign | `REQ-10`, `REQ-12` | Remains rejected. |

## 4. Coverage result

```text
Capability dispositions mapped: 76 / 76
Unmapped dispositions: 0
Implementation authority: NONE
```
