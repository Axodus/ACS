# Eigent → ACS Traceability Matrix

| Concern | ACS existing | Eigent primitive | Decision | ACS target and rationale |
| --- | --- | --- | --- | --- |
| Workforce identity | No aggregate; RevisionRef supports workforce kind. | CAMEL Workforce object / api_task_id. | REJECT | Create ACS opaque Workforce id and append-only revision. External object/task ids violate canonical identity. |
| Membership | Agent lineage and governed roles exist. | CAMEL child nodes and worker descriptions. | ADAPT | ACS member slots reference Agent selectors and governed role refs; retain role specialization but not node ownership. |
| Roles | Governed role resource registry, but no demonstrated historical role lookup. | Runtime descriptions for developer/browser/document workers. | ADAPT | Bind exact governed role refs to slots and extend governed-resource history before admission. Do not persist prompt/persona object as role truth or create WorkforceRole. |
| Coordinator | No canonical coordination engine. | CAMEL coordinator/task/new-worker agents. | ADAPT | A Workflow task/strategy may propose coordination. It cannot become Workforce identity or authority. |
| Delegation | Run/Task/Attempt and event envelope exist. | Depth-limited child agents and child step projection. | ADAPT | Use bounded parent/child correlation and durable Task admission. |
| Task assignment | Task state exists; no member-assignment record. | CAMEL _find_assignee and TaskChannel. | REJECT | ACS Coordination decides and records assignment; in-memory queue cannot be canonical. |
| Dependencies | Task transition supports dependency_satisfied. | CAMEL Task parent/subtask/dependencies. | REJECT | Workflow graph owns durable dependencies; adapter may propose only. |
| Recovery | Native checkpoints, runtime leases/fencing. | RunJournal interruptions, unknown provider outcome. | ADAPT | Preserve explicit unknown/incomplete recovery facts; ACS owns decision and checkpoint. |
| Persistence | Shared PostgreSQL and transactions. | Desktop SQLite journal. | REJECT | Reuse ACS shared store; local journal may be adapter observation source only. |
| Events | Native EventEnvelope/outbox. | Step event projection and RunJournal events. | ADAPT | Normalize deterministic step facts into ACS events; failed projection must be explicit. |
| Evidence | Native evidence records. | Evidence gaps, model/tool facts. | ADAPT | Retain completeness/gap semantics under ACS evidence ownership. |
| Cost attribution | UsageRecordV2 / CostRecordV2 carry Workforce dimensions, but UsageRecordV2 has no attempt_id. | Task additional_info token usage. | ADAPT | Normalize observed usage through ACS evidence. Add an immutable Attempt reference or bridge before claiming direct attempt-level attribution; do not trust mutable task payload as ledger. |
| Runtime coupling | Runtime worker/lease/fencing separate from definitions. | CAMEL TaskChannel, TaskLock, local run handles. | REJECT | Existing ACS durable runtime remains execution substrate. |
| Provider coupling | ExecutionBinding isolates provider/model/executor. | CAMEL ModelFactory and Gemini session runtime. | REJECT | Provider is adapter/execution binding concern only. |

## Material ADAPT rationales

- Event-shaped subtask facts provide a useful observation vocabulary, but ACS
  must commit them through EventEnvelopeV2/outbox with canonical causation.
- Explicit unknown provider outcomes and evidence gaps prevent false successful
  reconstruction; they fit ACS Evidence without importing Eigent persistence.
- Bounded delegation and depth control inform a future Task-handoff policy while
  ACS retains Task identity and authority.
- Worktree-per-agent leasing demonstrates execution isolation, which belongs
  below Workforce Core as a runtime/executor capability.
- Role specialization is useful only once represented as ACS-governed role
  references in a Workforce member slot.

## Material REJECT rationales

- CAMEL Workforce/Task/TaskChannel are process-local, mutable, and provider
  coupled. They violate ACS durable canonical graph, membership, and runtime
  ownership.
- Eigent TaskLock and desktop RunJournal are not shared institutional stores.
  Treating either as canonical would introduce a second persistence authority.
- Model-selected retry/replan and direct provider sessions would alter
  governance, Run/Task recovery, and provider-neutrality boundaries.
