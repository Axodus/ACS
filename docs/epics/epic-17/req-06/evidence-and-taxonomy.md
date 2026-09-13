# REQ-06 Evidence and Memory Taxonomy

## Implemented evidence

| Evidence | Current meaning | Boundary consequence |
| --- | --- | --- |
| `AgentRevisionV2.knowledge.memory_policy_ref` in `src/native-core/agent.ts` | Agent revisions already carry an exact policy reference in fingerprinted behavioral state | Reuse the reference seam; do not embed policy or Memory records in Agent |
| `allowed_scope_refs`, `denied_scope_refs` and `context_policy_ref` in `src/native-core/agent.ts` | Knowledge/context access is already expressed through scoped references | Memory scope must reconcile with, and cannot widen, these constraints |
| `ExecutionContextV2`, `RunV2`, `TaskV2` and `CheckpointV2` in `src/native-core/runtime.ts` | Runtime state, restart state, leases, attempts and policy snapshots already have canonical owners | Working Memory cannot replace or redefine operational recovery truth |
| `RuntimeExecutionIntentV2.runtime_configuration` in `src/native-core/runtime-compilation.ts` | Current runtime configuration is structurally generic | REQ-03 snapshot gap must carry typed Memory policy/results references, not raw content |
| `EvidenceRecordV2`, `SourceReferenceV2` and `ArtifactReferenceV2` in `src/native-core/evidence.ts` | Provenance, immutable payload digests, sensitivity and correction have accepted semantics | Memory operations emit/reference Evidence; Memory is not the Evidence ledger |
| `WorkforceRevisionV2` in `src/native-core/workforce.ts` | Workforce owns members, constraints and governance only | Shared Memory remains a companion domain and exact Workforce/Run reference |
| No canonical Memory policy/store module under `src/` | Only policy/reference vocabulary is implemented | `NEW` identifies a demonstrated owner/contract gap; it grants no implementation authority |

## Taxonomy

| Memory class | Scope key | Intended duration | Source truth | Required references |
| --- | --- | --- | --- | --- |
| Working Memory | Tenant + Run, optionally Task/Attempt | Bounded by operation policy | Memory record for execution context only | Run/Task/Attempt, policy snapshot, actor and source refs |
| Agent Memory | Tenant + canonical `agent_id` | Cross-Run under retention policy | Memory record | Agent identity, originating Run/Evidence and policy revision |
| Workforce Shared Memory | Tenant + canonical `workforce_id`, normally admitted Run | Cross-member access only while authorized | Memory companion record | Exact Workforce revision, Run/membership snapshot and contributing Agent refs |
| User/context Memory | Tenant + governed subject/user ref | Consent and purpose bounded | Memory record | Subject, purpose, consent/authority decision and source refs |
| Knowledge-backed retrieval state | Tenant + knowledge source/scope | Derived and rebuildable where possible | Knowledge source remains authoritative | Source/digest, retrieval policy, query/result evidence and index observation |

“Historical” or “episodic” describes a retrieval view over Memory records and
accepted history. It does not create a new source of lifecycle, execution or
governance truth.

## Negative boundaries

```text
Memory != Run State
Memory != checkpoint
Memory != Knowledge source
Memory != Evidence
Memory != Agent identity or revision
Memory != Workforce identity or revision
Memory record != authority grant
retrieval result != verified fact without provenance
```
