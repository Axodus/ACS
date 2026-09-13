# EPIC-17 Capability Inventory

**Status:** `EVIDENCE REVIEW COMPLETE`
**Interpretation:** classifications authorize planning only

## 1. Inventory method

Each row records the strongest classification supported by current repository
evidence. `NEW` records a missing capability boundary only and does not select
an aggregate, schema, API, table, service or implementation.

## 2. Administration and capability catalogs

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Administration domain | `.design/app-standalone/src/domains/administration/Administration.tsx`; Product API system/admin projections | Existing surface combines readiness, governance and configuration visibility; no EPIC-17 ownership contract | `EXTEND` | REQ may define Administration ownership and additive modules. |
| Global Settings | Current configuration is distributed across environment, governance, provider, runtime and readiness services | No canonical global-settings contract or universal override semantics | `NEW` | REQ must test Administration/Control Plane policy/configuration as owner before persistence is proposed. |
| Model catalog | `ModelDefinition`, `ModelProvider`, `ModelStrategy` in `src/intelligence/model-provider.ts`; `GET /api/v1/models` | Catalog is provider-backed; administrative lifecycle/history and default ownership are not established | `ADAPT` | Preserve provider-neutral IDs and define only missing governance/projection semantics. |
| Skills | `GovernedSkillResource` and `CompositionResourceRegistry` in `src/control-plane/composition-resources.ts`; Product API skill routes | Current registry is process-local and does not prove durable revision history, input/output contracts or provenance completeness | `ADAPT` | REQ may extend the governed resource owner rather than embed skills in Agents. |
| Tools | `GovernedToolResource`; Native Agent `tool_refs`; Product API tool routes | Durable catalog/history is not demonstrated | `EXTEND` | Keep tool references canonical and evaluate additive catalog durability with Skills. |
| Capabilities | Native Agent `capability_requirements`; `GovernedCapabilityResource`; Agent composition resolution | Catalog and requirements exist; grant/require/present semantics need sharper separation | `EXTEND` | REQ must preserve the current owner while defining capability truth and authority checks. |
| Connector definition | Existing provider, tool, MCP server and credential concepts | No distinct Connector contract; adding one may duplicate existing abstractions | `ADAPT` | REQ must prove an integration-definition gap and map it to existing owners before proposing `NEW`. |
| Connection | `CredentialConnection` and `CredentialConnectionRegistry` under `src/intelligence/` | Production/shared ownership varies by configured provider; ordinary API responses must remain secret-free | `REUSE` | Reuse connection identity and lifecycle; document any required shared-state gap. |
| Credentials and secrets | `SecretReference`, `CredentialLease`, secret providers and Vault boundary | Raw values must never enter Agent/profile/history/API state | `REUSE` | Preserve opaque references, scope, leases, rotation and revocation. |
| Channels | Only specific source/channel fields and UI vocabulary exist; no generic Channel domain was found | Connector, external destination and interaction channel semantics are not defined | `NEW` | REQ may define ownership and references without assuming persistence or an aggregate. |
| Runtime/system configuration | Provider, engine, target and readiness contracts already own runtime facts | Configuration is distributed; `runtime_configuration` is not a complete typed policy model | `EXTEND` | REQ may define typed resolution references while preserving current owners. |

## 3. Agent identity, presentation and behavior

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Agent identity | `AgentDefinitionV2` in `src/native-core/agent.ts` | No identity gap; older Control Plane model remains a compatibility seam | `REUSE` | Extend the Native Agent path only after the seam is documented by REQ. |
| Agent lifecycle | `NativeAgentStatus`; Product API lifecycle routes | Current draft/active/disabled/archived semantics are canonical | `REUSE` | No parallel lifecycle. |
| Agent revisions | `AgentRevisionV2`, `fingerprintAgentRevisionV2`, `createAgentRevisionV2` | No second revision stream is justified | `REUSE` | Bind future operational state by exact references or explicitly approved companion ownership. |
| Agent lineage/history | `advanceAgentLineage` and `getAgentLineage` in shared Native Core state; `acs_agents`/`acs_agent_history` | Compatibility projections coexist, but durable Native lineage is implemented | `REUSE` | Preserve append-only history, CAS, events, outbox and restart reconstruction. |
| Canonical name, role and mission | Definition name plus revision `role_ref` and `instructions` | Original “identity statement/mission” split is not represented as a distinct contract | `EXTEND` | REQ must decide whether these are revision-bearing semantics without creating another identity. |
| Profile | `GovernedProfileResource`; legacy Agent profile ID/revision; Product API profile routes | No durable profile lineage is proven; profile capabilities currently influence effective capabilities | `ADAPT` | REQ must separate presentation from operational grants and decide revision ownership. |
| Avatar/profile asset | `ArtifactReferenceV2` supplies storage reference, digest and sensitivity for Evidence artifacts | Evidence artifact ownership does not prove a reusable profile-asset catalog | `NEW` | REQ may compare reuse of artifact references with a bounded presentation-asset reference. |
| Headline, bio and description | Generic profile metadata can carry values but no typed canonical fields exist | Ownership, visibility and revision semantics are absent | `NEW` | Consider typed presentation fields only after Profile ownership is frozen. |
| Persona | Native Agent revision has `role_ref`, `instructions`, constraints and policies | No structured persona contract; provider prompt must not become canonical truth | `EXTEND` | REQ may define structured behavior inside or referenced from canonical Agent revision semantics. |
| Custom instructions | Native Agent revision already has `instructions` | A free-form field exists but cannot replace structured semantics | `REUSE` | Retain as one controlled component of a future structured persona decision. |
| Model preferences | Native Agent `runtime_preferences.model_requirements`; legacy `AgentModelStrategy` | Two generations of representation require reconciliation | `ADAPT` | REQ must extend the canonical Native Agent path and preserve provider neutrality. |
| Skill bindings | Native Agent `resources.skill_refs`; legacy skill IDs | Exact revision refs exist in Native Core; catalog durability is incomplete | `REUSE` | Preserve references; improve catalog/history only through its owner. |
| Connector permissions | Agent governance and resource refs plus credential connection IDs in legacy composition | No canonical connector permission type exists | `ADAPT` | Express permissions through governance and connection references; prove any new contract need. |
| Channel permissions | Governance policy refs exist; Channel does not | Permission cannot be designed before Channel ownership | `NEW` | Defer representation to Channel and governance REQs. |
| Memory policy | Native Agent revision has `knowledge.memory_policy_ref` | Referenced policy/store is not implemented as a canonical domain | `NEW` | Define policy ownership and resolution in a later REQ; retain the existing reference boundary. |
| Displayed skills | Profile metadata exists; operational Skills are governed resources | Displayed capability cannot create operational truth; current profile capability contribution conflicts with this goal | `ADAPT` | REQ must define a presentation projection sourced from canonical Skill bindings. |
| Badges | UI has generic visual badges; Evidence supports proofs | No domain badge contract or verification semantics | `NEW` | REQ may define decorative metadata and evidence-linked verification separately. |
| Historically reconstructable behavior | Agent revisions, runtime bindings, policy snapshots and execution intents exist | Profile/persona/catalog history and typed effective configuration remain incomplete | `EXTEND` | Define missing references and snapshot rules per configuration class. |

## 4. Memory

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Working Memory | Runtime state and checkpoints already exist and must remain distinct | No separate working-memory policy/store contract | `NEW` | REQ must decide whether a separate capability is needed without relabeling runtime state. |
| Agent Memory | Native Agent references a memory policy | No storage, retention, retrieval or deletion owner | `NEW` | REQ defines authority and isolation before any store proposal. |
| Workforce Shared Memory | Workforce v1 explicitly excludes mutable shared memory from its core | No accepted companion owner | `NEW` | Any proposal must remain outside Workforce Core and reference exact Workforce/Run context. |
| User/context Memory | Tenant and execution context exist | No canonical user-memory ownership or privacy lifecycle | `NEW` | REQ must establish owner, consent, scope and deletion boundaries. |
| Knowledge Memory | Agent knowledge scope refs exist; institutional knowledge remains externally owned | Memory must not become a duplicate knowledge base | `ADAPT` | Use provenance-bearing knowledge references and define retrieval policy only. |
| Historical/episodic Memory as an alias for Evidence/history | Events, Evidence and history exist | Those records are proof/history, not mutable Agent memory | `REJECT` | REQ may define a derived retrieval view but cannot relabel Evidence/event history as Memory truth. |

## 5. Delegation and Workforce

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Agent-to-Agent delegation | Legacy `canSpawnSubAgents`/`subAgentScope` are descriptive; Run/Task/Assignment exist | No canonical delegation authority relationship or history | `NEW` | REQ determines representation, revision ownership and audit semantics. |
| Delegation permissions | Governance policy/approval refs and Workforce authority constraints exist | No delegation-specific attenuation contract | `NEW` | Reuse governance authority; define only delegation-specific constraints. |
| Depth/recursion policy | No canonical contract found | Runtime safety requires a bound before delegation execution | `NEW` | REQ defines deterministic rejection and historical evidence. |
| Delegation history | Events/Evidence can record activity | No delegation-specific subject/reference contract | `ADAPT` | Reuse Evidence/events after a REQ defines the relationship identity. |
| Sub-Agent identity | Native Agent already supplies canonical identity | A second identity would fork lineage and authority | `REJECT` | Every delegated target remains an existing canonical Agent. |
| Workforce | `WorkforceDefinitionV2`, `WorkforceRevisionV2`, `WorkforceMemberV2` | No EPIC-17 ownership gap | `REUSE` | Delegation/Automation may reference or feed admission only. |
| Workforce membership and Run admission | `WorkforceRunMembershipV2` freezes Agent revisions at admission | No incompatible change is justified | `REUSE` | Preserve selectors, membership snapshots and exact revision binding. |

## 6. Automation and execution

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Automation domain | Automation is reported as disabled/manual/blocked in capability, policy and Product API readiness surfaces | No canonical Automation contract, owner or history | `NEW` | REQ decides domain ownership before aggregate identity or persistence. |
| Automation identity and revisions | No canonical contract found | Independent identity/revision necessity is unproven | `NEW` | Treat aggregate identity/revision as a REQ decision, not a review conclusion. |
| Automation lifecycle | Existing lifecycle patterns are domain-specific | No Automation lifecycle is implemented | `NEW` | REQ derives states from operational needs and authority, without copying Agent lifecycle. |
| Scheduled Tasks | Native Task is execution work, not a schedule definition | A “scheduled task” type would risk conflating activation with execution | `NEW` | Define schedule/activation semantics separately and target existing Task/Run admission. |
| Triggers | No canonical trigger contract found | Provider-specific triggers cannot own ACS activation truth | `NEW` | REQ defines normalized trigger observations and idempotent activation. |
| Schedules | Execution targets expose `schedulingEligible`, but no canonical schedule exists | Eligibility is not schedule ownership | `NEW` | REQ tests whether schedule identity/version is required and who evaluates due work. |
| Target resolution | Workflow/Run/Workforce and execution target contracts exist | Automation-specific target selection is absent | `ADAPT` | Reuse canonical references and admission; reject opaque provider-owned targets. |
| Execution policies | Agent, Workforce and Runtime carry policy refs and snapshots | Precedence differs by policy class | `REUSE` | Use the precedence matrix and preserve attenuation. |
| Idempotent activation | Native idempotency, event/outbox and durable job patterns exist | No activation key or transaction boundary is defined | `EXTEND` | REQ may add activation semantics through existing infrastructure. |
| Retry and concurrency | Durable runtime jobs, leases, fencing and retry/recovery exist | Trigger retry versus execution retry is not separated | `ADAPT` | REQ defines activation retry while execution continues using runtime ownership. |
| Automation history | Durable events, Evidence and Run history exist | No Automation subject/reference exists | `ADAPT` | Reuse history infrastructure after identity/subject semantics are decided. |
| Recovery/restart | Durable runtime recovery exists | Scheduler/activation recovery is not implemented | `EXTEND` | REQ defines due-work reconciliation without creating a second execution recovery system. |
| Run linkage | Run/Task/Assignment/Attempt and execution intent contracts exist | Activation correlation is absent | `EXTEND` | Add provenance/correlation proposals only after Automation semantics are frozen. |
| Workflow target | Workflow is already a coordination definition | Automation must not embed or replace workflow semantics | `REUSE` | Reference exact Workflow/version where supported. |
| Run/Task/Assignment/Attempt | `src/native-core/runtime.ts` and durable Native Core state | No EPIC-17 ownership gap | `REUSE` | All execution continues through these contracts. |

## 7. Runtime, Evidence, Economics and application

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Runtime resolution | `ExecutionBindingV2`, policy snapshots and `RuntimeExecutionIntentV2` preserve exact execution context | Effective configuration is not fully typed by EPIC-17 classes | `EXTEND` | REQ may define typed references/snapshots without replacing runtime compilation. |
| OpenClaw execution | `OpenClawEngineAdapter` implements `AgentEngine` and maps ACS requests to engine protocol | No Automation-specific operation exists; adapter must remain non-canonical | `ADAPT` | Add only a bounded adapter proposal after Automation and admission contracts. |
| Codex/alternative runtime compatibility | `AgentEngine`, `AgentRunner`, provider and target interfaces are provider-neutral | Provider-specific feature parity is not proven | `REUSE` | Resolve through existing interfaces and capability checks. |
| Evidence | `EvidenceRecordV2` with decision, approval, artifact, source and trace references | New subject kinds may be needed after domain identities are decided | `REUSE` | Extend references only when a REQ proves insufficiency. |
| Provenance | Runtime intent provenance, SourceReference and event correlation exist | Profile/persona/trait source semantics are not frozen | `REUSE` | Attach future state to existing provenance mechanisms. |
| Usage and Cost | `CostRecordV2`, usage attribution and economic snapshot refs exist | Automation activation cost attribution is not defined | `REUSE` | REQ may add correlation; no new Cost authority. |
| Economics | `EconomicService` and shared economic state own quote/reserve/usage/settlement semantics | Genome rights and marketplace economics are absent and unauthorized | `REUSE` | Use current budget/cost policy references; reject Genome economics. |
| Events/outbox/idempotency | Native durable commands and shared state already compose these concerns | New domains must participate in the same transaction rules | `REUSE` | Later REQs specify integration, not replacement. |
| PostgreSQL shared state | Existing Agent/Workforce/runtime/economic repositories use shared authority | No second database or lineage service is justified | `REUSE` | Any future persistence proposal must be additive and separately authorized. |
| Product API | Existing `/api/v1` routes expose Agent, catalogs, Workforce, runtime, Evidence and Economics | EPIC-17 domain projections do not exist | `EXTEND` | Later REQs inventory additive resources under the existing API. |
| Control Plane | Existing shell has Agents, Workforces, Runtime, Administration and compatibility routes | No Automations domain and no proven complete Memory/Admin configuration UX | `EXTEND` | Later UX consumes Product API only and follows existing IA. |
| Tenant isolation | Scope and tenant checks exist across Native Core and Product API | Every future reference needs explicit visibility and mutation authority | `REUSE` | Preserve fail-closed cross-tenant behavior. |
| Security | secret scanning, governed references, trusted context and production gates exist | New domains create no implicit authority | `REUSE` | Apply existing gates and add domain-specific negative cases later. |

## 8. Genome compatibility

| Proposed capability | Evidence and current owner | Gap or contradiction | Classification | Permitted next step |
| --- | --- | --- | --- | --- |
| Trait classification | Canonical state is revisioned and provenance-capable; no trait contract exists | Trait identity, vocabulary and owner are undecided | `NEW` | REQ may define descriptive classification over accepted canonical references. |
| Lineage-ready identity | Native Agent identity and revision lineage already exist | Genome must not create a competing lineage | `REUSE` | Reference Agent and exact revision. |
| Historical reconstruction | Agent/Workforce lineage, runtime bindings, Evidence and Cost history exist | Profile/persona/catalog gaps remain | `EXTEND` | Fill only proven reference/history gaps through current owners. |
| Evidence association | Native Evidence subject refs exist | Trait-specific evidence mapping is not defined | `ADAPT` | Use evidence references after trait semantics are accepted. |
| Future representation compatibility | Stable references and fingerprints exist | No final Genome representation is authorized | `NEW` | Record constraints only; do not create a schema or token. |
| Performance history | Runs, Evidence, Usage and Cost provide source records | Derived fitness/reputation would exceed current semantics | `ADAPT` | Permit evidence-backed views only; reject authority or fitness claims. |

## 9. Rejected scope

The following original proposals are `REJECT` for EPIC-17:

- final Agent DNA or Genome schema;
- genetic inheritance or crossover;
- mutation engines;
- fitness algorithms or autonomous genetic optimization;
- Agent breeding or evolution;
- Genome tokenization or NFT minting;
- Genome ownership economics, royalties or marketplace;
- on-chain Genome storage or secondary-market mechanics;
- new blockchain/protocol work;
- replacement of Agent Core, Workforce Core, Workflow/Coordination or Runtime
  Core;
- replacement of Evidence, Usage/Cost, Economics, shared persistence or
  Product API;
- provider-owned canonical Agent identity;
- OpenClaw-owned canonical Automation or schedules;
- raw credentials in Agent/profile/history/API state;
- profile or badges granting operational capabilities;
- unrelated global UI redesign.
