# EPIC-17 Capability-to-REQ Matrix

**Status:** `COMPLETE / 76 OF 76 DISPOSITIONS MAPPED`
**Authority:** planning traceability only
**Implementation authority:** none

## 1. Mapping rule

The IDs below stabilize the order and names in
[Capability Inventory](capability-inventory.md). Each capability has one primary
REQ owner. Cross-cutting conformance remains the responsibility of
`EPIC-17-REQ-12`, and `REUSE`/`REJECT` rows act as invariants rather than
feature authorization.

## 2. Complete mapping

| ID | Capability | Review class | Primary REQ | Planning role |
| --- | --- | --- | --- | --- |
| `E17-C01` | Administration domain | `EXTEND` | `REQ-10` | Domain-driven projection |
| `E17-C02` | Global Settings | `NEW` | `REQ-10` | Owner decision by configuration class |
| `E17-C03` | Model catalog | `ADAPT` | `REQ-03` | Preserve provider-neutral catalog |
| `E17-C04` | Skills | `ADAPT` | `REQ-03` | Governed resource history |
| `E17-C05` | Tools | `EXTEND` | `REQ-03` | Additive catalog decision |
| `E17-C06` | Capabilities | `EXTEND` | `REQ-03` | Separate requirement, grant and display |
| `E17-C07` | Connector definition | `ADAPT` | `REQ-03` | Prove distinct responsibility |
| `E17-C08` | Connection | `REUSE` | `REQ-03` | Preserve connection owner |
| `E17-C09` | Credentials and secrets | `REUSE` | `REQ-03` | Preserve opaque references and leases |
| `E17-C10` | Channels | `NEW` | `REQ-03` | Establish owner before representation |
| `E17-C11` | Runtime/system configuration | `EXTEND` | `REQ-02` | Class-specific effective snapshot |
| `E17-C12` | Agent identity | `REUSE` | `REQ-01` | Preserve canonical Native identity |
| `E17-C13` | Agent lifecycle | `REUSE` | `REQ-01` | Preserve current lifecycle |
| `E17-C14` | Agent revisions | `REUSE` | `REQ-01` | Preserve immutable revisions |
| `E17-C15` | Agent lineage/history | `REUSE` | `REQ-01` | Preserve durable lineage and CAS |
| `E17-C16` | Canonical name, role and mission | `EXTEND` | `REQ-01` | Decide revision-bearing semantics |
| `E17-C17` | Profile | `ADAPT` | `REQ-01` | Resolve presentation/capability conflict |
| `E17-C18` | Avatar/profile asset | `NEW` | `REQ-01` | Decide bounded presentation reference |
| `E17-C19` | Headline, bio and description | `NEW` | `REQ-01` | Decide Profile ownership and revision |
| `E17-C20` | Persona | `EXTEND` | `REQ-01` | Structure behavior without new Agent model |
| `E17-C21` | Custom instructions | `REUSE` | `REQ-01` | Preserve controlled free-form component |
| `E17-C22` | Model preferences | `ADAPT` | `REQ-03` | Reconcile Native and legacy references |
| `E17-C23` | Skill bindings | `REUSE` | `REQ-03` | Preserve exact resource revisions |
| `E17-C24` | Connector permissions | `ADAPT` | `REQ-03` | Reuse governance and connection refs |
| `E17-C25` | Channel permissions | `NEW` | `REQ-03` | Follow Channel and governance ownership |
| `E17-C26` | Memory policy | `NEW` | `REQ-04` | Preserve existing policy reference seam |
| `E17-C27` | Displayed skills | `ADAPT` | `REQ-01` | Derive presentation from canonical bindings |
| `E17-C28` | Badges | `NEW` | `REQ-01` | Separate decorative and verified semantics |
| `E17-C29` | Historically reconstructable behavior | `EXTEND` | `REQ-02` | Freeze effective historical configuration |
| `E17-C30` | Working Memory | `NEW` | `REQ-04` | Keep distinct from runtime state |
| `E17-C31` | Agent Memory | `NEW` | `REQ-04` | Establish authority and lifecycle |
| `E17-C32` | Workforce Shared Memory | `NEW` | `REQ-04` | Companion boundary outside Workforce Core |
| `E17-C33` | User/context Memory | `NEW` | `REQ-04` | Define consent, privacy and deletion |
| `E17-C34` | Knowledge Memory | `ADAPT` | `REQ-04` | Reuse provenance-bearing knowledge refs |
| `E17-C35` | Historical/episodic Memory as an alias for Evidence/history | `REJECT` | `REQ-04` | Negative boundary gate |
| `E17-C36` | Agent-to-Agent delegation | `NEW` | `REQ-05` | Define bounded relationship |
| `E17-C37` | Delegation permissions | `NEW` | `REQ-05` | Define attenuation over governance |
| `E17-C38` | Depth/recursion policy | `NEW` | `REQ-05` | Define cycle/depth rejection |
| `E17-C39` | Delegation history | `ADAPT` | `REQ-05` | Reuse events and Evidence references |
| `E17-C40` | Sub-Agent identity | `REJECT` | `REQ-05` | Negative identity gate |
| `E17-C41` | Workforce | `REUSE` | `REQ-05` | Preserve Workforce v1 |
| `E17-C42` | Workforce membership and Run admission | `REUSE` | `REQ-05` | Preserve exact admitted revisions |
| `E17-C43` | Automation domain | `NEW` | `REQ-06` | Establish owner before aggregate choice |
| `E17-C44` | Automation identity and revisions | `NEW` | `REQ-06` | Decide necessity and ownership |
| `E17-C45` | Automation lifecycle | `NEW` | `REQ-06` | Derive domain-specific states |
| `E17-C46` | Scheduled Tasks | `NEW` | `REQ-07` | Separate schedule from Task execution |
| `E17-C47` | Triggers | `NEW` | `REQ-07` | Normalize external observations |
| `E17-C48` | Schedules | `NEW` | `REQ-07` | Establish evaluation and version owner |
| `E17-C49` | Target resolution | `ADAPT` | `REQ-06` | Reference canonical targets |
| `E17-C50` | Execution policies | `REUSE` | `REQ-02` | Preserve class-specific attenuation |
| `E17-C51` | Idempotent activation | `EXTEND` | `REQ-07` | Reuse shared transaction patterns |
| `E17-C52` | Retry and concurrency | `ADAPT` | `REQ-07` | Separate activation and execution retry |
| `E17-C53` | Automation history | `ADAPT` | `REQ-07` | Reuse history after identity decision |
| `E17-C54` | Recovery/restart | `EXTEND` | `REQ-07` | Reconcile due work without runtime fork |
| `E17-C55` | Run linkage | `EXTEND` | `REQ-07` | Add activation correlation |
| `E17-C56` | Workflow target | `REUSE` | `REQ-06` | Preserve Workflow ownership |
| `E17-C57` | Run/Task/Assignment/Attempt | `REUSE` | `REQ-06` | Preserve execution machinery |
| `E17-C58` | Runtime resolution | `EXTEND` | `REQ-02` | Type effective snapshot references |
| `E17-C59` | OpenClaw execution | `ADAPT` | `REQ-08` | Keep replaceable executor adapter |
| `E17-C60` | Codex/alternative runtime compatibility | `REUSE` | `REQ-08` | Preserve provider-neutral interfaces |
| `E17-C61` | Evidence | `REUSE` | `REQ-09` | Preserve Evidence authority |
| `E17-C62` | Provenance | `REUSE` | `REQ-09` | Extend only proven references |
| `E17-C63` | Usage and Cost | `REUSE` | `REQ-09` | Add correlation without new owner |
| `E17-C64` | Economics | `REUSE` | `REQ-09` | Reject Genome economic semantics |
| `E17-C65` | Events/outbox/idempotency | `REUSE` | `REQ-08` | Reuse shared transaction rules |
| `E17-C66` | PostgreSQL shared state | `REUSE` | `REQ-08` | Reject parallel persistence |
| `E17-C67` | Product API | `EXTEND` | `REQ-10` | Add domain-owned projections only |
| `E17-C68` | Control Plane | `EXTEND` | `REQ-10` | Consume Product API projections |
| `E17-C69` | Tenant isolation | `REUSE` | `REQ-09` | Preserve fail-closed scope |
| `E17-C70` | Security | `REUSE` | `REQ-09` | Add domain-specific negative cases |
| `E17-C71` | Trait classification | `NEW` | `REQ-11` | Define descriptive vocabulary |
| `E17-C72` | Lineage-ready identity | `REUSE` | `REQ-11` | Reference canonical Agent revisions |
| `E17-C73` | Historical reconstruction | `EXTEND` | `REQ-11` | Reference accepted history sources |
| `E17-C74` | Evidence association | `ADAPT` | `REQ-11` | Map traits to Evidence references |
| `E17-C75` | Future representation compatibility | `NEW` | `REQ-11` | Record constraints without schema commitment |
| `E17-C76` | Performance history | `ADAPT` | `REQ-11` | Evidence-backed view without fitness claim |

## 3. Rejected-scope traceability

| Rejected scope family | Guard REQ | Required disposition |
| --- | --- | --- |
| Final DNA/Genome schema; inheritance; crossover; mutation; fitness; breeding; autonomous evolution | `REQ-11`, `REQ-12` | Remains rejected; a vocabulary cannot become an evolution engine. |
| Tokenization, NFT minting, ownership economics, royalties, marketplace, on-chain storage and secondary market | `REQ-09`, `REQ-11`, `REQ-12` | Remains rejected; no CEO escalation is required because it stays out of scope. |
| New blockchain or protocol work | `REQ-11`, `REQ-12` | Remains rejected. |
| Replacement of Agent, Workforce, Workflow/Coordination or Runtime Core | `REQ-01`, `REQ-05`, `REQ-06`, `REQ-08`, `REQ-12` | Blocker and architecture escalation. |
| Replacement of Evidence, Usage/Cost, Economics, persistence or Product API | `REQ-08`, `REQ-09`, `REQ-10`, `REQ-12` | Blocker and architecture escalation. |
| Provider-owned Agent identity or OpenClaw-owned Automation/schedules | `REQ-01`, `REQ-06`, `REQ-07`, `REQ-08`, `REQ-12` | Remains rejected. |
| Raw credentials in Agent, Profile, history or API state | `REQ-02`, `REQ-03`, `REQ-10`, `REQ-12` | Remains rejected. |
| Profile or badges granting operational capability | `REQ-01`, `REQ-03`, `REQ-12` | Remains rejected. |
| Unrelated global UI redesign | `REQ-10`, `REQ-12` | Remains rejected. |

## 4. Coverage result

```text
Capability dispositions mapped: 76 / 76
Unmapped dispositions: 0
Rejected scope families mapped: 9 / 9
Implementation authority: NONE
```
