# Workforce Core Boundary

## Mission

Workforce Core answers who is composed to participate under which stable roles
and constraints. It is a control-plane definition, not a running team, a worker
pool, a chat session, or an orchestration engine.

## Workforce Core owns

- ACS-generated Workforce identity and scope.
- Immutable Workforce revisions and fingerprints.
- Member slots, slot identifiers, Agent references, role references, and member
  constraints.
- Membership authority references and composition provenance.
- Current revision selection and lifecycle status as a current-head projection.
- The exact Workforce revision bound to a Run.
- Canonical historical composition reconstruction.

## Workforce Core does not own

- Task decomposition, dependencies, joins, routing, scheduling, dispatch, or
  task-assignment decisions.
- Runtime Worker identity, worker capacity, lease, fencing, or executor handles.
- Provider/model selection or provider session state.
- Task retry, replan, compensation, or recovery policy execution.
- Mutable shared prompt, memory, chat, queue, or channel state.
- Evidence/cost ledgers or governance policy definition.

## Role semantics

WorkforceRole is not a new canonical aggregate in v1. A member slot MAY
reference the existing governed role resource by immutable id/revision.

A role is structural and functional: it describes expected responsibility,
capability constraints, and permission/authority requirements of the member
slot. It is not a runtime process type, provider persona, coordinator loop, or
exclusive execution reservation.

Coordinator and supervisor are not Workforce architectural concepts in v1. A
Workflow revision MAY designate a task node assigned to a Workforce slot whose
role happens to be coordinator or reviewer. Coordination policy and behavior
remain Workflow/Coordination-owned.

## Composition modes

Workforce definition is static per revision. Controlled change is dynamic only
in the sense that an authorized actor can create a new revision. A Run binds a
specific immutable revision. Dynamic task assignment never changes Workforce
membership.

## Minimum Workforce lifecycle

| State / transition | Purpose and preconditions | Authority and durable transition | Event / Run and membership impact |
| --- | --- | --- | --- |
| create `→ draft` | Establishes a valid but non-admissible composition. Revision 1 must pass scope, member, role, constraint, and authority validation. | An authorized Workforce creator commits revision 1 and sets current head/status in one transaction. | `workforce.created` records identity and revision 1. No operational Run may bind draft. |
| `draft` | Allows review before execution admission. | Only an authorized successor revision may alter composition or lifecycle. | Historical composition is reconstructible; no new operational Run binds it. |
| `draft` or `disabled → active` | Makes the current composition eligible for new admission. Referenced Agents, role revisions, and governance constraints must be eligible. | An authorized lifecycle command appends a successor revision and advances head/current status atomically. | `workforce.lifecycle.changed` records the revision/head transition. Existing Runs retain their bound revisions. |
| `active → disabled` | Stops new operational admission without rewriting admitted work. | Governance-supplied lifecycle authority appends a successor revision; the old revision remains immutable. | `workforce.lifecycle.changed` records the revision/head transition. Existing Runs continue only under separate Run/Task policy. |
| `draft`, `active`, or `disabled → archived` | Retains final historical definition when future admission is no longer allowed. | Authorized archive command appends an archived successor revision. Physical deletion is prohibited. | `workforce.lifecycle.changed` records the revision/head transition. Historical Runs and membership snapshots remain reconstructible; no new operational Run may bind it. |

There is no direct head rewind, unarchive, delete, running, paused, failed, or
completed Workforce transition in v1. Reusing a prior composition requires an
authorized new successor revision that copies it, rather than selection or
mutation of a historical revision. Running, paused, failed, and completed are
Run or Task states. Each lifecycle transition MUST be durable, authorized,
event-bearing, and reconstructible.
