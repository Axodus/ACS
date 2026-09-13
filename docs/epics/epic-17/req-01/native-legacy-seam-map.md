# REQ-01 Native ↔ Legacy Agent Seam Map

## 1. Surface classification

| Surface | Current role | Classification | Destination |
| --- | --- | --- | --- |
| `src/native-core/agent.ts` | Native semantic contracts and validators | `CANONICAL` | Preserve as the only Agent identity/revision contract authority. |
| `AsyncNativeCoreRepository` Agent methods | Native lineage command/read interface | `CANONICAL` | Preserve as the only durable Native Agent command boundary. |
| `PostgresNativeCoreRepository` | `native_v2` head, history, event, outbox and idempotency transaction | `CANONICAL` | Preserve in shared PostgreSQL authority. |
| Product API Native read path | Maps Native Agent state into current application response shapes | `PROJECTION` | Keep bounded, explicit and loss-aware until a future accepted API contract evolves. |
| `#nativeAgentDefinition`, `#nativeAgentRevision`, lifecycle/revision summaries | Native-to-legacy-shape conversion | `ADAPTER` | Name and test as compatibility mapping; never use it as a canonical write input. |
| `src/control-plane/unified-agent-model.ts` Agent types | Older composition/application Agent shape | `LEGACY_COMPATIBILITY_SURFACE` | Retain only where current product/runtime compatibility requires it. |
| `AgentService` and `AgentRepository` | Legacy validation, composition and lifecycle mutations | `LEGACY_COMPATIBILITY_SURFACE` | Migrate callers to accepted Native commands before deprecation; do not dual-write. |
| `record_kind='legacy'` PostgreSQL rows | Durable legacy Agent state | `LEGACY_COMPATIBILITY_SURFACE` | Remain readable during explicit migration; never become Native history by relabeling. |
| `InMemoryAgentRepository` | Local/test legacy state | `DEPRECATED_CANDIDATE` for canonical use | May remain for legacy tests; forbidden as canonical production authority. |
| Provider/executor prompts and configs | Runtime materialization | `ADAPTER_OUTPUT` | Replaceable artifact only; never Agent identity or revision truth. |

## 2. Field mapping and loss analysis

| Native source | Current Product API/legacy target | Mapping quality | Consequence |
| --- | --- | --- | --- |
| `agent_id` | `agentId` | Exact rename | Identity remains canonical only when source is Native. |
| `scope` | No field in legacy `AgentDefinition` | Lossy | Product projection cannot reconstruct Tenant/authority scope from the legacy shape alone. |
| `name` | `name` | Exact current value | Historical name is not represented in `AgentRevisionV2`. |
| `status` | `status` | Exact current value | Native lifecycle is readable but Native mutations are disabled in the projection. |
| `current_revision` | `revision`/`currentRevisionId` | Exact integer | Fingerprint must still accompany historical operational references. |
| `ownership_ref`, `sharing_mode` | No legacy fields | Lossy | Legacy shape cannot establish ownership or sharing authority. |
| `role_ref` | `roleId` | Lossy | Entity kind and revision information are dropped by the current projection. |
| `instructions` | No legacy field | Lossy | Current Product API Agent definition cannot reconstruct instructions. |
| `capability_requirements` | `capabilityIds` | Lossy | Requirement references become untyped IDs and must not be read as grants. |
| `constraints` | No legacy field | Lossy | Canonical constraints are absent from the projection. |
| `knowledge` and Memory policy | No legacy field | Lossy | Downstream Memory work must use Native references, not the legacy shape. |
| Skill and Tool revision refs | `skillIds`, `toolIds` | Lossy | Revision and fingerprint are dropped. |
| MCP refs | No legacy field | Lossy | No MCP state can be inferred from the projection. |
| Runtime preferences | `runnerPreferences`; partial IDs | Lossy | Native provider/model/harness semantics are not equivalent to legacy `modelStrategy`. |
| Governance | `executionPolicyId` from permission policy ID | Lossy | Approval and authority references are omitted. |
| Economics and Evidence policy | No legacy fields | Lossy | Projection cannot authorize budget, settlement or Evidence behavior. |
| Commit provenance | `createdAt`, `updatedAt`, `createdBy` | Partial | `change_reason` and complete revision provenance are not preserved in the Agent definition shape. |

The mapper is suitable for current read compatibility only. It is not a
bidirectional contract and cannot be used to construct a complete Native
revision.

## 3. Read seam

`ProductApiClient.listAgents`, `getAgent`, `getAgentRevisions` and
`getAgentLifecycle` prefer `nativeCore` whenever it is configured. They project
Native Agent state into existing application types. Composition/readiness are
reported as unavailable where the Native projection lacks evidence, and Native
actions are explicitly disabled.

This is the accepted direction:

```text
Native canonical state -> bounded Product API projection -> Application
```

The Application remains non-authoritative and never imports Native Core or
reads PostgreSQL directly.

## 4. Write seam contradiction

The same `ProductApiClient` may receive both `agentService` and `nativeCore`.
Its Native read methods use `nativeCore`, while create, update, revision,
adopt/restore, archive/restore, duplicate and delete methods still call
`AgentService`.

```text
current read owner:  nativeCore
current write owner: legacy AgentService
```

This is a compatibility seam, not accepted dual authority. A future IMP must
route canonical Agent mutations through one Native command adapter or reject
unsupported mutations explicitly. It must not write both `legacy` and
`native_v2` records.

## 5. Persistence seam

The shared tables carry a `record_kind` discriminator. Native queries require
`record_kind='native_v2'`; legacy repositories require
`record_kind='legacy'`. The table primary key remains `agent_id`, so one ID
cannot safely represent both kinds at once.

This supports explicit coexistence during migration. It does not authorize
silent relabeling, dual write, competing heads or two canonical histories.
