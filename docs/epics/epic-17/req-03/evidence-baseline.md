# REQ-03 Evidence Baseline

| Concern | Repository evidence | Finding |
| --- | --- | --- |
| Canonical Agent inputs | `AgentDefinitionV2`, `AgentRevisionV2` in `src/native-core/agent.ts` | Exact Agent revision carries behavior, resource, runtime, governance, Evidence and economic refs; head carries current lifecycle/admin state. |
| Workforce inputs | `WorkforceRevisionV2` in `src/native-core/workforce.ts` | Slots add capability, authority and participation constraints; Workforce rejects runtime/provider/credential fields. |
| Admission membership | `WorkforceRunMembershipV2` in `src/native-core/workforce-run-membership.ts` | Run admission resolves exact Agent and Workforce revision refs and records authority decision. |
| Execution binding | `ExecutionBindingV2` in `src/native-core/runtime.ts` | Existing boundary records Agent/provider/model/credential/harness/executor/target refs plus capability, policy and economic evidence. |
| Execution context/policy | `ExecutionContextV2`, `ExecutionPolicyV2` | Existing contracts carry exact definition refs, allowed resources, policy snapshots, authority context and runtime policy. |
| Policy identity | `PolicySnapshotRef` in `src/native-core/primitives.ts` | Policy snapshot includes ID, revision, fingerprint and decision-context hash. |
| Run history | `RunV2`, `TaskAttemptV2`, `CheckpointV2` | Run, Attempt and checkpoint retain binding, exact revision and policy references without owning authored configuration. |
| Runtime intent | `RuntimeExecutionIntentV2` in `src/native-core/runtime-compilation.ts` | Intent preserves assignment generation and exact Agent/Workforce refs, but `runtime_configuration` and `provenance` are untyped records. |
| Current compilation | `compileAssignmentExecution` in `src/control-plane/shared-state/native-core-durable.ts` | Compilation verifies immutable membership and exact Agent revision, then copies only `runtime_preferences` into the generic configuration object. |
| Durable chain | `PostgresNativeCoreRepository` | Intent, Attempt and event are stored under the existing shared transactional authority. |
| Presentation ownership | accepted REQ-02 | Profile is a projection; Persona belongs to Agent revision; presentation cannot grant authority. |
| Evidence/provenance | `EvidenceRecordV2`, `SourceReferenceV2`, `DecisionReferenceV2` | Existing references support source, decision and artifact evidence but do not type effective configuration. |

## Proven gaps

The baseline does not provide:

- a typed effective-configuration contract covering all classes;
- a resolver version and canonical input/output fingerprint;
- per-class decision trace explaining acceptance, attenuation or rejection;
- complete source refs for catalogs, head/lifecycle state, Memory or
  presentation;
- an explicit immutable snapshot reference shared by binding and intent;
- reconstruction rules that avoid consulting current mutable state;
- typed mismatch/error semantics for incomplete or stale configuration.

These are additive contract gaps. Existing Run, admission, binding, intent,
Attempt, checkpoint, event and repository authorities remain canonical.
