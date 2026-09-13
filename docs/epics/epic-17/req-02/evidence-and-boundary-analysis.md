# REQ-02 Evidence and Boundary Analysis

## 1. Repository evidence

| Concern | Repository evidence | Finding |
| --- | --- | --- |
| Canonical Agent identity/head | `AgentDefinitionV2` in `src/native-core/agent.ts` | `agent_id` owns identity; `name` is current head state. No Profile identity exists. |
| Canonical behavior | `AgentRevisionV2` in `src/native-core/agent.ts` | `role_ref`, `instructions`, `constraints`, governance, resources and policies are immutable fingerprinted behavior. |
| Legacy Profile resource | `GovernedProfileResource` in `src/control-plane/composition-resources.ts` | Static catalog record with ID, integer revision, display name, status, `capabilityIds` and generic metadata. |
| Legacy effective composition | `AgentService.compose` in `src/control-plane/agent-service.ts` | Profile capability IDs are unioned with Agent and Role capability IDs. |
| Legacy Agent binding | `AgentDefinition.profileId/profileRevision` in `src/control-plane/unified-agent-model.ts` | Legacy revision pins a Profile ID/revision but carries no presentation semantics. |
| Profile validation | `CompositionResourceRegistry.validateReferences` | Validates static ID/revision equality; it does not prove durable Profile lineage. |
| Product API Profile surface | `ProfileSummary`, `listProfiles`, `getProfileDetail` and `#profileSummary` in `src/control-plane/product-api-client.ts` | Read-only summary returns empty description and synthesized OpenClaw compatibility/section values. |
| HTTP surface | `GET /api/v1/profiles` and `GET /api/v1/profiles/:profileId` in `src/http/routes/product-api-routes.ts` | Product API exposes catalog reads; Profile mutations are unsupported. |
| Role history comparison | `GovernedRoleRevisionV2` in `src/control-plane/governed-role-history.ts` | A fingerprinted Native Role revision exists; no equivalent Profile history contract was found. |
| Operational evidence | `tests/agent-crud-composition.test.mjs` | Executable legacy behavior proves Profile-derived capability contribution. |
| API evidence | `tests/s25-composition.test.mjs` | Executable API behavior proves one static Profile projection and unsupported composition mutations. |
| Presentation discipline | `docs/epics/epic-14/architecture.md`; `docs/epics/epic-14/contracts.md` | Presentation may not promote inferred state into authority; badges and visual status remain bounded. |
| Artifact/provenance primitives | `ArtifactReferenceV2` and `SourceReferenceV2` in `src/native-core/evidence.ts` | Existing references can identify retained artifacts and sources, but do not establish a reusable Profile-asset owner. |

## 2. Four-way separation

| Class | Canonical owner | Included meaning | Excluded meaning |
| --- | --- | --- | --- |
| Identity | `AgentDefinitionV2` | Stable `agent_id`, scope and ownership; current display name remains head state | Persona name, provider ID, Profile ID, avatar or handle as Agent identity |
| Behavioral semantics | `AgentRevisionV2` | Role reference, instructions, constraints, resource requirements, governance and policies | UI copy, avatar, badge, provider prompt or independently mutable Persona identity |
| Presentation | Derived Product API/Application projection sourced from canonical Agent state | Display label, optional headline/bio/description, displayed resources and future asset references | Capability, permission, credential, policy decision, readiness or verified claim by implication |
| Operational capability | Governed capability/resource and governance owners, resolved in later REQs | Requirements, admitted bindings and evidence of executor/target support | Profile text, Persona label, displayed skill, badge or decorative metadata as a grant |

## 3. Semantic collisions

The term `profile` currently names at least four unrelated concepts:

1. `GovernedProfileResource`, a legacy capability-bearing composition preset;
2. a Product API summary presented as an OpenClaw-compatible profile;
3. deployment adapter profiles such as `development` and `production`;
4. the proposed Agent-facing presentation Profile.

Only item 4 belongs to REQ-02 presentation semantics. Adapter profiles retain
their existing configuration meaning. The legacy composition preset remains a
governed-resource compatibility concern for REQ-04. Neither may be inferred to
be an Agent presentation Profile.

## 4. Evidence limits

The repository does not prove:

- a canonical Profile aggregate or stable Profile identity;
- durable Profile revisions, predecessor chain, fingerprint or CAS;
- typed headline, bio, description, avatar or presentation-visibility fields;
- a Persona contract independent of Agent revision;
- a canonical reusable profile-asset catalog;
- verified badges or reputation semantics;
- historically reconstructable Agent head/presentation state.

These absences constrain later contract proposals. They do not authorize a
table, service, endpoint, aggregate or migration.
