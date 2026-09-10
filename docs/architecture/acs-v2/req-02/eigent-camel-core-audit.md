# ACS-V2-REQ-02 — Eigent + CAMEL Workforce Core Audit

**Role:** Sub-Agent B — Eigent / CAMEL Workforce Auditor
**Audit date:** 2026-09-10
**Scope:** read-only inspection of `/home/mzfshark/.eigent`, including its installed, locked `camel-ai[eigent]` distribution. No source, configuration, credential, runtime-state, or external-service change was made. This report was written outside Eigent and then reconciled into this ACS documentation package.

## Executive recommendation

**Recommendation: `ACS Workforce Core → ACS-owned orchestration contracts` and the existing ACS durable runtime; do not make Eigent a runtime dependency. CAMEL is eligible only as a removable planner/graph-proposal adapter in future separately authorized PoCs.**

Eigent source implements several valuable application mechanisms: task decomposition, worker selection, dependency-aware execution, pause/resume/stop controls, human approval waits, task progress streaming, and a durable run journal that projects workforce subtasks into execution evidence. Its `Workforce` class is, however, an application-specific subclass of CAMEL that directly imports CAMEL internals and also couples desktop state, SSE/UI actions, task locks, local files, browser cleanup, and local policy mechanics. Reusing Eigent as a service/library would inherit this coupling.

CAMEL currently implements in-process workforce mechanisms: `Task`, `TaskChannel`, worker-node/pool execution, assignment, DAG dependency gating, auto-decomposition and predefined pipeline modes, recovery strategies, snapshots, pause/resume/stop, and callback events. This is evidence about CAMEL's current package behavior, not a proposed ACS ownership model. Its state, snapshots, callbacks, and channel are in-memory; its agent model is `ChatAgent`-centric; its semantic contracts are not ACS-owned; and `camel-ai==0.2.91a7` is an alpha release. ACS should **ADAPT** only its planner/decomposition, assignment-rationale, and graph-validation concepts for a bounded future PoC, while **REIMPLEMENTING** the canonical task graph, task workload schema, policy gates, evidence, cost attribution, and integration API on top of the existing ACS durable runtime.

This rules out `ACS → Eigent → CAMEL` as a target. It also rejects copying the Eigent desktop product/runtime. The target is:

```text
ACS Workforce Core (canonical definitions, DAG, policy, evidence, lifecycle)
  ├─ ACS-native deterministic and dynamic graph admission
  ├─ ACS task workload schema and TaskRun lifecycle
  ├─ existing ACS RuntimeJob / worker / lease / fencing substrate
  └─ optional CAMEL planner/graph-proposal adapter
       └─ untrusted proposal only; no CAMEL dispatch, TaskChannel, worker pool,
          retry/checkpoint truth, or canonical mutation
```

## Scope and method

1. Read applicable repository instructions before inspection. The only tracked target instruction file was `/home/mzfshark/.eigent/AGENTS.md`; its UI and terminology instructions do not apply to this read-only backend audit.
2. Used `rg`/tracked-file discovery first, then inspected the backend manifest, root license, git identity, workforce subclass, application wiring, CAMEL package installed in the backend virtual environment, tests, run journal, policy runtime, controller/SSE surface, and telemetry.
3. Treated source code as confirmed implementation; README claims as docs-only; tests as verification evidence for specific behavior; installed CAMEL code as the exact locally resolved dependency implementation. No live execution was performed.
4. Preserved uncertainty: no upstream CAMEL source checkout or exact upstream CAMEL git commit was present; only package metadata/version was available.

## Repository identity and baseline

| Item | Finding | Confidence / evidence |
|---|---|---|
| Eigent repository | `https://github.com/eigent-ai/eigent.git` (`origin`) | Confirmed by local git remote. |
| Eigent revision inspected | `6bb55842f73766f7b219aa5ef5bcf5965f3acdaa`; `main`; describe `v1.0.4-dirty`; commit subject `release v1.0.4 (#1905)`, dated 2026-09-04T23:38:33+08:00 | Confirmed local git metadata. |
| Worktree baseline | Dirty before audit: 19 modified tracked files, including auth/controller/electron/frontend/config files. No audit modification was made in this repository. | Confirmed `git status --short -uno`; user changes must remain out of scope. |
| Eigent backend runtime | Python `>=3.11,<3.12`, `camel-ai[eigent]==0.2.91a7`, FastAPI, OpenAI client, Qdrant, OpenTelemetry/OTLP. | Confirmed manifest. |
| CAMEL inspected | Installed package at `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel`; installed version `0.2.91a7`. | Confirmed local package metadata. |
| CAMEL upstream identity | Package metadata says homepage `https://www.camel-ai.org/`, repository `https://github.com/camel-ai/camel`. Exact source commit was not included in installed metadata. | Confirmed metadata; commit unknown. |

## Architecture map and responsibility attribution

```text
Eigent desktop / FastAPI application
  ├─ Chat service constructs coordinator, task-planner, worker agents
  ├─ Eigent Workforce subclass
  │    ├─ application task ID / TaskLock / UI action queue
  │    ├─ durable run-step projection into SQLite journal
  │    ├─ timeout and stall-watchdog overlay
  │    ├─ pause/resume/stop wrappers and desktop resource cleanup
  │    └─ delegates core scheduling to CAMEL BaseWorkforce
  ├─ Permission policy runtime / human-input queues / durable approvals
  ├─ SQLite RunJournal / event replay / SSE run event stream
  └─ OpenTelemetry callback, optionally exported to Langfuse

CAMEL library
  ├─ Task + task decomposition / result validation
  ├─ Workforce state machine and modes: AUTO_DECOMPOSE, PIPELINE
  ├─ coordinator assignment and optional worker creation
  ├─ TaskChannel: in-memory condition, task/status indexes, queues
  ├─ SingleAgentWorker + ChatAgent pool
  ├─ dependency-aware scheduling, parallel ready tasks
  ├─ retry/replan/skip failure handling, snapshots, intervention APIs
  └─ callback events / metrics abstractions
```

### Confirmed runtime/data-flow trace

1. Eigent detects a complex request and constructs or reuses its application `Workforce`; it creates `camel.tasks.Task` with a product task ID and optional attachment metadata. This is an application flow, not a generic external workflow API.
2. `Workforce.eigent_make_sub_tasks()` resets CAMEL state, creates an in-memory `TaskChannel`, marks the workforce running, then asks the CAMEL task agent to decompose the root task. Eigent allows coordinator-only context during this phase and explicitly says it will not send that context to worker agents.
3. `Workforce.eigent_start()` replaces CAMEL pending work with the user-edited subtask list, saves a CAMEL in-memory snapshot, then invokes `BaseWorkforce.start()`.
4. CAMEL starts each child worker listener concurrently, then listens to the `TaskChannel`. CAMEL calls a coordinator to assign tasks, records dependencies, posts only dependency-ready tasks, and workers atomically claim tasks through `TaskChannel`. Independent ready work may run concurrently through workers/agent pools.
5. Eigent overrides assignment/post/completion/failure hooks to map CAMEL node IDs to desktop agent IDs; publish UI queue actions; attempt a workforce-step projection to its local run journal before dispatch; and record CAMEL metrics events. The projection helper is fail-open: on persistence failure it marks local history degraded and can return control to continuing application flow.
6. Worker output returns through the in-memory channel. Eigent adds a hard timeout option plus a sliding no-progress watchdog that observes `TaskLock.execution_progress_revision`; by default the hard cap is disabled and stall timeout is 1,800 seconds.
7. Tool dispatch is governed outside CAMEL. Eigent requires a durable tool checkpoint and admitted `RunContext`; policy may deny or create a durable approval, pause active timeout accounting, wait for human input, then revalidate the approval/action digest before dispatch.
8. The local SQLite journal persists run/run-attempt/event/tool/approval/human-interaction/model-invocation facts and exposes replay-plus-live SSE. This is much more durable than CAMEL’s `WorkforceSnapshot`, which remains an in-process object list.

## Major capability attribution

| Capability | Eigent contribution | CAMEL contribution | Eigent-specific application/runtime infrastructure | Assessment |
|---|---|---|---|---|
| Workforce definition | Builds a configured subclass with desktop task ID and agents. | `Workforce` object has description, child nodes, coordinator/task/new-worker agents, modes/config. | Desktop prompt/tool factories. | CAMEL concept valuable; ACS owns canonical definition. |
| Coordinator / planner | Eigent constructs prompts and passes coordinator-only context. | Coordinator assigns; task agent decomposes structured tasks. | Prompt wording, desktop workspace assumptions. | Adapt planning/assignment interfaces, not prompts. |
| Worker model | Wraps `ListenChatAgent` in Eigent `SingleAgentWorker`; maps node IDs to application IDs. | `SingleAgentWorker`, `ChatAgent` pool, nested workforce support. | Browser/CDP resource cleanup. | Evidence of current local execution only; ACS reimplements executor-neutral workload binding on its existing worker/lease substrate. |
| DAG/dependencies | Updates decomposition dependencies and forwards them to UI. | Stores assignments/dependencies, gates ready work, pipeline builder validates cycles. | UI task editing/decomposition streaming. | Reimplement canonical DAG; optional CAMEL adapter. |
| Parallelism | Observes and surfaces activity. | Starts child listeners concurrently; agent pools and `asyncio.gather` support concurrent processing. | Local event-loop/task-lock bridging. | Evidence of local process concurrency only; ACS owns concurrency, quotas, fairness, and backpressure through its durable runtime. |
| Channel / handoff | Converts state to UI action queue. | `TaskChannel` handles in-memory post/claim/return/archive. | `TaskLock` queues and per-agent human input. | Reimplement durable task dispatch/handoff protocol. |
| Context / shared state | Coordinator context deliberately scoped; captures memory snapshots. | Optional shared memory and workflow-memory mechanisms. | TaskLock conversation history, local workspace/memory. | Reimplement scoped context references and memory policy. |
| Retry/recovery | Adds decomposition retry and watchdog; chooses retry/replan strategies. | Failure handling, max retry, replan/skip and dependency propagation. | Local timeout event and UI notification. | Adapt policy concepts; reimplement durable retry state. |
| Pause / resume / cancel | UI actions invoke `pause`, `resume`, immediate/graceful stop; pauses timeout budget for human waits. | State enum, pause event, snapshots, force stop. | TaskLock and human queues; local cleanup. | Reimplement ACS lifecycle with idempotent API/event semantics. |
| HITL / approval | Strong implementation with action digest and durable approval records. | Interactive pause/resume/snapshot only; no governance semantics evidenced. | Permission profiles/rules, local live-process attestation. | Reimplement as ACS governance integration; preserve conceptual pattern. |
| Evidence / events | Projects workforce subtasks to run journal before UI/dispatch; replays SSE. | Callback event classes/metrics only. | SQLite journal, outbox, local UI/SSE. | Reimplement ACS canonical evidence ledger; do not derive truth from CAMEL callbacks. |
| Telemetry | OTel callback tags events as `eigent/camel/workforce`; optional Langfuse export. | Callback / workforce metrics event protocol. | Environment-driven OTLP/Langfuse configuration. | Adapt event-to-telemetry exporter only. |
| Persistence / restart | SQLite WAL/full sync local journal, attempts, approvals, model calls. | Snapshots held in process memory; no durable scheduler store evidenced. | Desktop-owned database/recovery. | Reimplement ACS persistence. |
| Cost accounting | Captures token fields in `model_invocations`; no normalized workforce/task cost, price, budget enforcement, or settlement ledger found. | No ACS-ready cost ledger found. | None material. | Reimplement. |

## Canonical workforce model mapping

| Canonical ACS Workforce field | Confirmed available primitive | Source | Decision | Rationale |
|---|---|---|---|---|
| `identity` | CAMEL node ID; Eigent `api_task_id`; local run/project IDs | Both | REIMPLEMENT | IDs are runtime/desktop scoped; ACS needs stable workforce definition and version identities. |
| `domain` | No first-class workforce domain model found. | Neither | REIMPLEMENT | Required for ACS product isolation. |
| `objective` | Workforce `description`, root `Task.content`. | CAMEL | ADAPT | Useful input fields, but need typed objective/input contracts. |
| `participating_agents[]` | CAMEL child nodes/worker pools; Eigent `new_agents`. | Both | ADAPT | Preserve composition semantics; bind ACS agent-version IDs and executor eligibility. |
| `coordinator` | `coordinator_agent`; assignment call. | CAMEL | ADAPT | Use as pluggable coordinator policy; prohibit provider-specific agent internals in ACS model. |
| `workflow` | CAMEL `AUTO_DECOMPOSE` and `PIPELINE` modes. | CAMEL | ADAPT | Explicitly retain deterministic vs dynamic distinction in ACS. |
| `task_graph` | Task dependencies and pipeline builder/cycle validation. | CAMEL | ADAPT for PoC; REIMPLEMENT durable graph | Strong reference implementation but in-memory/ChatAgent coupled. |
| `execution_policy` | Mode, max pending tasks, worker pool, failure config. | CAMEL | ADAPT | Normalize as ACS policies with explicit versions. |
| `concurrency_policy` | Child listeners, pool max size, async gather. | CAMEL | REIMPLEMENT | ACS needs fair scheduling, tenant/product quotas, executor-aware capacity. |
| `retry_policy` | CAMEL retry/replan/skip; Eigent three planner retries/watchdog. | Both | ADAPT | Retain declarative policy but persist attempt/retry graph. |
| `context_policy` | `share_memory`, workflow memory; Eigent coordinator-only context. | Both | REIMPLEMENT | Need domain/product isolation and reference-based context provenance. |
| `budget` | No workforce budget enforcement found. | Neither | REIMPLEMENT | Required ACS economics. |
| `approval_policy` | Eigent durable policy/approval integration. | Eigent infrastructure | ADAPT concept, REIMPLEMENT ACS contract | Valuable behavior, but tied to TaskLock/SQLite desktop state. |
| `evidence_policy` | Eigent attempts a journal projection before UI queue publication/dispatch. | Eigent infrastructure | ADAPT observation, REIMPLEMENT ACS guarantee | The helper is fail-open and marks local history degraded on persistence failure; use a durable ACS outbox/command transaction for authoritative transitions. |
| `lifecycle` | CAMEL IDLE/RUNNING/PAUSED/STOPPED; Eigent run statuses/attempts. | Both | REIMPLEMENT | ACS needs durable, externally addressable, idempotent lifecycle including cancellation and resume. |

## Reuse classification

### ADOPT

No architectural component qualifies for ADOPT as-is. Dependency-cycle validation remains an ADAPT candidate after exact-file review; license/notice retention is an obligation, not an adopted runtime capability. This sprint imports no code.

### ADAPT

| Primitive | Origin | Why valuable | Required ACS adaptation |
|---|---|---|---|
| Dynamic decomposition, assignment rationale, and dependency proposal | CAMEL | Supplies useful planner-facing concepts for proposing work decomposition and dependency relationships. | Expose only a removable planner/graph-proposal adapter. ACS validates, versions, and persists the graph before compiling TaskRuns to its existing runtime. |
| `PipelineTaskBuilder` sequence/fork/join/dependency/cycle concepts | CAMEL | Good deterministic workflow vocabulary. | Rebuild graph compiler/validator as ACS-owned schema; deterministic plans must not depend on LLM parsing. |
| `FailureHandlingConfig` retry/replan/skip concepts | CAMEL | Useful vocabulary for a planner to propose recovery alternatives. | ACS runtime remains the source of retry/cancellation/recovery truth; persist policy/version and each admitted decision in ACS. |
| Workforce callback event taxonomy | CAMEL | Useful event vocabulary: worker/task created, decomposed, assigned, started, updated, completed, failed. | Translate into versioned ACS evidence events with causation/correlation, actor, executor and cost dimensions. |
| Workload stall watchdog and timeout exclusion during human approval | Eigent | Operationally sound distinction between active time and human wait. | Make it generic, durable, executor-neutral, and policy-controlled. |
| Attempt workforce-step evidence before UI notification/dispatch | Eigent | Tests assert `persist`, `queue`, `dispatch`; the implementation marks local history degraded and continues if persistence fails. | Treat as a fail-open observation pattern only. ACS must use durable outbox/command semantics for authoritative state and dispatch. |
| Tool approval action-digest revalidation | Eigent | Protects tool dispatch after HITL. | Integrate into ACS governance core, not workforce engine. |

### REIMPLEMENT

- **Canonical workforce/worker/task graph and lifecycle state machine:** CAMEL state/snapshots are process-local and Eigent is desktop-local. ACS needs durable, versioned definitions and run attempts across executors.
- **Task workload, dispatch, handoffs and shared context:** CAMEL’s in-memory `asyncio.Condition` channel cannot span processes, products or persistent executors. Add an ACS task workload schema that compiles TaskRuns to the existing durable jobs/assignments/leases/fencing substrate; use its idempotency, event/outbox, and typed context/artifact references.
- **Evidence/provenance ledger:** Eigent’s journal is strong evidence of desired behaviors but is explicitly Desktop-owned and includes application-specific schemas. ACS must own the proposed append/correction-oriented cross-product evidence ledger and derive reports from it, preserving explicit incomplete/lost/unavailable source states.
- **Deterministic workflow compiler:** use explicit graph definitions, conditions, joins, retry and compensation policies; do not treat CAMEL pipeline builder or an LLM planner as the system-of-record.
- **Cost center/economic accounting:** record normalized usage at provider/executor/tool level and aggregate by Product → Workforce → Workflow → Agent version → Task → attempt; no source implementation meets this requirement.
- **Governance/domain isolation:** bind every definition/run/task/context/credential/artifact/budget/evidence row to ACS product/domain/tenant scope. CAMEL `share_memory` is too broad for this requirement.
- **Integration APIs:** provide ACS-owned commands/events for run, resume, approve, cancel, query evidence and query cost; Eigent’s internal FastAPI/SSE surface is desktop-specific.

### REJECT

| Component / behavior | Origin | Why reject for ACS core |
|---|---|---|
| CAMEL execution loop, TaskChannel and worker pools | CAMEL | Current mechanisms remain documented as source evidence only. ACS uses its existing durable runtime with an additive task workload schema; the planner adapter has no dispatch or canonical mutation authority. |
| Eigent desktop frontend, Electron packaging, local workspace UX and task UI action protocol | Eigent | Product surface, not control-plane core. |
| Eigent `TaskLock` as canonical state | Eigent | In-process application coordination with queues/memory and desktop task IDs; cannot be a distributed control-plane primitive. |
| Ownership of browser/CDP port cleanup inside workforce core | Eigent | Executor/tool resource concern; belongs behind executor/tool lifecycle contracts. |
| Environment-variable-driven Langfuse setup as canonical telemetry | Eigent | Optional exporter configuration, not evidence truth; telemetry can drop spans. |
| CAMEL `ChatAgent` as ACS agent model | CAMEL | Couples workforce to one library’s agent/harness/model notion and conflicts with Codex, OpenClaw, and direct-model executors. |
| CAMEL in-memory snapshots as ACS checkpointing | CAMEL | Not restart-safe or portable; no evidence of durable checkpoint ledger. |
| CAMEL auto-created workers as unrestricted default | CAMEL | Violates ACS registry/version/governance/budget boundaries unless gated through agent admission. |
| Eigent as an intermediate permanent service (`ACS → Eigent → CAMEL`) | Eigent | Adds desktop UI, local filesystem, TaskLock, SSE and application policy coupling without a stable ACS boundary. |

## Workflow and coordination specification implications

### Required ACS distinction

| Mode | Source inspiration | ACS rule |
|---|---|---|
| Deterministic workflow | CAMEL `PIPELINE`, `PipelineTaskBuilder` | Graph is supplied/versioned before execution. Nodes, dependencies, routing, joins, retries/timeouts and approval gates are deterministic and auditable. |
| Agentic/dynamic workforce | CAMEL auto-decompose/coordinator | Planner may propose a graph or task changes, but ACS validates graph limits, agent eligibility, domain context, policy, budget, and approval requirements before admission/dispatch. |

### Proposed ACS task state model

```text
planned → admitted → queued → leased → running
  ├─ waiting_for_dependency
  ├─ waiting_for_approval
  ├─ retry_scheduled
  ├─ blocked
  ├─ cancelled
  ├─ timed_out
  ├─ failed
  └─ completed
```

Each transition must carry `run_id`, `attempt_id`, `workforce_run_id`, `workflow_version`, `task_id`, `parent_task_id`, `causation_event_id`, `actor`, policy/version references, timestamp, and idempotency/lease information. A task handoff becomes a transition from one assigned worker/executor binding to another; it is not an implicit shared-memory exchange.

### Context and shared-state policy

- Preserve Eigent’s useful coordinator-only context pattern, but make context a set of immutable references with scope labels (`product`, `domain`, `workforce`, `task`, `shared_capability`) and provenance.
- Default to no cross-domain memory sharing. `share_memory=True` in CAMEL is a useful capability signal, not an acceptable default or authorization model.
- Pass dependency outputs as explicit artifact/result references with data classification/redaction policy. Do not concatenate opaque historical chat memory into every worker prompt.
- Checkpointing must record state, graph revision, active leases, tool-call outcomes, pending approvals and context/artifact digests. CAMEL snapshots are local interactive rollback aids only; they are not durable ACS checkpoints, recovery truth, or a compatibility-runtime requirement.

## Persistence, interfaces, events, observability and cost

### Confirmed Eigent persistence/evidence

Eigent contains an extensive local `SQLiteRunJournal`: `runs`, `run_attempts`, ordered `run_events`, tool calls, approvals/human interactions, permission profiles/rules, security audit events, model invocation records/events, an outbox, workspace/memory/git records, and recovery errors. It uses SQLite WAL with `synchronous=FULL`. Its run states include pending/running/waiting-for-user/interrupted/completed/failed/cancelled. Read tests assert a workforce subtask projection is attempted before queueing and dispatch; the implementation remains fail-open when that projection fails, so this is not proof of a durable outbox guarantee.

This is confirmed implementation, but **not portable ACS core code**: class documentation calls it “Desktop-owned Run facts,” and its schema embeds desktop/workspace/git/bundle models. Preserve the invariant and data-model lessons, not the application database as ACS’s long-term schema.

### Confirmed interfaces/events

- Eigent application exposes FastAPI/SSE-oriented control and run-event replay. The run controller emits canonical persisted events followed by live notifications; it emits `replay_caught_up`, `replay_required`, heartbeat and detached-runtime notices as ingress protocol events.
- CAMEL callbacks supply event types around worker creation, task creation/decomposition/assignment/start/update/completion/failure and stream chunks. These are adequate adapter inputs but do not cover ACS provider/executor/tool/approval/cost/provenance requirements.
- `TaskChannel` is an `asyncio.Condition` plus dictionaries/deques. It atomically claims a sent task and supports task post, dependency archive and task return. This confirms single-process concurrency safety, not distributed delivery semantics.

### Proposed ACS evidence event envelope

```json
{
  "event_id": "uuid",
  "event_type": "task.assigned",
  "occurred_at": "RFC3339 timestamp",
  "aggregate": {"run_id": "...", "workforce_run_id": "...", "task_id": "..."},
  "causation_event_id": "...",
  "correlation_id": "...",
  "actor": {"kind": "agent|worker|system|human", "id": "...", "version": "..."},
  "execution": {"provider": "...", "model": "...", "harness": "...", "executor": "..."},
  "policy_refs": {"governance": "...", "budget": "...", "context": "..."},
  "payload": {},
  "payload_digest": "sha256",
  "redaction_policy_version": "..."
}
```

Events required beyond CAMEL: definition/version admission, graph validation, lease acquired/lost, context/knowledge references, tool prepared/dispatched/completed, approval requested/resolved/expired, artifact created, model/provider invocation, usage measured, price calculated, settlement obligation created, retry/backoff, cancellation, resume/reconciliation, and evidence-gap facts.

### Cost/economics finding

Eigent’s `ModelInvocationRecord` includes provider, model, transport, token counts, cache token counts, timing, request/response digests and retry index. This is a valuable metering input, but no normalized price, cost, budget, product/workforce/task allocation, external tool cost, executor cost, or settlement implementation was found in the audited workforce paths. CAMEL workforce metrics capture operational events, not a financial ledger.

ACS should retain **usage → measured cost → internal allocation → price → $Neurons denomination → authorized settlement** as separate ledgers/policies. Workforce completion must be able to finish without any settlement action. `economic-core` should consume finalized evidence/cost events; it must never be embedded in CAMEL callbacks or executor-side task logic.

## Security, permissions and trust boundaries

1. **CAMEL boundary:** untrusted for governance truth. It schedules local `ChatAgent` work and can create/assign workers, but ACS must authorize every worker/executor/tool context before dispatch.
2. **Eigent policy pattern:** valuable. Tool dispatch rejects absent durable checkpoints and absent admitted `RunContext`; it calculates an action digest over the tool action and environment, invokes policy, persists approval, waits for human input without consuming active execution time, then verifies the same approved action digest immediately before dispatch.
3. **Persistence trust caveat:** Eigent’s journal explicitly states durable approval rows alone are not executable authority; an in-memory trusted attestation is required. ACS should retain this principle and make authorization attestations executor-scoped and time-bounded.
4. **Scope boundary required for ACS:** product/domain/tenant isolation has no demonstrated first-class CAMEL implementation. Bind workers, context, knowledge, secrets, budgets, evidence and approval policies to scopes. Cross-domain work requires an explicit shared capability and delegated authority.
5. **Executor boundary:** browser, terminal, filesystem, MCP and remote agents must be executor/tool adapters with independent sandbox and credential policy. The workforce core selects an eligible binding but does not own credentials or directly enact side effects.

## Licensing and code reuse assessment

| Component | Finding | Reuse implication |
|---|---|---|
| Eigent | Root `/home/mzfshark/.eigent/LICENSE` is Apache License 2.0. Source headers state `Copyright 2025-2026 @ Eigent.ai All Rights Reserved` plus Apache-2.0. | Copying/distributing source or derivatives requires Apache-2.0 license notice, retained applicable copyright/patent/trademark/attribution notices, and prominent changed-file notices. Trademark rights are not granted. Legal review still required before copying. |
| CAMEL | Locked and installed `camel-ai==0.2.91a7`; installed package metadata declares `License-Expression: Apache-2.0`; upstream repository URL is `https://github.com/camel-ai/camel`. | Same Apache-2.0 obligations for copied/modifed distribution. Dependency is alpha (`0.2.91a7`), so pin/review supply-chain risks separately. Exact upstream commit unavailable locally. |
| Eigent dependency graph | `backend/uv.lock` locks a broad graph; `camel-ai` extra `eigent`, FastAPI, OpenAI, OTel and Qdrant are present. | A full third-party dependency license/SBOM scan was not performed; this is a blocking legal/supply-chain task before any code import or redistribution. |
| Architectural concepts | Concepts are not copied source. | Reimplementing independently from observed behavior should avoid code copying, but legal review should confirm clean-room/provenance process where risk matters. |

No `NOTICE` file was found in the inspected CAMEL dist-info listing; nevertheless, before code reuse, rerun a full repository/package notice and dependency-license inventory against the exact selected sources/releases.

## Uncertainty, stale/dead-code signals and blockers

| ID | Severity | Finding | Planning impact |
|---|---|---|---|
| ACS-V2-EIGENT-001 | High | CAMEL package is alpha `0.2.91a7`; API internals are directly overridden by Eigent (`_find_assignee`, `_post_task`, `_get_returned_task`, state/private fields). | Do not anchor ACS architecture on these internals. Only a future separately authorized planner/graph-proposal PoC is recommended. |
| ACS-V2-EIGENT-002 | High | CAMEL channel/snapshots are in-memory; no durable distributed scheduling/checkpoint semantics were evidenced. | Reject CAMEL execution ownership. Extend the existing ACS runtime with task workloads and graph/checkpoint references; preserve its leases/fencing. |
| ACS-V2-EIGENT-003 | High | CAMEL `ChatAgent` is the worker substrate; ACS must support Codex/OpenClaw/direct LLM executors. | Blocks direct adoption as canonical agent/workforce runtime. |
| ACS-V2-EIGENT-004 | Medium | Eigent worktree was already dirty in auth, controller, Electron, frontend and tooling areas. | Audit observations remain valid for checked-out source but tests were not run; do not attribute those changes or claim clean release behavior. |
| ACS-V2-EIGENT-005 | Medium | README claims model-agnostic, enterprise and automation capabilities, but this audit traced only local backend/workforce paths. | Treat those broader claims as docs-only until separately evidenced. |
| ACS-V2-EIGENT-006 | Medium | CAMEL upstream commit and complete transitive dependency license inventory are not present in the inspected facts. | Blocks code-import decision, not architecture planning. |
| ACS-V2-EIGENT-007 | Medium | Eigent contains a rich Desktop-owned journal that overlaps target ACS evidence concepts. | Avoid copying schemas wholesale; decide extraction boundary with the ACS Core audit. |

## Candidate future PoCs and validation gates

1. **PoC-WF-01: CAMEL planner/graph-proposal boundary (disposable, separately authorized).** Give CAMEL a bounded planning input and require it to return only a proposed decomposition/dependency graph. ACS validates graph schema, cycles, scope, authority, budget, and resource limits; ACS alone versions and persists the accepted graph. Gate: no CAMEL `Task`, `TaskChannel`, worker-pool, callback, retry, or snapshot object crosses the public boundary.
2. **PoC-WF-02: ACS task workload schema compiled to the existing durable runtime (separately authorized).** Add a task workload schema and map TaskRuns to existing ACS RuntimeJobs, assignments, workers, leases, fencing, cancellation, retry, and recovery. Do not create a second dispatcher, queue, worker registry, or lease store. Gate: duplicate delivery, stale-owner fencing, worker death, timeout, resume, idempotency, and replay tests use the existing substrate.
3. **PoC-WF-03: governed agentic graph admission (separately authorized).** A planner can propose a graph amendment, but ACS validates base graph fingerprint, acyclicity, node/edge/concurrency quotas, agent-version eligibility, domain context, budget, approval policy, and immutable in-flight TaskRuns. Gate: rejected invalid/cross-domain/unbudgeted amendments produce ACS evidence events and do not mutate canonical state.
4. **PoC-WF-04: ACS evidence-to-cost (separately authorized).** Emit provider/executor/tool usage facts from ACS TaskAttempts and aggregate Product → Workforce → Workflow → Agent → Task. Gate: retry/waste attribution is independently queryable; no settlement executes.
5. **PoC-WF-05: HITL across ACS executor resume (separately authorized).** Pause for approval, persist correlation/action digest and durable checkpoint references, restart a simulated ACS worker/controller, and resume only after valid re-attestation. Gate: stale/changed action digest is denied; no CAMEL memory, `TaskChannel`, TaskLock, or snapshot is recovery truth.
6. **Legal gate:** establish exact source/release hashes, NOTICE/copyright inventory, and SBOM/transitive license review before copying any CAMEL/Eigent code.

## Concise answers to the final decision questions

| Question | Recommendation from this audit |
|---|---|
| What should ACS reuse from Eigent/CAMEL? | Reuse concepts only: deterministic versus agentic distinction; planner decomposition/assignment rationale; DAG/dependency and cycle-validation vocabulary; recovery-policy vocabulary; callback/telemetry inputs; active-time/HITL timeout distinction; fail-open projection lesson; and approval-digest revalidation. ACS does not reuse CAMEL workers, pools, TaskChannel, snapshots, retry truth, or dispatch. |
| Does Eigent remain a runtime dependency? | **No.** Eigent is a desktop application/runtime integration layer, not an ACS core dependency boundary. |
| Does ACS depend directly on CAMEL? | **No permanent dependency is recommended.** A future, separately authorized removable planner/graph-proposal PoC may use the pinned package behind an ACS boundary. |
| Who owns coordination? | ACS Workforce/Workflow Core owns graph admission/amendment, task workload state, dispatch, retries, lifecycle, evidence, and canonical mutation. CAMEL may propose planning output only. |
| What remains executor responsibility? | Codex/OpenClaw/direct-model adapters own actual execution, sandbox/process lifecycle, provider-specific interaction and raw tool runtime. Workforce core selects/monitors bindings. |
| How are handoffs/context handled? | Durable task assignment/lease and explicit context/artifact references. No implicit global shared chat memory. |
| How is every execution reconstructed? | The proposed ACS append/correction-oriented evidence ledger records run/attempt/workforce/workflow/task/agent-version/executor/provider/tool/approval/context/artifact/cost events and builds source-qualified projections with explicit incomplete, lost, unavailable, derived, estimated, and reconciled states. |
| How is consumption attributed? | Normalize raw provider/executor/tool usage per task attempt, allocate through Product → Workforce → Workflow → Agent version → Task, then derive internal cost, price and future $Neurons obligation separately. |
| Implementation readiness | **CONDITIONAL GO** for documentation, contracts, schemas, ADRs, and future separately authorized isolated PoCs. **NO-GO** for production migration, permanent dependency adoption, CAMEL runtime ownership, duplicate dispatch infrastructure, or canonical external mutations. |

## Validation limits and follow-up

No tests, server startups, migrations, dependency installs, live inference, or tool executions were run. Test files were read; their presence is not evidence of a current passing suite. The backend manifest/lock and installed CAMEL package were prioritized; the frontend/server dependency graphs and all transitive licenses remain unreviewed. The audit did not prove remote-executor compatibility, production readiness, complete tool authorization coverage, or restart-safe recovery of the full CAMEL task graph. No confirmed dead code was established; direct private-member overrides and legacy compatibility paths are maintenance risks, not proof of dead code. Evidence ranges describe the observed local working tree, not an independently verified pristine upstream release.

## Evidence index

| Evidence | What it proves |
|---|---|
| `/home/mzfshark/.eigent/backend/pyproject.toml:1-30` | Backend dependency contract, including pinned `camel-ai[eigent]==0.2.91a7`, FastAPI, Qdrant and OTel. |
| `/home/mzfshark/.eigent/LICENSE:1-94` | Eigent Apache-2.0 license terms and redistribution obligations. |
| `/home/mzfshark/.eigent/README.md:22-43,105-135` | Docs-only product claims: multi-agent workforce, local deployment, model agnostic, MCP, automation. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:20-66` | Eigent directly imports CAMEL workforce internals/events/channel and Eigent run/policy/UI integrations. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:155-214` | Eigent `Workforce` subclasses CAMEL, configures retry/replan and timeout overlay. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:287-379` | Eigent decomposition/start lifecycle resets state, creates channel, supports editable subtask start and snapshots. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:381-413` | CAMEL task decomposition and dependency update are invoked by Eigent. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:599-745` | Assignment/post hook maps workers, persists workforce steps, emits UI queue actions and passes to CAMEL dispatch. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:747-801` | Eigent worker wrapper/pool/channel attachment and metric event recording. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:1000-1159` | Eigent hard/stall timeout, progress monitor, cancellation and timeout notification behavior. |
| `/home/mzfshark/.eigent/backend/app/utils/workforce.py:1161-1367` | Stop/graceful stop/skip/pause/resume and desktop/browser cleanup coupling. |
| `/home/mzfshark/.eigent/backend/app/service/chat_service.py:950-987` | Application creates/reuses workforce, adds workers and creates CAMEL root task. |
| `/home/mzfshark/.eigent/backend/app/service/chat_service.py:1410-1424,1501-1539` | Eigent resumes/pause/starts workforce through interactive multi-turn flow. |
| `/home/mzfshark/.eigent/backend/app/service/chat_service.py:2704-2745,2862-2895` | Coordinator/task/new-worker agent factory roles and workforce composition entry point. |
| `/home/mzfshark/.eigent/backend/app/service/task.py:44-78,411-690` | UI action vocabulary and in-process TaskLock/human-input/background-task coordination. |
| `/home/mzfshark/.eigent/backend/app/permission_policy/runtime.py:42-223` | Durable checkpoint/RunContext policy enforcement, human approval wait and action-digest revalidation. |
| `/home/mzfshark/.eigent/backend/app/run_journal/models.py:29-44,149-179,349-382,715-880` | Run, attempt, provider/token, tool, approval, HITL, security and event evidence models. |
| `/home/mzfshark/.eigent/backend/app/run_journal/store.py:271-370,969-1095,2028-2089,2333-2367` | SQLite run/event/tool/approval/HITL/model tables plus WAL/full sync and desktop-owned journal declaration. |
| `/home/mzfshark/.eigent/backend/app/controller/run_controller.py:211-280` | Persisted-event replay then live SSE notification pattern and recovery notices. |
| `/home/mzfshark/.eigent/backend/app/utils/telemetry/workforce_metrics.py:22-57,113-169,233-280` | CAMEL event-to-OTel/Langfuse adapter and optional telemetry nature. |
| `/home/mzfshark/.eigent/backend/tests/app/utils/test_workforce.py:52-126,151-268` | Tests for evidence ordering, timeout behavior, approval timeout exclusion and watchdog. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/workforce.py:127-176,323-400` | CAMEL constants, state/modes/snapshot and in-memory workforce fields. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/workforce.py:833-940,2669-2756` | CAMEL pipeline vs auto-decompose modes, execution entry and result aggregation. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/workforce.py:4042-4146,4397-4650,4642-4765` | CAMEL worker assignment, dependency-aware ready-task scheduling and failure/recovery implementation locations. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/workforce.py:5282-5415,5822-5865` | CAMEL channel listener, snapshots, child concurrency and immediate-stop behavior. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/task_channel.py:85-290` | In-process condition-variable channel, atomic claim, post/return/archive lifecycle. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/utils.py:169-351,420-715` | CAMEL assignment/dependency, failure configuration and pipeline builder/cycle validation. |
| `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel_ai-0.2.91a7.dist-info/METADATA:2-9` | CAMEL package version, Apache-2.0 SPDX expression and upstream URLs. |
