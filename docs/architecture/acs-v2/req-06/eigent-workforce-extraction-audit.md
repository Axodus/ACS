# Eigent Workforce Extraction Audit

**Evidence state:** VERIFIED LOCAL FACT.  
**Inspected local revision:** Eigent 6bb55842f73766f7b219aa5ef5bcf5965f3acdaa.  
**Method:** direct source inspection plus a read-only delegated audit. No ACS or
Eigent files were modified by the audit.

The targeted source paths had no uncommitted diff against that revision at the
time of inspection. Other unrelated local Eigent changes were not treated as
audit evidence.

## Audit boundary

The review was limited to workforce/team identity, roles, coordinator behavior,
decomposition, assignment, dependency handling, scheduling, shared state,
failure/recovery, persistence, events/evidence, usage/cost, and provider/runtime
coupling. Eigent is not an ACS dependency.

## Primitives

| Eigent primitive | Purpose and source | Ownership / assumptions | Useful ACS property | Incompatible ACS property | Decision |
| --- | --- | --- | --- | --- | --- |
| Workforce subclass | Extends CAMEL BaseWorkforce; accepts coordinator, task, new-worker agents and child workers. backend/app/utils/workforce.py:155-219 | Identity/state derive from CAMEL objects and runtime configuration. | Role specialization shape. | Not a durable ACS roster or identity. | REJECT |
| Dual worker identity | CAMEL node_id is translated to Eigent agent_id for UI assignment. backend/app/utils/workforce.py:546-675; CAMEL base.py:35-70 | Process/object and app identity coexist. | Explicit mapping alerts. | No stable institutional identifier. | REJECT |
| Decomposition | Creates TaskChannel, sets runtime state, asks task agent to decompose. backend/app/utils/workforce.py:287-379 | CAMEL Task graph and channel are in memory. | Planner proposal and bounded coordinator-only context. | Mutable provider-produced graph cannot be canonical. | ADAPT |
| Assignment/scheduling | CAMEL finds assignee; local wrapper sends notifications, projects subtask step. backend/app/utils/workforce.py:599-753 | Pending tasks/dependencies/assignees live in CAMEL channel memory. | Assignment rationale and dependency visibility. | Queue/scheduler loses authority/restart safety. | REJECT |
| SingleAgentWorker | Formats dependency results, invokes agent, records attempts/token usage in Task additional_info. backend/app/utils/single_agent_worker.py:76-375 | Provider execution and mutable Task payload. | Normalized worker observation dimensions. | Task additional_info is not canonical evidence/cost. | ADAPT |
| Bounded delegation | Depth-limited toolkit carries parent context and prevents uncontrolled recursion. backend/app/agent/toolkit/depth_limited_agent_toolkit.py:28-112 | CAMEL/execution-context dependent. | Parent/child correlation and depth limit. | Cannot create canonical Tasks by itself. | ADAPT |
| TaskLock | Holds queues, history, memory snapshots and background tasks. backend/app/service/task.py:411-440 | Process-local interactive state. | Projection/reconciliation need is visible. | Not durable canonical state. | REJECT |
| RunStepCoordinator | Replays append-only step facts and uses deterministic step ids. backend/app/run_runtime/step_coordinator.py:68-189,219-276 | Eigent SQLite RunJournal. | Event-shaped step facts, causation, evidence refs. | Desktop journal remains local authority. | ADAPT |
| RunJournal | SQLite records runs, attempts, events, evidence gaps, model calls and outbox-like records. backend/app/run_journal/models.py:28-216,349-375,863-910; store.py:2304-2333 | Desktop-local SQLite journal with optimistic concurrency. | Explicit interruption, unknown outcome, evidence gap and idempotency patterns. | Separate canonical store and local durability. | ADAPT |
| Workforce-to-journal projection | Persists delegated subtask step before UI fact, but marks degraded on failure. backend/app/utils/workforce.py:78-137 | Projection can fail open for UX. | Deterministic subtask correlation and observable gaps. | ACS execution claims must not fail open. | ADAPT |
| Retry/replan | CAMEL failure handling retry/replan; local failure counters. backend/app/utils/workforce.py:196-214,926-977 | Model/CAMEL policy decides recovery. | Distinguish retryable and terminal outcomes. | External framework cannot own retry authority. | REJECT |
| Runtime coordinator | Admission serializes a Run, cancellation/deadlines/recovery coordinate live handles. backend/app/run_runtime/coordinator.py:217-280,520-652,887-990 | In-process handles with SQLite backing. | Per-Run admission serialization and explicit deadline/cancel outcomes. | Runtime is not ACS shared control plane. | ADAPT |
| Per-agent workspaces | Per-Run/Agent worktree, lease, serialized merge, recovery. backend/app/workspace_git/workforce.py:65-190,192-300 | Git workspace execution isolation. | Isolation, lease, merge recovery pattern. | Not Workforce membership or identity. | ADAPT |
| Provider/session plumbing | CAMEL is pinned; RunContext carries provider/model/credentials; remote sessions are local-memory and Gemini-specific. backend/pyproject.toml:1-40; backend/app/run_context/context.py:25-135; backend/app/remote_sub_agent/session_store.py:1-120 | Direct provider/runtime coupling. | Capture provider observations as adapter data. | Provider semantics cannot enter Workforce Core. | REJECT |

## Mandatory extraction-field register

The following register separates every mandatory extraction field for the
relevant primitives. The audited paths matched local commit
`6bb55842f73766f7b219aa5ef5bcf5965f3acdaa`; the targeted paths were inspected
as local source, not imported or executed by ACS.

### 1. EIGENT PRIMITIVE — CAMEL-backed Workforce subclass

- **Purpose:** coordinate child workers and CAMEL task processing.
- **Source location:** `backend/app/utils/workforce.py:155-219`.
- **Dependencies:** `camel.societies.workforce.BaseWorkforce`, CAMEL
  `ChatAgent`, CAMEL task/channel/event types.
- **State ownership:** mutable workforce state, pending tasks, and snapshots in
  the CAMEL object graph.
- **Identity ownership:** `api_task_id`, process object identity, and CAMEL node
  identifiers; no durable institutional Workforce identifier.
- **Runtime assumptions:** one running Python process manages the live object.
- **Provider assumptions:** coordinator, task, and new-worker agents are CAMEL
  model-facing agents.
- **Persistence assumptions:** no ACS-compatible Workforce repository; any
  surrounding persistence is an external projection.
- **Useful ACS property:** specialized member roles can be expressed separately
  from an individual Agent identity.
- **Incompatible ACS property:** canonical identity and mutable coordination
  live in a framework object rather than the ACS control plane.
- **Decision:** **REJECT**. ACS owns Workforce identity and roster state.

### 2. EIGENT PRIMITIVE — Dual worker identity mapping

- **Purpose:** map CAMEL `node_id` task assignees to an application `agent_id`
  used by the UI.
- **Source location:** `backend/app/utils/workforce.py:552-566,599-656`.
- **Dependencies:** CAMEL child-node implementation and child worker fields.
- **State ownership:** mapping is derived from the in-memory child list.
- **Identity ownership:** CAMEL owns `node_id`; the local worker object carries
  `agent_id`.
- **Runtime assumptions:** worker children remain attached to the process-local
  Workforce object.
- **Provider assumptions:** none needed for the mapping itself, but the child
  is a CAMEL execution worker.
- **Persistence assumptions:** no durable mapping or revision pinning.
- **Useful ACS property:** assignment contracts need an explicit, auditable
  distinction between member-slot identity and Agent identity.
- **Incompatible ACS property:** a volatile node/object mapping cannot define
  canonical membership.
- **Decision:** **REJECT**. ACS member slots and Agent revisions replace this
  identity shape without reusing its identifiers.

### 3. EIGENT PRIMITIVE — Task decomposition and in-memory graph admission

- **Purpose:** validate a task, create a `TaskChannel`, decompose it through a
  task agent, and queue resulting subtasks.
- **Source location:** `backend/app/utils/workforce.py:287-379,381-389`.
- **Dependencies:** CAMEL `Task`, `TaskChannel`, decomposition prompt, and task
  agent.
- **State ownership:** task state, channel, pending-task deque, and snapshots
  live in the CAMEL Workforce process.
- **Identity ownership:** CAMEL task ids identify the graph nodes.
- **Runtime assumptions:** decomposition is synchronously initiated and later
  executed by the same live Workforce object.
- **Provider assumptions:** decomposition prompt is executed by a model-facing
  CAMEL task agent.
- **Persistence assumptions:** graph is not an ACS append-only Workflow/Task
  record at proposal time.
- **Useful ACS property:** a planner proposal may need bounded coordinator-only
  context and must be distinguishable from admitted Tasks.
- **Incompatible ACS property:** provider-produced mutable graph cannot become
  canonical Run/Task state without ACS validation and admission.
- **Decision:** **ADAPT** as `CoordinationProposal` input only.

### 4. EIGENT PRIMITIVE — Assignment and scheduler behavior

- **Purpose:** ask CAMEL to find assignees, inspect dependencies, and publish
  queued/running worker notifications.
- **Source location:** `backend/app/utils/workforce.py:599-753`.
- **Dependencies:** CAMEL `_find_assignee`, TaskChannel, TaskLock, UI queue
  messages, and worker objects.
- **State ownership:** assignment, dependencies, and task queue state are
  mutable CAMEL/process-local state.
- **Identity ownership:** assignee is initially a CAMEL node id and is mapped
  to an application agent id.
- **Runtime assumptions:** a live queue and background notification tasks are
  available.
- **Provider assumptions:** assignees are CAMEL worker agents that eventually
  invoke configured models.
- **Persistence assumptions:** step projection is auxiliary and can degrade;
  there is no authoritative transaction with Task state.
- **Useful ACS property:** assignment rationale, dependency visibility, and
  reassignment history require explicit canonical records.
- **Incompatible ACS property:** an in-memory engine cannot own scheduling,
  Task assignment, or restart recovery.
- **Decision:** **REJECT** as an authority; retain only the requirement for
  ACS-owned coordination decisions.

### 5. EIGENT PRIMITIVE — SingleAgentWorker execution observation

- **Purpose:** format dependency outputs, invoke a worker, and record mutable
  attempt/token details on task metadata.
- **Source location:** `backend/app/utils/single_agent_worker.py:40-375`.
- **Dependencies:** CAMEL `SingleAgentWorker`, CAMEL task/result types, and
  provider-facing worker agent.
- **State ownership:** execution result and usage details are kept in mutable
  task `additional_info` and worker execution state.
- **Identity ownership:** CAMEL task/worker identifiers identify the work.
- **Runtime assumptions:** worker is invoked inside a CAMEL execution context.
- **Provider assumptions:** worker calls are model/provider executions.
- **Persistence assumptions:** metadata is not an immutable evidence or
  accounting ledger.
- **Useful ACS property:** normalized observations should include dependency,
  attempt, timing, and usage dimensions.
- **Incompatible ACS property:** mutable provider-facing task metadata cannot
  be canonical evidence, cost, or Attempt state.
- **Decision:** **ADAPT** as normalized executor observation vocabulary only.

### 6. EIGENT PRIMITIVE — Depth-limited delegation toolkit

- **Purpose:** expose delegation while bounding nesting depth and propagating
  parent context.
- **Source location:**
  `backend/app/agent/toolkit/depth_limited_agent_toolkit.py:28-112`.
- **Dependencies:** Eigent tool framework and current execution context.
- **State ownership:** depth and parent context are execution-local.
- **Identity ownership:** delegated children inherit runtime task context rather
  than receiving ACS Task identity.
- **Runtime assumptions:** a tool-running Agent has a live parent execution.
- **Provider assumptions:** delegated action is available to the executing
  agent/model tool loop.
- **Persistence assumptions:** no durable parent/child Task admission occurs at
  the toolkit boundary.
- **Useful ACS property:** depth limits and parent/child causation are valuable
  policy inputs for a later Workflow contract.
- **Incompatible ACS property:** a tool invocation cannot create canonical
  Tasks or grant delegated authority.
- **Decision:** **ADAPT** as a bounded-delegation constraint and correlation
  requirement.

### 7. EIGENT PRIMITIVE — TaskLock process-local state

- **Purpose:** retain queues, background tasks, history snapshots, and user
  interaction state for an API task.
- **Source location:** `backend/app/service/task.py:411-490,802-854`.
- **Dependencies:** Python `asyncio` queue/tasks and process-global lock map.
- **State ownership:** one application process owns mutable TaskLock state.
- **Identity ownership:** keyed by local API task id.
- **Runtime assumptions:** the originating process remains alive and shares its
  global dictionary with all operations.
- **Provider assumptions:** none intrinsic.
- **Persistence assumptions:** RunJournal writes can fail while UI processing
  continues in degraded mode.
- **Useful ACS property:** canonical facts and read-model/UI projections must
  be explicitly separated and reconciled.
- **Incompatible ACS property:** process-local state cannot be a durable shared
  control-plane store.
- **Decision:** **REJECT**.

### 8. EIGENT PRIMITIVE — RunStepCoordinator and deterministic step facts

- **Purpose:** author/replay step lifecycle facts with deterministic step ids
  over the RunJournal.
- **Source location:** `backend/app/run_runtime/step_coordinator.py:45-189,222-290`.
- **Dependencies:** SQLiteRunJournal, deterministic-id helpers, and local step
  models.
- **State ownership:** step history is owned by the desktop RunJournal.
- **Identity ownership:** deterministic step id is derived in the local run
  journal namespace.
- **Runtime assumptions:** coordinator has a bound journal and live run handle.
- **Provider assumptions:** none intrinsic to fact projection.
- **Persistence assumptions:** SQLite is the local durable authority.
- **Useful ACS property:** event-shaped facts require deterministic correlation,
  causation, and explicit phase transitions.
- **Incompatible ACS property:** a desktop journal cannot become ACS canonical
  events/evidence authority.
- **Decision:** **ADAPT** the fact vocabulary into ACS EventEnvelope/outbox.

### 9. EIGENT PRIMITIVE — SQLite RunJournal

- **Purpose:** persist desktop-local runs, attempts, events, model calls,
  evidence gaps, outbox-like records, and recovery metadata.
- **Source location:** `backend/app/run_journal/models.py:28-216,349-375,863-910`;
  `backend/app/run_journal/store.py:2304-2333,10257-10320`.
- **Dependencies:** SQLite, local filesystem paths, and Eigent journal models.
- **State ownership:** the desktop application owns its journal database.
- **Identity ownership:** local RunJournal record identifiers and API task ids.
- **Runtime assumptions:** one desktop's journal is available for recovery and
  projection.
- **Provider assumptions:** it records provider/model facts but does not remove
  their runtime coupling.
- **Persistence assumptions:** local SQLite, optimistic concurrency, and local
  outbox leases provide the authoritative record.
- **Useful ACS property:** unknown outcomes, interruption, evidence gaps,
  idempotency conflicts, and optimistic-concurrency failures should be explicit
  ACS facts.
- **Incompatible ACS property:** it is a second canonical persistence system
  outside shared PostgreSQL.
- **Decision:** **ADAPT** the recovery/evidence patterns only. The store and
  identity ownership remain incompatible properties and are not adopted.

### 10. EIGENT PRIMITIVE — Workforce step projection

- **Purpose:** persist a delegated subtask step before publishing a UI/runtime
  fact and mark the task degraded if persistence fails.
- **Source location:** `backend/app/utils/workforce.py:78-137`; supporting
  journal projection in `backend/app/run_journal/store.py:10257-10320`.
- **Dependencies:** TaskLock, current RunContext, SQLiteRunJournal, stable step
  id helper.
- **State ownership:** the journal owns the step; TaskLock carries local
  degraded state.
- **Identity ownership:** local run id and generated step id.
- **Runtime assumptions:** background tasks can outlive ContextVar scope and
  fall back to TaskLock context.
- **Provider assumptions:** none intrinsic to the projection.
- **Persistence assumptions:** a failed projection is deliberately fail-open
  for local user experience.
- **Useful ACS property:** evidence completeness and projection failures must
  be observable and correlated.
- **Incompatible ACS property:** ACS canonical Task completion cannot fail open
  when the required canonical fact was not committed.
- **Decision:** **ADAPT** explicit incomplete-evidence semantics only.

### 11. EIGENT PRIMITIVE — Retry and replan behavior

- **Purpose:** configure CAMEL retry/replan strategies and recover failed work.
- **Source location:** `backend/app/utils/workforce.py:196-214,926-977`.
- **Dependencies:** CAMEL `FailureHandlingConfig`, Workforce task state, and
  configured coordinator/worker agents.
- **State ownership:** retry counters and replan behavior reside in framework
  execution state.
- **Identity ownership:** recovery operates on CAMEL task/worker identities.
- **Runtime assumptions:** a live Workforce process can retry or replan.
- **Provider assumptions:** model/CAMEL policy may influence recovery choice.
- **Persistence assumptions:** recovery state is not the ACS Run/Task/Attempt
  ledger.
- **Useful ACS property:** terminal, retryable, unknown, and reassignment
  outcomes must be distinct.
- **Incompatible ACS property:** external model/framework policy cannot admit
  retries, select a replacement, or override governance/budget controls.
- **Decision:** **REJECT** as execution authority.

### 12. EIGENT PRIMITIVE — Runtime coordinator

- **Purpose:** serialize Run admission, manage live handles, cancellation,
  deadlines, and recovery coordination.
- **Source location:** `backend/app/run_runtime/coordinator.py:217-280,520-652,887-990`.
- **Dependencies:** SQLiteRunJournal, in-process handle registry, and local
  runtime services.
- **State ownership:** process-local handles with facts stored in RunJournal.
- **Identity ownership:** local Run and runtime-handle identifiers.
- **Runtime assumptions:** a Brain process manages the handles; handle loss on
  restart is an expected condition.
- **Provider assumptions:** runtime executes provider-bound work through local
  service paths.
- **Persistence assumptions:** SQLite backs durable facts while handle state is
  reconstructed/managed locally.
- **Useful ACS property:** admission serialization, explicit deadline/cancel
  results, and loss-of-handle recovery are necessary runtime behaviors.
- **Incompatible ACS property:** a desktop runtime cannot replace ACS shared
  control-plane coordination, leases, or fencing.
- **Decision:** **ADAPT** the runtime behavior requirements into ACS Runtime
  Core; do not adopt the coordinator.

### 13. EIGENT PRIMITIVE — Per-Run, per-Agent Git workspaces

- **Purpose:** isolate Agent file work in a Run worktree, lease it, merge it
  serially, and recover merge state.
- **Source location:** `backend/app/workspace_git/workforce.py:65-190,192-315`.
- **Dependencies:** SQLiteRunJournal, Git/content repository services, local
  filesystem worktrees, and lease tokens.
- **State ownership:** workspace records and Git-operation state are journal
  records; files are local worktrees.
- **Identity ownership:** workspace id derives from local Run and Agent ids.
- **Runtime assumptions:** filesystem, Git repo lock, and local content service
  are accessible to the executor.
- **Provider assumptions:** none intrinsic.
- **Persistence assumptions:** journal-backed local workspace/merge recovery.
- **Useful ACS property:** execution isolation, lease ownership, idempotent
  merge recovery, and conflict evidence belong beneath Runtime/Executor.
- **Incompatible ACS property:** a workspace lease is not Workforce membership
  or canonical Agent/Workforce identity.
- **Decision:** **ADAPT** as a future executor isolation pattern only.

### 14. EIGENT PRIMITIVE — Provider and remote-session plumbing

- **Purpose:** carry per-Run credentials/model configuration into third-party
  execution and retain remote sub-agent sessions in memory.
- **Source location:** `backend/app/run_context/context.py:27-125`;
  `backend/app/remote_sub_agent/session_store.py:21-76`;
  `backend/pyproject.toml:7-30`.
- **Dependencies:** environment variables, provider API keys, CAMEL, and an
  in-memory remote-session map; `camel-ai[eigent]==0.2.91a7` is pinned.
- **State ownership:** execution context and sessions are process-local;
  secrets are carried to runtime code.
- **Identity ownership:** remote sessions use provider, API task id, remote
  agent name, and generated session id.
- **Runtime assumptions:** a local process publishes selected environment
  overrides for third-party libraries.
- **Provider assumptions:** explicit OpenAI-compatible/Gemini-style provider,
  model, key, and remote-agent semantics are present.
- **Persistence assumptions:** session store has no durable backing.
- **Useful ACS property:** adapters must report provider/executor observations
  with redaction and clear source metadata.
- **Incompatible ACS property:** provider, credential, and session fields must
  not enter Workforce Core or own canonical history.
- **Decision:** **REJECT** for Workforce; provider observations remain below the
  Runtime/Executor adapter boundary.

## Findings

Eigent contains valuable execution-local mechanisms, particularly explicit
interruption/unknown-outcome handling, event-shaped subtask projection, bounded
delegation, and worktree isolation. Its multi-agent truth is split between
CAMEL object graphs, TaskChannel queues, TaskLock process state, configured
models, and a desktop-local SQLite journal. Those assumptions conflict with
ACS shared canonical identity, durable control-plane state, provider neutrality,
and runtime fencing.

The ownership split is therefore:

- ACS owns definitions, revisions, Run/Task truth, evidence, costs, governance,
  and persistence.
- An optional external engine may propose decomposition, assignment, or
  observations through an adapter.
- Runtime/executor owns actual bounded execution and reports observations.
- Eigent source remains removable reference material, not a dependency.
