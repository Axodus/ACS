# REQ-09 Evidence and Ownership

## Repository evidence

| Evidence | Finding | Boundary consequence |
| --- | --- | --- |
| `src/native-core/workforce-run-membership.ts` | Workforce admission resolves exact Workforce/Agent revisions, authority decision and one idempotency key into a Run membership snapshot. | Activation feeds this boundary where applicable and does not alter membership semantics. |
| `src/native-core/runtime.ts` | `ExecutionRequestV2`, `ExecutionBindingV2`, Run, Task, Attempt, Event, policy and snapshot references already own admitted execution semantics. | Activation contributes cause and accepted references; it cannot redefine execution. |
| `src/native-core/runtime-compilation.ts` | `RuntimeExecutionIntentV2` requires Run, Task, Assignment, generation and exact Agent/Workforce revisions. | Canonical runtime intent is post-admission/post-assignment, not an Activation record. |
| `src/control-plane/shared-state/native-core-durable.ts` | Runtime compilation is idempotent and commits intent/Attempt/Event/outbox through shared PostgreSQL transaction patterns. | A future Activation handoff must reuse the same authority and recoverable idempotency pattern. |
| `src/workers/durable-runtime-state.ts` | Runtime jobs use Tenant-scoped idempotency, CAS-like revisions, exclusive claims, attempts, leases, fencing, cancellation and recovery. | These remain execution owners; Activation needs separate occurrence claims and cannot reuse a runtime job as its identity. |
| `src/workers/worker-types.ts` | Workers carry out already-governed assignments and make no governance decisions. | Scheduler/worker availability cannot authorize Activation or admission. |
| `src/engines/agent-engine.ts` | Execution targets expose `schedulingEligible` as health/capability observation. | Eligibility is not schedule truth, due-work ownership or authority. |
| `src/engines/openclaw-engine-adapter.ts` | OpenClaw implements bounded engine operations and translates ACS requests. | It remains a replaceable adapter, not the owner of Automation, Activation or canonical history. |
| `src/native-core/runtime.ts` | Events already carry actor, source, correlation, causation and optional idempotency keys. | Activation can extend subject/correlation vocabulary without replacing Events/Evidence. |
| Repository search | No canonical Activation, Trigger or Schedule contract, occurrence key, schedule watermark or Activation-to-Run link exists. | These are demonstrated logical contract gaps and future implementation blockers. |

## Ownership map

| Concern | Canonical owner |
| --- | --- |
| Authored intention, target rule, trigger/schedule specification | exact `AutomationRevision` semantics from REQ-08 |
| Authority, policy, approval and attenuation | Governance and accepted domain policy owners |
| External endpoint and credential boundary | Connector/Connection/Channel/secret owners from REQ-05 |
| Logical causal occurrence and pre-admission decision history | Activation boundary established by this REQ |
| Effective configuration | existing admission resolver plus REQ-03 snapshot semantics |
| Membership and admitted composition | Workforce admission |
| Run, Workflow, Task, Assignment and Attempt | existing canonical execution domains |
| Runtime compilation, workers, leases, fencing and recovery | existing Runtime owners |
| Source, Decision, Approval, Event and Evidence | existing Evidence/provenance owners |
| Usage, Cost, budget and settlement | Accounting/Economics owners |
| Provider, OpenClaw or other engine | replaceable observation/execution adapter |

No evidence supports a second scheduler authority, runtime lifecycle,
persistence service or Product API.
