# ACS-V2-REQ-02 — Eigent/CAMEL Cross-Agent Synthesis Review

**Reviewer:** Sub-Agent B — Eigent/CAMEL Workforce Auditor
**Date:** 2026-09-10
**Scope:** Read-only cross-review of the preserved Agenta, ACS, unified-architecture, and decision-record artifacts, verified against the inspected Eigent checkout and locally installed CAMEL package. No repository or runtime changes were made.

## Review conclusion

The synthesis correctly rejects a permanent Eigent dependency and preserves ACS as the system of record. Two findings from the other agents materially narrow the original Eigent/CAMEL recommendation:

1. The ACS audit confirms that durable jobs, assignments, worker leases, fencing, cancellation, retries, and recovery already exist. CAMEL therefore must not own task dispatch. The compatible experiment is a **planner/graph-proposal adapter** whose output is validated, revisioned, persisted, and compiled to the existing ACS runtime. This is stronger than the earlier “optional in-process workforce adapter” formulation. See `acs-current-core-audit.md:70-80,119-121,235-245,280-285`, `unified-core-architecture.md:263-273`, and `decision-record.md:15-25,29-42`.
2. The Agenta audit establishes authored-versus-resolved separation through `AgentTemplate`, resource compilation, authored `ModelRef`, resolved connection, harness capability negotiation, and sequenced/lost event semantics. CAMEL may receive only an already-resolved ACS execution request or produce an untrusted graph proposal. It must not resolve credentials, compile resources, decide placement, or become evidence authority. See `agenta-core-audit.md:248-303,445-485,678-690` and `unified-core-architecture.md:87-99,291-321`.

**Disposition:** retain `CONDITIONAL GO` for contracts and isolated non-production PoCs. Amend the CAMEL decision to **planner-only PoC by default**. An execution adapter is unjustified unless every TaskRun compiles into the existing ACS job/lease/fencing substrate and CAMEL owns no durable task state, queue, retry state, or checkpoint truth.

## Findings and dispositions

| ID | Finding | Disposition and correction |
|---|---|---|
| CR-EIG-01 | The decision record permits an “optional CAMEL planner/workforce adapter.” | **Narrow.** CAMEL `Workforce.start()` starts child listeners and runs its own channel loop. `TaskChannel` is an `asyncio.Condition` with local maps/deques, while its worker pool clones in-process `ChatAgent` instances. A CAMEL execution loop would duplicate ACS runtime ownership. Replace the phrase with **“planner/graph-proposal adapter; any execution experiment must compile to ACS RuntimeJob and remain non-authoritative.”** Evidence: `decision-record.md:27-42`; `unified-core-architecture.md:263-273,321`; CAMEL `workforce.py:5822-5865`, `task_channel.py:85-240`, `single_agent_worker.py:74-162,234-285`. |
| CR-EIG-02 | Dynamic orchestration commits “a new plan revision,” but no graph-amendment protocol is specified. | **Add specification.** CAMEL can add/remove/reorder pending in-memory tasks, but has no durable graph revision, optimistic concurrency, proposal digest, planner identity, causation ID, policy snapshot, or graph-delta event. Define proposal and commit records with base graph fingerprint, typed operations, expected task states, validation results, policy/budget references, and rejection reasons. Leased/running/completed tasks must be immutable unless an explicit cancellation or compensation transition applies. Evidence: `unified-core-architecture.md:218-261,393-446,574-582`; CAMEL `workforce.py:2452-2573,4490-4539`. |
| CR-EIG-03 | Snapshot and checkpoint language is insufficiently separated. | **Correct terminology.** CAMEL `WorkforceSnapshot` copies pending/completed containers, dependencies, assignees, index, description, and timestamp into `self._snapshots`; restore is available only when not running. It is process-local and lacks leases/fencing, executor handles, tool outcomes, approvals, bindings, artifact digests, and durable replay. Eigent `TaskLock.base_snapshot_id` is a workdir baseline, not a workforce checkpoint, and TaskLock itself lives in a process-global dictionary. Use **CAMEL snapshot = local interactive rollback aid** and **ACS checkpoint = durable replayable TaskRun/RuntimeJob recovery boundary**. Evidence: `unified-core-architecture.md:259-273,339,434-446,578-582`; CAMEL `workforce.py:149-173,2551-2573`; Eigent `task.py:411-530,800-851`. |
| CR-EIG-04 | “Write-before-dispatch” may imply a durable dispatch guarantee. | **Weaken and clarify.** Eigent writes a workforce-step projection before UI queue publication and CAMEL dispatch, and a test asserts `persist → queue → dispatch`. The helper is explicitly fail-open: persistence failure marks in-memory `TaskLock.local_history_degraded` and execution may continue. This is an observability pattern, not an outbox, lease, or fencing guarantee. ACS authoritative transitions require a transactional event/command or durable outbox and must not fail open. Evidence: `unified-core-architecture.md:95-99,393-446`; Eigent `utils/workforce.py:78-137,599-745`; `backend/tests/app/utils/test_workforce.py:52-126`; `task.py:475-478,598-611`. |
| CR-EIG-05 | CAMEL assignment/channel behavior may be read as a handoff primitive. | **Reject that interpretation.** CAMEL posts a Python `Task` by publisher/assignee, atomically claims it, and returns it to the publisher. Results and dependencies remain local objects. This is local scheduling, not a durable cross-executor handoff with context/artifact transfer, authority attenuation, lease transfer, receipts, or causality. Add an ACS `TaskHandoff` envelope and use existing lease/fencing controls. Evidence: `acs-current-core-audit.md:119-121,150-178,219-221`; `unified-core-architecture.md:253-273,291-321,393-446`; CAMEL `task_channel.py:148-240`. |
| CR-EIG-06 | CAMEL parallelism is described without a sufficiently strong capacity caveat. | **Constrain.** CAMEL concurrently starts child listeners and uses local agent pools. The inspected pool creates a new agent when `len(_in_use_agents) < max_size or auto_scale`; with `auto_scale=True`, the code does not visibly enforce `max_size`. This requires a version-specific PoC before claiming bounded concurrency. CAMEL concurrency is local process capacity; ACS worker capacity, leases, fencing, quotas, fairness, and backpressure remain authoritative. Evidence: CAMEL `workforce.py:5822-5834`; `single_agent_worker.py:74-162,234-285`; `acs-current-core-audit.md:70-80,121,235-245`. |
| CR-EIG-07 | CAMEL provenance says version `0.2.91a7`, alpha, exact commit unknown. | **Strengthen package identity.** `backend/pyproject.toml` pins `camel-ai[eigent]==0.2.91a7`; `backend/uv.lock` resolves the PyPI sdist SHA-256 `8e165728...a591` and wheel SHA-256 `5ed5cd61...183c`. The exact upstream Git commit remains unknown. Package-hash evidence is enough to reproduce a package-based disposable PoC; a clean upstream commit/tag and exact-file inventory remain required before source copying. The broad `eigent` extra must be included in the SBOM. Evidence: Eigent `backend/pyproject.toml:7-30`, `backend/uv.lock:216-250,323-383`, CAMEL metadata `METADATA:2-9`. |
| CR-EIG-08 | Eigent behavior is sometimes characterized as though it were clean upstream release evidence. | **Qualify.** The checkout is `6bb55842...`, `v1.0.4-dirty`, with 19 pre-existing modified files. The audited workforce, TaskLock, RunJournal, policy, license, manifest, and lock files had no `git diff HEAD` changes, so findings are local-HEAD-consistent. They were not independently compared with `origin/main` or a clean release archive. The installed CAMEL code is package evidence, not an upstream source checkout. See `README.md:33-40` and the audit’s repository baseline. |
| CR-EIG-09 | Apache-2.0 is summarized too briefly. | **Clarify exact clauses.** Eigent’s root license is standard Apache-2.0: copyright grant (§2); patent grant and patent-litigation termination (§3); redistribution requirements to include the license, mark changed files, retain applicable copyright/patent/trademark/attribution notices, and reproduce NOTICE attribution when a NOTICE exists (§4); and no trademark grant (§6). The appendix contains local boilerplate `Copyright 2026 @ Eigent.AI`. This does not establish CAMEL’s complete root NOTICE inventory. Evidence: Eigent `LICENSE:66-141,178-201`; CAMEL metadata `METADATA:2-9`. |
| CR-EIG-10 | Evidence/cost precedes dynamic workforce execution in the implementation sequence. | **Affirm and tighten.** Agenta’s sequenced/lost-event finding requires ACS to represent incomplete evidence explicitly. CAMEL callbacks and TaskLock queues cannot meet that requirement. Define task/attempt/evidence identities and evidence-gap semantics before a planner PoC; compile any execution into existing ACS jobs and record lease/fencing references. Evidence: `agenta-core-audit.md:459-500`; `unified-core-architecture.md:552-563,574-582`; `decision-record.md:44-60`. |

## Required specification additions

### Governed graph amendments

```yaml
GraphAmendmentProposal:
  proposal_id: string
  workflow_run_id: string
  base_workflow_revision: integer
  base_graph_fingerprint: sha256
  planner_execution_ref: ExecutionRef
  planner_agent_revision_ref: AgentRevisionRef
  operations: [add_node | remove_node | replace_node | add_edge | remove_edge]
  reason: string
  proposed_at: timestamp

GraphAmendmentDecision:
  proposal_id: string
  status: accepted | rejected | superseded
  committed_workflow_run_revision: integer?
  validation_event_refs: [EvidenceRef]
  policy_snapshot_refs: [PolicySnapshotRef]
  budget_reservation_refs: [ReservationRef]
  rejection_codes: [string]
```

Require compare-and-swap on the base fingerprint. Prohibit direct changes to leased, running, or completed tasks. Emit proposal, validation, decision, and commit/rejection events.

### Durable handoff

```yaml
TaskHandoff:
  handoff_id: string
  task_run_id: string
  from_execution_ref: ExecutionRef
  to_agent_revision_ref: AgentRevisionRef
  to_execution_binding_ref: ExecutionBindingRef
  lease_transfer_ref: LeaseRef
  input_artifact_refs: [ArtifactRef]
  context_refs: [ContextRef]
  authority_refs: [AuthorityRef]
  expected_output_schema_ref: SchemaRef
  idempotency_key: string
  causation_event_id: string
```

The receiver must acknowledge the handoff under an ACS lease and fencing token. CAMEL channel post/return may be adapter-local plumbing only.

### Durable checkpoint

An ACS checkpoint must contain TaskRun state and attempt, graph revision/fingerprint, RuntimeJob/assignment/lease/fencing reference, executor handle and recovery capability, policy/resource/context references, tool-call outcome state, pending approvals, artifact digests, and explicit evidence gaps. Define `checkpoint_created`, `checkpoint_unrecoverable`, `resume_requested`, and `resume_admitted`. CAMEL snapshots and TaskLock histories are optional debug artifacts, never recovery authority.

### Concurrency policy

ACS worker capacity remains authoritative. Workforce policy must set limits by organization, product/domain, workforce, workflow, executor, target, and resource class, together with fairness, backpressure, and deadline behavior. A CAMEL planner may suggest parallel branches but cannot select pool size or bypass ACS leases.

## Required citation normalization

1. CAMEL identity: Eigent `backend/pyproject.toml:7-30`, `backend/uv.lock:216-250,323-345`, and CAMEL `dist-info/METADATA:2-9`.
2. CAMEL state/channel/concurrency: `workforce.py:149-173,323-400,4397-4650,5822-5865`; `task_channel.py:85-290`; `single_agent_worker.py:74-162,234-285,585-613`.
3. Eigent adaptation: `backend/app/utils/workforce.py:78-137,155-214,287-413,599-745,1000-1159`, qualified as local-HEAD-consistent source.
4. TaskLock limitation: `backend/app/service/task.py:411-690,800-875`.
5. Existing ACS runtime: `acs-current-core-audit.md:70-80,119-121,150-178,235-245,280-285` and `unified-core-architecture.md:263-273,321`.
6. Agenta boundary: `agenta-core-audit.md:256-303,457-485,678-690`.
7. Eigent license: `/home/mzfshark/.eigent/LICENSE:66-141,178-201`; do not infer a complete CAMEL NOTICE inventory from package metadata.

## Decision amendments

1. Amend ADR-V2-006 to state: **CAMEL is evaluated only as a removable planner/graph-proposal adapter. It does not own canonical graph state, handoffs, checkpoints, dispatch, leases, retries, evidence, or cost. Any execution experiment compiles into existing ACS RuntimeJob/assignment/lease/fencing.**
2. Add an ADR for governed graph amendments and immutable in-flight TaskRuns.
3. Add an ADR defining `TaskHandoff` as durable artifact/context/authority/lease transfer, distinct from assignment.
4. Add an ADR defining checkpoint versus snapshot and prohibiting fail-open authoritative task-state/evidence transitions.
5. Amend `V2-BL-014`: CAMEL only proposes/decomposes; ACS validates and persists. Restart, resume, handoff, and task recovery must not depend on CAMEL memory, `TaskChannel`, TaskLock, or CAMEL snapshots.

## Final disposition

The unified architecture is directionally sound. ACS’s existing durable runtime and Agenta’s authored/resolved compilation distinction are hard boundaries. Eigent remains rejected as a runtime dependency. CAMEL remains useful only for planner, task-graph, assignment-policy, dependency-validation, and local experimental patterns. Its in-process `TaskChannel`, `ChatAgent` pool, mutable pending queues, local snapshots, and callback telemetry are not acceptable ACS runtime state, handoff, checkpoint, concurrency, or evidence primitives.
