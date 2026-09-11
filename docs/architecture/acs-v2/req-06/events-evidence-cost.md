# Events, Evidence, and Cost

## Canonical events

Events exist only for meaningful committed facts. Existing EventEnvelopeV2,
native event stream, outbox, and idempotency ownership MUST be reused.

| Event family | Required fact |
| --- | --- |
| workforce.created | Stable identity and revision 1 committed. |
| workforce.revision.created | Immutable non-lifecycle successor committed and head advanced. |
| workforce.lifecycle.changed | Lifecycle-bearing successor committed and head advanced; this event replaces a second revision event for the same command. |
| run.workforce.bound | Run bound to Workforce revision and membership snapshot. |
| task.assignment.decided | Coordination selected a member slot for a Task. |
| task.reassignment.decided | Authorized new assignment replaces future work, with rationale. |
| coordination.decision.recorded | Proposal accepted, rejected, or approval-gated. |

Individual member-added, member-removed, and role-changed events are not
required as separate canonical transitions because they are contained by an
atomic Workforce revision event. They MAY be derived read-model notifications.

## Evidence

Workforce participation evidence MUST link, where applicable:

- Workforce revision reference and member slot id.
- Resolved Agent revision and Run id.
- Task, Attempt, and ExecutionBinding identifiers.
- Decision, authority, policy, and source references.
- Artifact or trace references with declared completeness.
- Correlation and causation identifiers.

The existing EvidenceRecordV2 remains the canonical evidence aggregate. For
execution participation it SHOULD use `subject_ref` to identify the
TaskAttempt; its existing Run, Task, and event references establish the rest of
the execution chain. The corresponding canonical event payload MUST carry the
member slot, assignment-decision, and ExecutionBinding references needed for
reconstruction. Coordination-decision evidence SHOULD identify the accepted
decision record as its subject. This is an evidence-linkage convention, not a
new evidence store or an executor-owned ledger.

Provider/executor/adapter telemetry is observation only. Missing or failed
projection MUST be recorded as incomplete or unavailable evidence, not converted
into an unqualified completion claim.

## Usage and cost attribution

Existing UsageRecordV2 has Run, optional Task, Agent revision, Workforce
revision, provider/model/executor, and evidence dimensions. CostRecordV2 has
optional Workforce, Workflow, Agent, Task, provider, and executor cost-center
dimensions. `UsageRecordV2` does not currently contain `attempt_id`; its
current contract therefore supports Workforce, Run, and Task aggregation but
does not by itself provide a lossless direct record-to-Attempt link.

Future implementation MUST populate:

```text
WorkforceRevisionRef
  -> Run
  -> WorkforceRunMembership / resolved AgentRevisionRef
  -> Task
  -> TaskAttempt
  -> ExecutionBinding / Runtime assignment
  -> UsageRecordV2 (requires an additive Attempt reference or immutable bridge)
  -> CostRecordV2
```

Retries remain separate Attempt records. Before an implementation claims direct
attempt-level Usage or Cost attribution, it MUST add an optional `attempt_id`
to UsageRecordV2 or an immutable equivalent bridge record, with an accounting
contract compatibility review. This is additive attribution linkage, not an
economic-model redesign. Workforce aggregation MUST group by immutable
Workforce revision or stable identity as explicitly requested. It MUST NOT
invent unavailable provider cost or redesign price, settlement, reservation, or
economic-responsibility semantics.
