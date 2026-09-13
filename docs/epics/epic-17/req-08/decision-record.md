# EPIC-17-REQ-08 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R08-D01` | Automation is a Tenant-scoped durable configured execution intention capable of later Activation. | `PROPOSED` |
| `E17-R08-D02` | Automation is distinct from Activation, RuntimeExecutionIntent, Run, Workflow, Task, Trigger, Schedule, scheduler and executor. | `PROPOSED` |
| `E17-R08-D03` | The Automation domain owns configuration identity, immutable authored revisions and lifecycle history; Governance owns authority and policy. | `PROPOSED` |
| `E17-R08-D04` | Stable logical `automation_id` is required for references, lifecycle, history and correlation. | `PROPOSED` |
| `E17-R08-D05` | Immutable fingerprinted revisions are required so historical authored target/configuration/policy state remains reconstructable. | `PROPOSED` |
| `E17-R08-D06` | Stable identity and revision semantics do not by themselves authorize or prove a separate aggregate, repository or persistence topology. | `PROPOSED` |
| `E17-R08-D07` | Draft, enabled, disabled and archived are Automation eligibility semantics; enabled does not mean authorized, scheduled or executing. | `PROPOSED` |
| `E17-R08-D08` | Lifecycle/head history is separate from immutable revision history and from per-occurrence Activation snapshots. | `PROPOSED` |
| `E17-R08-D09` | Automation references canonical admission-capable targets through explicit pinned or resolve-at-Activation selection; implicit latest and provider targets are rejected. | `PROPOSED` |
| `E17-R08-D10` | Automation revisions store authored requirements/refs; REQ-03 resolution at Activation/admission owns effective configuration. | `PROPOSED` |
| `E17-R08-D11` | Trigger, Schedule, Activation identity, due-work evaluation, deduplication and retry remain REQ-09 concerns. | `PROPOSED` |
| `E17-R08-D12` | Configuration authority and execution authority are separate decisions. Automation existence, enablement and prior approval grant no execution authority. | `PROPOSED` |
| `E17-R08-D13` | An exact Delegation basis may be referenced as provenance/requirement but must be revalidated at Activation; expiry/revocation is never frozen away. | `PROPOSED` |
| `E17-R08-D14` | Automation history reuses Events, Decision, Approval, Evidence, outbox and idempotency authority with exact identity/revision subjects. | `PROPOSED` |
| `E17-R08-D15` | Usage and Cost remain Run-based under Accounting/Economics; Automation/Activation add correlation only. | `PROPOSED` |
| `E17-R08-D16` | Automation never owns Agent, Workforce, Workflow, Runtime, Evidence, Economics, Product API, provider or executor truth. | `PROPOSED` |

Rejected: Automation inside Agent revision, Workflow-as-Automation,
Run/Task/runtime-intent-as-Automation, Trigger/Schedule ownership of Automation,
provider/executor identity, implicit latest target, enablement-as-authority,
permanent Delegation authority, mutable configuration history and new Automation
economics.

Acceptance authorizes REQ-09 documentation only. It authorizes no IMP,
migration, schema, API, database, scheduler, runtime or production change.
