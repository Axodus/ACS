# REQ-03 Implementation Plan, Migration Map and Test Strategy

## 1. Dependency-ordered implementation graph

The initial hypothesis is replaced with an ordering that reuses current ACS
governance, provider, Product API, worker, lease, and evidence foundations.

```text
Phase 0: baseline gates and vocabulary
    |
    +--> shared IDs, scopes, revision refs, policy snapshots
             |
             +--> Agent revision persistence and validation
             |        |
             |        +--> Provider / Model / Credential reference contracts
             |        |        |
             |        |        +--> Executor conformance envelope
             |        |                 |
             |        +-----------------+--> ExecutionBinding and admission
             |                              |
             |                              +--> Run / Task / Attempt state
             |                                      |
             |                                      +--> event append/outbox
             |                                              |
             |                         +--------------------+-------------------+
             |                         |                                        |
             |                         v                                        v
             |                  Evidence / lineage                         Usage / metering
             |                         |                                        |
             |                         +--------------------+-------------------+
             |                                              v
             |                                      Cost allocation
             |                                              |
             +----------------------------------------------+
                                                            v
                                             Workforce / membership / graph
                                                            |
                                                            v
                                                  Workflow coordination
                                                            |
                                                            v
                                               Product API v2 integration
                                                            |
                                                            v
                                                   Reporting projections
```

The first implementation slice is deliberately contract and persistence
oriented. No provider adapter is needed to validate the core semantics.

## 2. Phases and gates

| Phase | Scope | Depends on | Exit gate | ACS-BLOCKER-014 impact |
|---|---|---|---|---|
| 0 | Baseline, vocabulary, blocker classification, provenance/licensing decision records | Current repository and REQ-02 | Exact baseline captured; five failures classified in separate workstream; no production claims | Not blocked for documentation; full health claim remains blocked |
| 1 | Shared primitives, AgentRevision durability, Provider/Model refs, policy snapshots | Phase 0 vocabulary | Schema fixtures, immutable lineage, secret exclusion, serialization and compatibility tests | Partially blocked for full-suite evidence; isolated contract tests may proceed |
| 2 | ExecutionBinding, executor protocol, Run/Task/Attempt state, lease/fencing/idempotency | Phase 1 | State transition and conformance tests using a fake executor; current durable runtime retained | Partially blocked; runtime changes require the separate blocker workstream classification |
| 3 | Event append/outbox, Evidence, Usage, Cost allocation | Phase 2 | Reconstruct a run from events; usage and cost remain correct under retry/resume | Partially blocked by s27/s63 until classified; schemas can proceed |
| 4 | Workforce membership, WorkflowRevision graph, joins, branches, approvals, checkpoints | Phases 1-3 | DAG/branch/retry/recovery/isolation tests; no second queue | Not blocked for design; runtime integration gate depends on Phase 2 evidence |
| 5 | Product API v2 asynchronous commands and projections | Phases 2-4 | Idempotent API contract suite, cursor stream, approval/cancel/resume flows | Partially blocked until API/runtime failures are classified |
| 6 | Adapter PoCs and controlled non-production integrations | Phases 1-5 plus separate authorization | Codex/OpenClaw/future adapters pass conformance; provider provenance and licenses resolved | Blocked by separate provider/provenance authorization, not by this document |

## 3. Parallel workstreams after contract freeze

| Workstream | Can start after | Owns | Collision points |
|---|---|---|---|
| A — Shared primitives and schema fixtures | Phase 0 | IDs, scopes, revisions, fingerprints, policy refs, JSON fixtures | Must coordinate field names with all streams |
| B — Agent Core | A | AgentDefinition, AgentRevision, lineage, validation, repository interface | Provider route refs and Product API payloads |
| C — Runtime Core | A and executor envelope review | Binding, Run/Task/Attempt, leases, fencing, recovery interfaces | Existing durable runtime and worker assignment code |
| D — Event/Evidence Core | A | Event envelope, append/outbox, evidence refs, cursors | Runtime transition transaction boundaries |
| E — Usage/Cost Core | A and D schema review | Normalization, allocation path, correction/dispute semantics | Economic service and reservation correlation |
| F — Workforce/Workflow Core | B, C, D | Membership, graph validation, planner proposal boundary | State machine, approval, checkpoint and context refs |
| G — Product API | C, D, E, F read-model decisions | v2 commands, reads, stream, approvals, artifacts, usage/cost | Existing `/api/v1` compatibility and tenant enforcement |

The principal collision point is the durable transition transaction: Runtime
Core decides the legal state change, Event/Evidence Core persists the canonical
event/outbox record, and Usage/Cost Core consumes the same immutable references.
No workstream may introduce a second source of truth for a Run or Task.

## 4. Dependency-ordered backlog

| ID | Work item | Output | Acceptance gate | Status |
|---|---|---|---|---|
| REQ03-001 | Record shared identifier and scope primitives | Type/schema definitions and fixtures | Round-trip and forbidden-secret tests | Ready after Phase 0 |
| REQ03-002 | Add immutable AgentRevision repository contract | Repository interface, fingerprint and lineage rules | Update/delete rejection and revision conflict tests | Ready |
| REQ03-003 | Normalize provider/model/credential references | Provider/Model/Capabilities schemas | Credential values absent; connection refs resolve through existing boundary | Ready |
| REQ03-004 | Define ExecutionBinding admission | Binding schema and admission decision contract | Full tuple validation and replacement-binding test | Ready after 003 |
| REQ03-005 | Define executor conformance suite | Fake executor plus mandatory/capability tests | Submit/status/result/idempotency/cancel semantics | Ready after 004 |
| REQ03-006 | Extend durable Run/Task/Attempt state | State store and transition validator | Lease, fencing, recovery, resume and unknown-outcome tests | Conditional on blocker classification before runtime mutation |
| REQ03-007 | Implement ACS event envelope and outbox contract | Append/correction schema and cursor contract | Fact-before-dispatch and deduplication tests | Ready as isolated contract work |
| REQ03-008 | Implement EvidenceRecord and lineage projection | Evidence store/query contract | Reconstruct run and redact sensitive fields | Depends on 007 |
| REQ03-009 | Implement UsageRecord normalization | Usage adapter and correction rules | Retry/resume attribution and missing telemetry tests | Depends on 007 |
| REQ03-010 | Implement CostRecord allocation | Hierarchical allocation service | Product/workforce/workflow/agent/task attribution | Depends on 009 |
| REQ03-011 | Add WorkforceRunMembership persistence | Membership store and selection evidence | Fixed/constraint-selected membership is reproducible | Depends on 002, 006 |
| REQ03-012 | Add WorkflowRevision graph validator | DAG, condition, join and amendment validator | Cycle, branch, join, retry and approval tests | Depends on 006-008 |
| REQ03-013 | Add checkpoint and governed resume | Checkpoint store and resume admission | Recovery preserves prior attempts and evidence | Depends on 006-008 |
| REQ03-014 | Define Product API v2 command/read contracts | Route schemas and compatibility adapters | Idempotent commands, cursors, tenant scope and redaction | Depends on 006-013 |
| REQ03-015 | Add adapter boundary fixtures | Codex/OpenClaw/direct-model fake implementations | All adapters pass conformance without external integration | Separate authorization for real adapters |
| REQ03-016 | Publish reporting projections | Run/evidence/usage/cost read models | Projection lag and correction semantics explicit | Depends on 008-010, 014 |

## 5. Current ACS migration matrix

| Canonical contract | Current ACS equivalent | Disposition | Migration action |
|---|---|---|---|
| AgentDefinition | `src/types.ts` AgentDefinition; `src/control-plane/unified-agent-model.ts` AgentDefinition | EXTEND | Preserve current IDs/status/permissions; converge on scoped immutable revision aggregate. |
| AgentRevision | `createAgentRevision`, fingerprinting, durable agent state | PRESERVE / EXTEND | Keep fingerprint and optimistic revision controls; add durable no-update/delete lineage proof. |
| WorkforceDefinition | No canonical aggregate; related worker registry and EPIC-11 planning docs | NEW | Add ACS-owned revision and run membership store. |
| WorkflowDefinition | `src/types.ts` linear WorkflowDefinition and `src/workflows/*` | EXTEND | Preserve v1 compatibility; add immutable graph revision and task node/edge model. |
| Run | `ExecutionRun`, runtime lifecycle, durable runtime jobs | EXTEND | Add canonical Run envelope over existing durable runtime state. |
| Task / Attempt | Workflow steps and worker assignments | NEW / ADAPT | Introduce logical Task plus attempt records; retain worker assignment and leases. |
| ProviderDefinition | `src/types.ts`, `src/intelligence/model-provider.ts`, provider registry/services | PRESERVE / EXTEND | Separate provider catalog from execution and add capability/usage references. |
| Executor | `AgentRunner`, `AgentEngine`, OpenClaw adapter, target services | ADAPT | Map current interfaces into one conformance protocol; no external adapter activation. |
| ExecutionBinding | `ExecutionPlan`, deployment and composition projections | EXTEND | Make run-scoped resolved binding explicit and immutable after admission. |
| EventEnvelope | `TelemetryEvent`, operational telemetry, audit service | EXTEND | Preserve telemetry IDs/correlation; add ACS schema version, causation, stream sequence and outbox. |
| EvidenceRecord | Receipts, audit service, operational evidence service | EXTEND | Make evidence ledger canonical and external traces observational. |
| UsageRecord | Economic service, usage/reservation records | EXTEND | Normalize dimensions and retain current reservation references. |
| CostRecord | Economic contract and durable economic state | EXTEND | Add hierarchical allocation independent from settlement. |
| Approval/Governance | Governance boundary, policy matrix, economic authorization | PRESERVE / EXTEND | Keep fail-closed gates; add explicit approval request/decision records. |
| Product API | `/api/v1` routes and `ProductApiClient` | PRESERVE / EXTEND | Add v2 async contracts behind compatibility surface; no product-native bypass. |
| Persistence | Durable runtime/admin/deployment/economic state plus in-memory registries | EXTEND | Keep durable ownership; do not move Run/Task authority to adapters or UI. |

## 6. Agenta-derived primitive map

| Agenta concept | ACS v2 relationship | Disposition |
|---|---|---|
| Agent template | Authored intent resembles AgentRevision definition | ADAPT fields and compilation pattern; ACS owns identity, scope, authority and lineage |
| Artifact/variant/revision/fork vocabulary | Useful for immutable revision lineage | ADAPT; ACS revision refs and fingerprints remain canonical |
| Skills/tools/MCP normalization | Useful resource compiler concept | ADAPT; add ACS provenance, policy, domain and evidence metadata |
| Provider reference vs resolved connection | Matches preference vs run binding separation | ADAPT into ProviderRoute and ExecutionBinding |
| Harness capability negotiation | Matches executor eligibility | ADAPT behind ACS Executor/Provider contracts |
| Runner/sidecar/session implementation | Coupled to external platform semantics | REIMPLEMENT over current ACS runtime |
| OTel/session tracing | Useful external observation | ADAPT as enrichment; never institutional ledger |
| SaaS workspace, billing, RBAC catalog, enterprise code | Duplicates Axodus ownership or has licensing boundary | REJECT as canonical dependency |

No Agenta code import is authorized by REQ-03.

## 7. Persistence ownership map

| Entity | Durable authority | Current ACS basis | REQ-03 disposition |
|---|---|---|---|
| AgentDefinition / AgentRevision | ACS control-plane repository | Durable agent state and unified agent model | Preserve and extend with immutable lineage |
| WorkforceDefinition / WorkforceRevision | ACS control-plane repository | No canonical store | New durable aggregate |
| WorkflowDefinition / WorkflowRevision | ACS control-plane repository | Linear workflow definitions and workflow modules | Extend with immutable graph revisions |
| Run / Task / TaskAttempt | ACS durable runtime state | Durable runtime jobs, worker assignments, leases and fencing | Extend in place; one runtime authority |
| EventEnvelope | ACS event/outbox store | Operational telemetry, audit and JSONL receipt patterns | Add ordered append/correction contract |
| EvidenceRecord | ACS evidence store/read model | Operational evidence and audit services | Make canonical; external traces are linked observations |
| ArtifactReference metadata | ACS artifact metadata repository | Existing artifact/evidence references and deployment metadata | Persist digest, sensitivity, storage ref and lineage |
| UsageRecord | ACS economic/usage store | Economic service and usage/reservation records | Normalize dimensions and correction semantics |
| CostRecord | ACS cost allocation store | Durable economic state and economic contract | Add hierarchy before pricing/settlement |
| ApprovalRequest / ApprovalDecision | ACS governance/economic authorization store | Governance boundary and authorization services | Persist request, decision, authority and evidence refs |

Persistence rules:

- External executors, providers, planners, and product clients never become
  authoritative stores for these entities.
- In-memory registries remain caches or test doubles unless a separate durable
  authority is named explicitly.
- Event/outbox persistence must make the ACS fact durable before dispatch.
- Historical revisions, attempts, events, evidence, usage, and cost records are
  append-only or correction-linked; destructive rewrite is prohibited.
- A persistence adapter must prove restart/reload, transaction ordering,
  idempotency, scope isolation, and projection rebuild behavior.

## 8. CAMEL planner boundary

```yaml
PlanningRequest:
  request_id: string
  objective_ref: EntityRef
  available_agent_revision_refs: [RevisionRef]
  constraints: [EntityRef]
  base_workflow_revision_ref: RevisionRef?
  correlation_id: string

IPlanner:
  propose(request: PlanningRequest): Promise<PlanningProposal>

PlanningProposal:
  proposal_id: string
  base_graph_fingerprint: sha256
  operations: [add_node | remove_node | replace_node | add_edge | remove_edge]
  rationale_ref: EntityRef?
  planner_source: string
  untrusted: true
```

`CamelPlannerAdapter` may implement `IPlanner` in a separately authorized PoC.
ACS validates schema, cycles, authority, isolation, budget, evidence and
resource limits, then accepts, modifies, or rejects the proposal. CAMEL never
owns WorkflowDefinition, WorkforceDefinition, dispatch, task state, leases,
checkpoints, or completion.

## 9. OpenClaw boundary

OpenClaw is a potential implementation of `Executor` and, where separately
authorized, a persistent job/notification adapter. Its expected bounded scope
is schedules, monitoring, messaging, notifications, and integration tasks.

It consumes an ACS `ExecutionRequest`, scoped context, allowed resources,
policy snapshot and evidence requirements. It returns an ExecutionHandle,
status/result, artifacts, usage observations and failures. It does not own
Agent/Workforce definitions, authority, Product API semantics, canonical event
history, or CostRecord allocation. Its provenance/license gate remains open.

## 10. Codex boundary

Codex is a potential `Executor` for bounded repository operations, engineering
work, technical analysis, artifact generation, testing, and architecture tasks.

It consumes explicit repository roots, tools, deadline, approval/network policy,
and evidence requirements. It returns handles, results, artifacts, usage and
safe failure details. Codex does not own Agent identity, institutional
authority, Workforce composition, Product API, or canonical evidence.

REQ-03 does not activate a Codex adapter or change credentials.

## 11. Contract test strategy

Every canonical contract receives the following validation layers:

| Layer | Required checks |
|---|---|
| Unit | Normalization, validation, fingerprint, forbidden-secret and transition rules |
| Schema | Valid/invalid fixtures, unknown-field policy, version and reference validation |
| State transition | Legal/illegal transitions, lease expiry, fencing, approval and terminal semantics |
| Compatibility | Current v1 Agent/Provider/Workflow/Receipt payloads remain readable or have explicit migration errors |
| Persistence | Transaction boundaries, restart/reload, immutable revisions, append ordering, projection rebuild |
| Idempotency | Same key/same hash deduplicates; same key/different hash conflicts; retransmission does not create a second attempt |
| Recovery | Checkpoint, unknown outcome, resume, retry and prior-attempt preservation |
| Security | Scope isolation, authority checks, secret redaction, credential reference-only, artifact sensitivity |
| Contract | Fake adapters implement the same executor/provider interface and normalized outputs |

### Executor conformance suite

The suite must be provider- and executor-neutral:

```text
FakeExecutor       -> baseline behavior and negative cases
CodexExecutor      -> must pass when separately implemented
OpenClawExecutor   -> must pass when separately implemented
FutureExecutor     -> must pass without ACS schema changes
```

The suite verifies `capabilities`, `submit`, `status`, `result`, optional
`stream`, optional `cancel`, optional `resume`, timeout reporting, artifacts,
usage, normalized failure, and idempotency. It does not certify provider
quality, production safety, or governance approval.

## 12. Validation commands and evidence boundaries

For documentation-only changes:

```text
git diff --check
required-file and relative-link validation
terminology and prohibited-action searches
```

For implementation phases, add the smallest relevant package/build/test check
and preserve the exact result. The current full suite must not be called green
until the five `ACS-BLOCKER-014` failures are independently classified and the
complete check is rerun.

## 13. Migration and rollback rules

- Introduce v2 records and adapters additively beside v1 records.
- Read historical v1 records through explicit compatibility mappers; do not
  rewrite historical evidence.
- Dual-write only when the transaction can prove a single logical operation and
  a single idempotency key; otherwise use an audited backfill.
- Roll back at the adapter/read-model boundary before changing durable Run/Task
  authority.
- Never downgrade a committed revision or delete event history to roll back a
  deployment or planner decision.
- A failed migration leaves the v1 compatibility path available while the v2
  projection is repaired.
