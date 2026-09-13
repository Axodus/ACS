# REQ-04 Evidence and Inventory

| Class | Evidence | Implemented conclusion | Gap |
| --- | --- | --- | --- |
| Role | `GovernedRoleRevisionV2`; `acs_governed_role_revisions`; Native repository methods/tests | Exact fingerprinted revisions, CAS-like expected head, predecessor, provenance and PostgreSQL history are proven | Generic resource abstraction is not implied |
| Legacy Profile preset | `GovernedProfileResource`; `AgentService.compose` | Static revisioned-looking capability preset contributes capability IDs | No durable lineage; conflicts with presentation Profile |
| Skill | `GovernedSkillResource`, `CompositionResourceRegistry` | Static ID/revision/source/capability metadata and Product API reads | No fingerprint, predecessor, durable history or governed mutation |
| Tool | `GovernedToolResource`, Product API/tool composition | Static ID/revision/source/capability metadata | Availability is not permission; no durable catalog history/invocation contract |
| Capability | `ACS_CAPABILITIES`, `GovernedCapabilityResource` | Known static definitions and metadata | Current legacy effective union can be mistaken for a grant; no revision history |
| MCP | `AgentRevisionV2.resources.mcp_server_refs`; `RedHatMcpAdapter` | Exact resource-ref slot exists; one adapter is planning-only and execution-blocked | No canonical MCP server catalog, revision history or endpoint/transport contract |
| Provider | `ModelProviderRegistry`, `ModelProvider` | Provider owns discovery, model listing, health and capabilities | Dynamic observations are not immutable catalog revisions |
| Model | `ModelDefinition`, `createCanonicalModelId` | Provider-neutral identity is `providerId/modelId`; metadata and capabilities are exposed | No durable model revision/fingerprint/history |
| Agent binding | `AgentRevisionV2.resources` and `runtime_preferences` | Skill/Tool/MCP use exact `RevisionRef`; provider/model requirements currently use `EntityRef` | Model/provider exact historical semantics need adaptation |
| Execution | accepted REQ-03; `ExecutionBindingV2` | Admission selects provider/model/resources and captures policy/capability Evidence | Full typed effective snapshot remains candidate |

The current static catalog `revision` integer is a compatibility signal, not
proof of immutable historical readability. A resource is snapshot-eligible only
when its exact content can be reconstructed or the snapshot captures a verified
immutable representation and provenance under an accepted contract.
