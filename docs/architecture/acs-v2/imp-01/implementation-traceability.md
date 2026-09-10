# ACS-V2-IMP-01 Implementation Traceability

This matrix preserves the required chain:

`REQ-03 contract → implementation → invariant → test → evidence`

The evidence column identifies what the current implementation proves and what
remains outside this slice. A contract is not marked complete merely because a
TypeScript type exists.

| Contract | Implementation | Invariant | Tests | Evidence |
| --- | --- | --- | --- | --- |
| REQ-03 §2 Shared primitives | `src/native-core/primitives.ts` | IDs are opaque non-empty values; revisions and policy snapshots carry versioned SHA-256 references; scopes and idempotency records validate required fields. | `tests/acs-v2-imp-01.test.mjs` construction, invalid-reference, serialization, and secret-rejection cases. | Focused IMP-01 suite; `npm run build`. |
| REQ-03 §3 Versioning | `ACS_NATIVE_SCHEMA_VERSION`, `validate*` functions in `src/native-core/*.ts` | Unsupported schema versions fail explicitly; canonical serialization is deterministic and omits undefined optional fields. | Agent, runtime, evidence, and accounting round-trip tests. | Focused IMP-01 suite passes; no compatibility mapper is introduced. |
| REQ-03 §4 AgentDefinition | `src/native-core/agent.ts` `AgentDefinitionV2` | Agent identity is ACS-owned and independent of provider/model/executor identity; scope, status, sharing, ownership, and timestamp rules validate. | Agent construction, provider-independence, secret-rejection, and serialization tests. | Focused IMP-01 suite; no provider integration or external identity authority. |
| REQ-03 §4 AgentRevision | `src/native-core/agent.ts` `AgentRevisionV2`, `createAgentRevisionV2`, `fingerprintAgentRevisionV2` | Revision content is fingerprinted; committed content is validated through immutable typed references; predecessor references are retained. | Revision fingerprint and round-trip tests; malformed fingerprint rejection. | Focused IMP-01 suite. Durable repository lineage and update/delete persistence proof remain open. |
| REQ-03 §7 ExecutionContext / Policy | `src/native-core/runtime.ts` | Execution context carries run/task/attempt, scope, authority, policy snapshots, resource references, and optional checkpoint; credentials remain references. | Runtime request construction and deterministic round-trip test. | Focused IMP-01 suite; no provider or executor implementation. |
| REQ-03 §7 ExecutionRequest / Result | `src/native-core/runtime.ts` | Requests are idempotency- and correlation-bearing; results expose normalized status, references, usage records, cursors, errors, and completion time. | Runtime request/result validation and round-trip tests. | Focused IMP-01 suite. External execution remains an adapter boundary. |
| REQ-03 §7 ExecutionBinding | `src/native-core/runtime.ts` | Provider/model/credential/harness/executor/target are references in a run-scoped binding; admission status and plan fingerprint validate. | Binding construction and state-machine test. | Focused IMP-01 suite; no provider is adopted. |
| REQ-03 §10 Run | `src/native-core/runtime.ts` `RunV2` and `transitionRunV2` | Run transitions follow the frozen lifecycle; admission, lease/fencing, checkpoint, retry, approval, terminal result, and cancellation guards are explicit. | Allowed/forbidden transition tests, terminal-state test, and guard failures. | Focused IMP-01 suite. Durable Run mutation remains owned by existing runtime and is not replaced here. |
| REQ-03 §10 Task / TaskAttempt | `src/native-core/runtime.ts` `TaskV2`, `TaskAttemptV2`, `transitionTaskV2` | Task transitions preserve attempt identity, lease/fencing references, worker-start acknowledgement, retry admission, and compensation guards. | Task lifecycle transition test and invalid transition cases. | Focused IMP-01 suite. |
| REQ-03 state-machine-and-events §5/§9 leases/fencing/recovery | `taskAttemptFromDurableAssignment`, `assertCurrentFencingToken`, `CheckpointV2` in `src/native-core/runtime.ts` | Native attempts map existing durable assignments; stale fencing is rejected; checkpoints carry recovery references without creating a second queue or lease authority. | Durable assignment mapping and stale-fencing rejection test; checkpoint validation coverage. | Focused IMP-01 suite plus existing durable-runtime tests. Durable resume transaction remains open. |
| REQ-03 state-machine-and-events §6 EventEnvelope | `src/native-core/runtime.ts` `EventEnvelopeV2` | Events carry identity, type, schema version, timestamp, sequence, scope, run/task context, actor, source, correlation, causation, idempotency, and safe payload. | Event construction and invalid payload/secret checks. | Focused IMP-01 suite. |
| REQ-03 state-machine-and-events §8 event/outbox | `NativeEventLedger` in `src/native-core/runtime.ts` | In-process append checks unique event IDs and monotonic sequence within one ledger scope. | Event ledger duplicate and sequence tests. | Focused IMP-01 suite. Durable event store and fact-before-dispatch outbox are not implemented; this row is partial. |
| REQ-03 §11 EvidenceRecord | `src/native-core/evidence.ts` `EvidenceRecordV2` | Evidence is ACS-owned, append-oriented, source-classified, digest-bearing, reference-based, and secret-free. | Evidence construction, validation, and serialization tests. | Focused IMP-01 suite. |
| REQ-03 §11 provenance references | `SourceReferenceV2`, `ArtifactReferenceV2`, `DecisionReferenceV2`, `ApprovalRecordV2`, `ExecutionTraceReferenceV2` | External observations enrich ACS records through typed references; artifacts carry digest/sensitivity; decisions and approvals carry policy/authority references. | Validator coverage in focused suite and TypeScript build. | Native validators exist; broad fixture coverage remains a follow-up. No cryptographic immutability or ledger guarantee is claimed. |
| REQ-03 §12 UsageRecord | `src/native-core/accounting.ts` `UsageRecordV2` | Usage is ACS-owned and normalized; provider/executor data is marked as measurement source and linked to evidence. | Provider-observation input and malformed measurement rejection tests. | Focused IMP-01 suite. |
| REQ-03 §12 CostRecord | `src/native-core/accounting.ts` `CostRecordV2` | Cost is linked to Usage, uses hierarchical cost centers and non-negative decimal components, and remains separate from settlement. | Cost construction, settlement absence, and malformed decimal rejection tests. | Focused IMP-01 suite. No pricing or settlement authority is added. |
| REQ-03 §1 and §12 provider neutrality | All native-core modules | Provider IDs can be observations or references only; they do not define ACS identity, event history, evidence, or economic ownership. | Agent provider-independence and usage/cost provider-observation tests. | Focused IMP-01 suite; no external dependency introduced. |
| REQ-03 `PARTIAL` Workforce | No implementation in IMP-01 | Workforce membership and coordination are not inferred or completed. | Scope review and absence of Workforce/Product API changes. | `git diff --check`; implementation remains outside native-core. |
| REQ-03 `PARTIAL` Product API | No implementation in IMP-01 | Existing Product API compatibility remains untouched; no v2 command surface is invented. | Scope review and repository build. | `git diff --check`; no Product API files changed. |

## Reused runtime evidence

The native layer is intentionally tested separately from the repository-wide
baseline. The existing runtime tests are evidence that the durable assignment,
lease, fencing, and Agent model remain available; they do not prove that the
new native records are durably persisted.

## Evidence boundary

The 2026-09-09 baseline recorded `673 / 680` passing, `5` failing, and `2`
skipped. `ACS-BLOCKER-014` remains open. IMP-01's focused suite cannot be used
to reclassify those failures or to claim repository-wide readiness.

