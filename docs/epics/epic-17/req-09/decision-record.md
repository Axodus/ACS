# EPIC-17-REQ-09 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R09-D01` | Activation is one durable Tenant-scoped causal evaluation occurrence for one exact Automation revision. | `PROPOSED` |
| `E17-R09-D02` | Stable logical `activation_id` semantics are required, but aggregate, repository and persistence topology remain unproven and unauthorized. | `PROPOSED` |
| `E17-R09-D03` | Automation, Trigger/Schedule specification, source observation, Activation, admission, Runtime intent and execution remain distinct. | `PROPOSED` |
| `E17-R09-D04` | Trigger and Schedule specifications are authored under an exact Automation revision with stable logical source keys in the Automation lineage; independent reusable aggregates are not demonstrated. | `PROPOSED` |
| `E17-R09-D05` | A scheduler/event adapter detects candidate occurrences; ACS owns normalization, occurrence identity, Activation history and admission decisions. | `PROPOSED` |
| `E17-R09-D06` | Trigger, Channel, Schedule and Manual causes require normalized source identity, logical key, digest, timestamps and Evidence. | `PROPOSED` |
| `E17-R09-D07` | Delivery, due time, Channel/Connection reference and Automation enablement grant no execution authority. | `PROPOSED` |
| `E17-R09-D08` | One canonical occurrence key scopes Tenant, stable Automation identity, stable trigger/schedule source key and trusted source occurrence identity; first claim binds the exact revision. | `PROPOSED` |
| `E17-R09-D09` | Head changes do not alter an occurrence key; reuse with a different requested revision, semantic input or digest is a fail-closed idempotency conflict. | `PROPOSED` |
| `E17-R09-D10` | Replay/concurrency produces one canonical Activation, at most one accepted admission lineage and at most one resulting Run correlation. | `PROPOSED` |
| `E17-R09-D11` | Source and Activation retries reuse the same occurrence; execution retries remain owned by Run/Task/Attempt and Runtime policy. | `PROPOSED` |
| `E17-R09-D12` | Exactly-once canonical state does not claim exactly-once physical execution or external side effects. | `PROPOSED` |
| `E17-R09-D13` | Schedule recovery requires exact time semantics, durable range/watermark proof, exclusive occurrence claims and explicit bounded missed-work policy. | `PROPOSED` |
| `E17-R09-D14` | No universal skip/replay/coalesce policy exists; the exact authored policy governs and missing required policy fails closed. | `PROPOSED` |
| `E17-R09-D15` | Activation cancellation before admission blocks handoff; after admission, existing Run/Task cancellation and reconciliation owns active work. | `PROPOSED` |
| `E17-R09-D16` | Direct or delegated authority, Automation lifecycle and all policies are revalidated before every admission. | `PROPOSED` |
| `E17-R09-D17` | Target and effective configuration resolve completely before accepted execution and enter an immutable REQ-03-aligned snapshot. | `PROPOSED` |
| `E17-R09-D18` | The pre-admission artifact is a logical admission request; implemented `RuntimeExecutionIntentV2` remains post-admission and post-assignment. | `PROPOSED` |
| `E17-R09-D19` | Activation-to-admission handoff is atomic or recoverably consistent through shared outbox/idempotency and preserves one causal Run linkage. | `PROPOSED` |
| `E17-R09-D20` | Workers, leases, fencing, Attempts and runtime recovery remain authoritative and are never Activation state. | `PROPOSED` |
| `E17-R09-D21` | OpenClaw and other providers may observe/evaluate/execute through bounded adapters but own no canonical Automation, schedule, Activation, authority or history. | `PROPOSED` |
| `E17-R09-D22` | Evidence and provenance reuse current owners; Activation adds exact subjects and correlations only. | `PROPOSED` |
| `E17-R09-D23` | Usage/Cost remains under Accounting/Economics and Run attribution; Automation/Activation supplies correlation only. | `PROPOSED` |
| `E17-R09-D24` | Any incompatible Workforce, Workflow, Run, Task, Assignment, Attempt, lease, fencing or recovery change is a blocker and architecture escalation. | `PROPOSED` |

Rejected: Scheduled Task identity, Trigger/Schedule-as-execution,
scheduler/OpenClaw authority, delivery-as-authority, process-local timer truth,
implicit latest target, new runtime intent before admission, retry with a new
occurrence key, silent missed-work replay, Activation-owned worker recovery,
exactly-once external-side-effect claims, parallel Event/Evidence/Cost ledgers
and parallel persistence.

Acceptance authorizes REQ-10 documentation only. It authorizes no IMP,
migration, schema, API, database, scheduler, runtime or production change.
