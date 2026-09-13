# REQ-08 Evidence and Ownership

## Implemented evidence

| Evidence | Current meaning | REQ-08 consequence |
| --- | --- | --- |
| `AcsServiceCapability.automationAllowed` and `automationLevel` in `src/capability-registry.ts` | Capability policy/readiness metadata exposes blocked, assisted or approval-oriented automation vocabulary | Reuse as policy/readiness input only; it is not an Automation instance or lifecycle |
| `SystemConfigurationView.automation` in `src/control-plane/product-api-client.ts` and operational status in `src/http/services/operational-status-service.ts` | Product API currently reports Automation as disabled/manual approval | These are projections of readiness, not domain identity, configuration or authority |
| `AgentDefinitionV2`/`AgentRevisionV2` in `src/native-core/agent.ts` | Agent identity, behavior and policy references are already canonical | Automation references Agents and never becomes an Agent field or alternate Agent model |
| `WorkflowDefinition` in `src/types.ts` and Workflow refs accepted by runtime contracts | Workflow describes coordination/execution structure | Automation may target a governed Workflow but cannot embed or own Workflow semantics; exact durable Workflow lineage remains a target-readiness gap |
| `ExecutionBindingV2`, `ExecutionRequestV2`, `RunV2`, `TaskV2` and `TaskAttemptV2` in `src/native-core/runtime.ts` | Admission and Runtime own executable work and state | Automation can produce no execution directly and cannot become a Run/Task/Attempt |
| `RuntimeExecutionIntentV2` in `src/native-core/runtime-compilation.ts` | Runtime intent is compiled for one Run/Task/Assignment generation | Automation's durable configured intention is not this per-execution intent |
| `EvidenceRecordV2`, Source/Decision/Approval refs in `src/native-core/evidence.ts` | Evidence and provenance have accepted owners | Automation history reuses these mechanisms with an exact Automation subject/reference |
| `UsageRecordV2` and `CostRecordV2` in `src/native-core/accounting.ts` | Usage/Cost are attributed to Run, Task, Agent, Workforce and providers under Economics authority | Automation adds correlation only; it cannot price, reserve, settle or redefine Cost |
| Delegation decisions in accepted REQ-07 | Delegation grants are attenuated, expirable authority bases | Automation may reference one but cannot preserve its authority beyond Activation revalidation |
| No Automation definition/revision contract under `src/native-core/` or `src/control-plane/` | No canonical Automation identity, lineage or lifecycle exists | The domain gap is demonstrated; `NEW` remains documentation authority only |

## Owner map

| Concern | Canonical owner |
| --- | --- |
| Automation identity, authored revisions and lifecycle history | New Automation domain |
| Tenant, authoring, enable/disable and execution authority | Governance |
| Agent, Workforce and Workflow targets | Their existing canonical domains |
| Effective configuration and snapshot | Admission resolution from REQ-03 |
| Delegated authority basis | Delegation/Governance from REQ-07 |
| Trigger, Schedule, Activation and due-work evaluation | Reserved for REQ-09 |
| Run, Task, Assignment, Attempt and runtime intent | Existing Coordination/Runtime |
| Evidence/provenance | Events, Decision, Approval and Evidence owners |
| Usage, Cost, budget and settlement | Existing Accounting/Economics owners |
| Product API and Administration views | Reserved projection work in REQ-10 |

Automation owns configuration truth only. Enablement represents eligibility for
future Activation evaluation and grants neither execution nor enduring
authority.
