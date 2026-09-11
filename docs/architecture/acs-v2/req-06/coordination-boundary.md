# Workflow / Coordination Boundary

## Responsibility split

| Concern | Workforce Core | Workflow / Coordination | Run / Task | Runtime / Executor |
| --- | --- | --- | --- | --- |
| Agent / Workforce identity | Owns Workforce only | Reads | References | Must not own |
| Membership / roles | Owns definition | Selects eligible slot | Freezes resolved membership | Must not change |
| Task graph / dependencies | Must not own | Owns versioned graph and amendment validation | Evaluates task readiness | Executes only |
| Decomposition | Must not own | MAY propose or accept governed amendment | Materializes admitted tasks | May return untrusted proposal |
| Assignment / routing | Provides candidates | Owns decision policy | Stores task decision and event | Receives dispatch |
| Scheduling / queue | Must not own | Specifies policy only | Requests ready task dispatch | Owns queue, lease, capacity |
| Retry / reassignment | Must not own | Defines policy/decision | Owns Task state and attempt admission | Reports failure/recovery facts |
| Supervisor logic | Must not own | A task role or strategy | Records outputs and decisions | No authority |

## Coordination contract now

REQ-06 freezes an ACS-owned conceptual interface, not a workflow engine:

```text
CoordinationProposal
  base_run_or_plan_ref
  proposal_kind: decomposition | assignment | reassignment | route | recovery
  proposed_changes
  rationale_ref
  source_ref
  policy_snapshot_refs

CoordinationDecision
  decision_id
  accepted | rejected | approval_required
  validated_inputs
  resulting_task_or_plan_refs
  authority_decision_ref
  event_ref
```

An adapter MAY emit CoordinationProposal. ACS MUST validate scope, exact Run
membership snapshot, graph rules, immutable in-flight Task state, authority,
approval, resource/budget limits, idempotency, and evidence requirements before
a CoordinationDecision becomes canonical.

For accepted assignment or reassignment, ACS MUST append an additive
Task-assignment decision record keyed by Task and decision sequence. The record
MUST identify the selected admitted member slot, the preceding decision when
present, authority/policy/rationale references, and the corresponding event.
It supplements Task state; it does not create a second Task lifecycle.

## Deferred engine capabilities

The following remain required later:

- Workflow revision and deterministic graph validator.
- Graph amendments and joins.
- Task assignment persistence/projection.
- Scheduling policies and fairness.
- Recovery, compensation, and reassignment algorithms.
- Supervisor/planner implementations.

This package deliberately does not define their internal algorithms.
