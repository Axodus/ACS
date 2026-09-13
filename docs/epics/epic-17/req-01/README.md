# EPIC-17-REQ-01 — Canonical Agent Seam & Identity Boundary

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `08b9355c41c635910bade3700f81c03d36c8db50`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## 1. Mission result

REQ-01 resolves the ownership seam without creating another Agent model:

```text
canonical semantic contract
  = AgentDefinitionV2 + AgentRevisionV2

canonical durable authority
  = AsyncNativeCoreRepository
    backed by shared PostgreSQL native_v2 lineage

Product API Agent shape
  = application compatibility projection

legacy AgentDefinition / AgentRevision / AgentService
  = legacy compatibility surface
```

The Native Agent identity, lifecycle vocabulary, immutable revisions,
fingerprints and lineage remain authoritative. Provider, executor, model,
prompt, runtime and application representations are references or projections;
none can become Agent identity.

## 2. Required invariants

```text
One canonical Agent identity.
One canonical revision and lineage authority.

Legacy representation != second Agent model.
Executor representation != canonical Agent.
Provider prompt/config != canonical Agent.
GenomeAgent and SubAgent identity types are rejected.
```

## 3. Deliverables

| Deliverable | Document |
| --- | --- |
| Canonical Agent ownership decision | [Canonical ownership](canonical-agent-ownership.md) |
| Native ↔ legacy seam map | [Seam map](native-legacy-seam-map.md) |
| Compatibility and deprecation rules | [Compatibility and deprecation](compatibility-and-deprecation.md) |
| Proposed contract deltas and candidate ADRs | [Contract deltas and ADRs](contract-deltas-and-adrs.md) |
| Decision record | [Decision record](decision-record.md) |
| REQ and future IMP acceptance criteria | [Acceptance gates](acceptance-gates.md) |

## 4. Evidence baseline

| Concern | Repository evidence | Finding |
| --- | --- | --- |
| Native identity and lifecycle | `src/native-core/agent.ts` | `AgentDefinitionV2` owns stable `agent_id`, scope, status, current revision, ownership and sharing. |
| Native behavior revision | `src/native-core/agent.ts` | `AgentRevisionV2` owns fingerprinted behavior, resources, runtime preferences, governance, economics, Evidence policy and commit provenance. |
| Durable lineage | `src/control-plane/shared-state/native-core-durable.ts` | `advanceAgentLineage` atomically advances the expected head, appends immutable history, event, outbox and idempotency result. |
| Durable reconstruction | `src/control-plane/shared-state/native-core-durable.ts` | `getAgentLineage` validates contiguous revisions, predecessors and head fingerprint. |
| Shared persistence | `src/control-plane/shared-state/migrations.ts` | `acs_agents` and `acs_agent_history` distinguish `native_v2` from `legacy`; native events/outbox/idempotency use the same PostgreSQL authority. |
| Native acceptance evidence | `tests/acs-v2-val-01-postgres.test.mjs`; `tests/acs-v2-imp-01b.test.mjs` | Restart reconstruction, idempotency, rollback, outbox recovery and concurrent CAS have executable evidence. |
| Legacy contract | `src/control-plane/unified-agent-model.ts` | `AgentDefinition` and `AgentRevision` are older camelCase composition/application contracts with different semantics. |
| Legacy service and repository | `src/control-plane/agent-service.ts`; `src/control-plane/shared-state/postgres-shared-state.ts` | Legacy create/update/archive/restore/delete and `record_kind='legacy'` persistence remain implemented. |
| Product API projection | `src/control-plane/product-api-client.ts` | Native reads project into the legacy Product API shape and disable all Native mutations. |
| Product API mutation seam | `src/control-plane/product-api-client.ts`; `src/http/routes/product-api-routes.ts` | Mutation methods still call `AgentService`; when Native Core is configured, read and write owners differ. |

## 5. Closure result

The canonical authority is unambiguous and all known representations have a
destination. Three contract/implementation gaps remain explicit:

1. Native Product API mutations do not yet route through the native lineage
   command.
2. historical reconstruction for head fields such as `name`, `status` and
   `sharing_mode` is not covered by the current revision fingerprint.
3. some deployment/readiness/composition paths still require the legacy
   `AgentService` representation.

These gaps block a future Agent-seam IMP until their accepted contract deltas
are implemented. They do not authorize a second identity, dual write or
destructive migration.

```text
EPIC-17-REQ-01
COMPLETE / READY FOR CTO ACCEPTANCE

EPIC-17-REQ-02
BLOCKED_BY_REQ-01_ACCEPTANCE

Implementation authority: NONE
```
