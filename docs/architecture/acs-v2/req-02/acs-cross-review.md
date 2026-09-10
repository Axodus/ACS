# ACS-V2-REQ-02 — Cross-Agent Synthesis Review: ACS Substrate Corrections

**Reviewer:** Sub-Agent C — ACS Current Core Auditor
**Date:** 2026-09-10
**Scope:** read-only review of the preserved Agenta, Eigent/CAMEL, unified-architecture, and decision-record artifacts against current ACS source and instructions. No repository, runtime, configuration, or external-system mutation occurred.
**Review posture:** this is a correction record, not a replacement architecture or implementation authorization.

## Review conclusion

The synthesis has the correct strategic direction: ACS must own canonical identities, governance, durable execution authority, product interfaces, evidence, and economics; Agenta contributes authoring/compiler patterns; Eigent is not a long-term dependency; CAMEL is at most a removable planning/graph-mechanics adapter. [R01, R02, R03]

However, several statements currently blur **proposed V2 contracts**, **historical records**, and **confirmed ACS source behavior**. The most consequential corrections are:

1. Existing durable runtime state is authoritative only for its currently defined `runtime.start` workload/job model. It is not already a task-graph runtime, nor does it currently persist task dependencies, joins, checkpoints, approvals, compensation, or workforce membership. The local durable adapter is SQLite; the shared-control-plane migration package separately defines PostgreSQL runtime tables. Any V2 graph schema must target the authoritative runtime profile deliberately rather than assume one storage layout. [S01, S16]
2. “Signed/authorized lease” is only partly grounded: `WorkerAssignmentService` creates an in-memory SHA-256-derived lease signature with a default development key, while the durable runtime’s persisted assignments contain lease ID, fencing token, expiry and revision but no signature field. Do not state that durable graph-job execution is signed until an explicit, durable, key-managed integration is specified and validated. [S01, S02]
3. ACS has append-oriented local JSONL receipts/telemetry and audit-event-derived evidence views, but no current canonical, append-only institutional execution ledger. Some durable records are explicitly upserted with `ON CONFLICT ... DO UPDATE`; the Product API evidence service derives evidence on read from audit events. “Append-only ledger” must be marked **PROPOSED DESIGN**, not a present implementation guarantee. [S03, S04, S05]
4. Existing economic records are a tenant-scoped quote/reserve/authorize/meter/settle/receipt substrate with idempotent durable adapters; they are not a blank cost-core canvas. New workforce/task allocation must preserve `tenantId`, `workloadId`, `planId`, `executionRunId`, idempotency, policy revision, existing receipts, visibility checks, and current settlement boundaries. The source currently upserts economic records, so immutable-cost-line language is unsupported. [S06, S07]
5. The planning package remains `PLANNING / DISCOVERY`, preserves `L4_READINESS` / `D3+` / execution-gated / non-production / no-mutation-authority status, and has `ACS-BLOCKER-014` open with five failures and two skips in the latest recorded suite. Required PoCs are future, separately authorized work; the synthesis must never sound like it approves them now. [S08, S09]

## Findings that change or constrain the ACS recommendation

### A. Agenta’s authored-versus-resolved model boundary is valuable, but only above ACS planning and secret boundaries

The Agenta audit finds that `AgentTemplate` is useful for authored instructions/resources/runtime selectors and that `ModelRef` is distinct from a resolved connection. It recommends adapting this boundary rather than adopting Agenta, and explicitly says resolved credentials must not enter `AgentRevision`. It also identifies generic usage/cost dictionaries and trace aggregates as insufficient for ACS accounting. [R01:240-260, 327-335, 398-410]

**Effect on ACS recommendation:** retain the existing ACS `AgentDefinition.modelStrategy` and `ExecutionPlanResolver` as the canonical planning seam. The resolver already validates engine/target eligibility, provider reference, credential reference, and runner selection before producing an execution plan. [S10:47-123] Agenta’s contribution should be limited to an **authored provider route / resolved connection compiler pattern**.

**Correction required:** the unified schema’s `provider_routes` and executor/harness preferences must be explicitly classified as authored intent, while the resolved provider/model/credential/runner/target belongs in a run-scoped execution binding or plan. The term `AgentBinding` in the unified document is reasonable as a **proposed** record, but it must carry existing plan-level fields and be validated through the existing resolver rather than bypass it. [R03:104-171; S10:67-123]

**Disposition:** ACCEPT WITH CORRECTION. Do not import Agenta connection/vault/project semantics. Do not introduce credentials into agent/workforce/workflow revisions.

### B. Agenta sequenced session events support interoperability, not a complete ACS evidence claim

The Agenta audit correctly identifies sequenced session events/watermarks as an adaptable pattern and explicitly notes that incomplete/lost history is possible; it also says Agenta tracing is not sufficient as the canonical ACS ledger. [R01:197-213, 403-410, 475-489, 597-607]

**Effect on ACS recommendation:** require an external-event ingest contract with source event ID, sequence/watermark, source timestamp, source session/run ID, raw payload retention/redaction policy, and an explicit `incomplete`/`lost` status. Do not promise replayability or complete reconstruction merely because an event has a sequence.

**Correction required:** replace statements that describe the future ledger as already “append-only” or fully reconstructable. The current `OperationalEvidenceService` queries audit events and derives `EvidenceRecord` responses at read time; it does not expose a canonical write-once graph ledger. [S04:696-755, 815-879] Current entity references exclude workforce, workflow, task, tool call, knowledge source and artifact entities. [S04:20-100]

**Disposition:** ACCEPT AS PROPOSED DESIGN ONLY. Add an ADR for event-source truth, event immutability/correction model, missing-history representation, and evidence retention.

### C. Eigent/CAMEL discovery rules out planner state becoming runtime authority

The Eigent/CAMEL audit concludes Eigent has desktop coupling and that CAMEL 0.2.91a7 is ChatAgent-centric/in-memory; it recommends ACS-owned cross-product facts and durable semantics. It says CAMEL graph mechanics may be adapted but persistence/state must be reimplemented. [R02:142-188, 250-330]

**Effect on ACS recommendation:** this strengthens the existing ACS position beyond a generic “Eigent REJECT”: CAMEL must have no authority to create, mutate, lease, complete, retry, cancel, or recover ACS jobs. Its permissible role is a pure/isolated planner or graph validator that emits a proposed graph/amendment, which ACS validates and persists.

**Correction required:** the unified architecture’s “optional CAMEL planner/workforce adapter” language needs a hard contract boundary: input must be a redacted, scoped planning request; output must be a serializable candidate graph/assignment rationale; no CAMEL runtime state, channels, callbacks, memory, or worker pool becomes durable ACS state. [R03:95-100; R03:216-261]

**Disposition:** ACCEPT WITH HARD ISOLATION. No `ACS → Eigent → CAMEL` runtime chain; no CAMEL worker pool or task channel in the execution path.

## Contradictions and unsupported claims requiring correction

| ID | Statement under review | Conflict / missing source support | Required correction | Disposition |
|---|---|---|---|---|
| CR-01 | “Immutable revision and SHA-256 fingerprint” in the unified capability matrix. [R03:59-62] | `createAgentRevision` freezes a supplied definition and computes a SHA-256 fingerprint, but the repository has an in-memory repository whose `save` replaces current revision and a durable-agent implementation must be cited separately for durable immutability. The source demonstrates fingerprinting and revision conflict controls, not a globally immutable stored revision history guarantee. [S11:189-249; S12:55-105] | Say: **“ACS currently fingerprints normalized AgentDefinition revisions; V2 proposes immutable revision persistence.”** Specify store-level no-update/delete/lineage semantics and migration strategy. | CORRECT |
| CR-02 | “AgentRevision is immutable authored intent”; “policy and resource changes produce new references or revisions.” [R03:104-105, 162-169] | This is a sound proposed invariant, but current source permits repository `remove`, and present resource references are mostly IDs, not revisioned resource refs. [S11:21-47; S12:94-105] | Label it **PROPOSED DESIGN**. Define what mutations are allowed, how archival/deletion interacts with evidence retention, and whether policy changes require a new agent revision, a bound-plan snapshot, or both. | CORRECT |
| CR-03 | “WorkflowRevision owns an immutable graph”; `WorkflowRun`/`TaskRun` state machine and branch/join/checkpoint/compensation design. [R03:220-261] | Current workflows are named factories producing a linear `steps` array. `AcsOrchestrator` loops sequentially and records each step completed without executing task work. No TaskRun, DAG, join, approval node, checkpoint, compensation, or graph persistence exists. [S13:69-103; S14:13-38; S15:33-116] | Keep the whole graph/state-machine section as **PROPOSED DESIGN**. Add a graph-to-job compiler specification before claiming compatibility with durable runtime. | CORRECT |
| CR-04 | `Workflow TaskRun -> existing ACS RuntimeJob -> assignment + signed/authorized lease + fencing token`. [R03:263-270] | Durable runtime only supports `RuntimeStartWorkload` / `runtime.start`; its job has no task-graph/node/checkpoint/approval/compensation fields. [S01:21-75] Durable assignment has no signature. [S01:92-104] A separate in-memory assignment service signs leases using a default `dev-lease-signing-key`. [S02:27-43, 198-276] | State: **“Proposed compiler target: a new task workload contract must be added to the durable runtime. It may reuse durable lease/fencing. Whether dispatch signatures remain required must be decided and implemented as durable/key-managed behavior.”** | CORRECT — HIGH |
| CR-05 | “ACS owns the durable state machine, graph, evidence, governance, context, and economics.” [R03:42-51] | Correct ownership target; graph/context are not current ACS capabilities. The wording reads as present-state fact adjacent to a target diagram. | Split wording: **ACS currently owns durable runtime, governance, and economic substrate; ACS v2 proposes canonical graph/context/evidence ownership.** | QUALIFY |
| CR-06 | “ACS owns an append-oriented event ledger” and “append-oriented ACS ledger reconstructs graph…” [R03:395, 618] | Historical local bootstrap uses append-only JSONL receipts and telemetry. [S05:300-315, 400-409] But operational evidence is a read projection over audit events; and economic persistence upserts rows. [S04:696-879; S07:286-314] There is no identified canonical run graph. | Replace present tense with **“ACS v2 proposes an append/correction-oriented institutional evidence ledger.”** Define event append, correction/supersession, projection rebuild, retention, source ordering, and redaction rules. | CORRECT — HIGH |
| CR-07 | “Complete evidence lineage” / “replayable state projections.” [R03:9, 93, 563; R02:284] | Existing evidence entity references cover agent/deployment/runtime/execution-run/worker/credential/provider connection only. [S04:20-100] Current evidence is derived and logs are unavailable as raw Product API log content. [S04:767-879] | State **target lineage** and explicitly preserve an `unknown`, `unavailable`, or `incomplete` evidence state. Define replay guarantees per source, not globally. | CORRECT |
| CR-08 | “Existing ACS … Economics” are “validated ACS-owned foundations.” [R03:100] | They are important implemented foundations, but two current failing tests are economic authorization/reservation and usage/settlement. `ACS-BLOCKER-014` prevents fresh all-green readiness evidence. [S08:24-31; S09:213-231] | State **“existing economic foundation, subject to ACS-BLOCKER-014 and topology/financial boundaries.”** Do not use “validated” without binding it to a specific historical certification record. | QUALIFY — HIGH |
| CR-09 | Cost-center aggregation Product→Workforce→Workflow→Agent→Task→Provider/Executor. [R03:588] | Existing records include account, tenant, optional workload, plan, execution run, policy/revision, usage and settlement. Workforce/workflow/task/provider-executor attribution is not current schema. [S06:55-170; S07:377-410] | Define an additive attribution dimension model and mapping from legacy `workloadId`, `planId`, and `executionRunId`. Include migration/backfill/null rules and avoid altering current economics semantics. | CORRECT — HIGH |
| CR-10 | “Settlement policy” in AgentRevision and economic layer design. [R03:149-152, 516] | Current economic model has `BillingPolicy`, quote/reservation/authorization/usage/settlement and tenant visibility, with SQLite settlement adapter declared `single_node_durable` / `multiInstance: not_proven`. [S06:185-225; S07:317-410] EPIC boundaries still prohibit financial activation in this sprint. [S09:233-242; S08:15-18] | Keep settlement policy as future reference only. Separate agent execution policy from settlement authorization; no agent/workforce revision may authorize settlement. | CORRECT |
| CR-11 | `/api/v2` command, resume, streaming, webhook/outbox, SDK surface. [R03:337-353, 558] | Sensible future interface proposal, but no current `/api/v2`, checkpoint, resume, outbox, broker, WebSocket or schema-version event service was evidenced. The Product API is current ACS authority and must be extended incrementally, not superseded by a presumed V2 surface. [S08:15-18; S10:47-123] | Mark all `/api/v2` paths as **illustrative proposed interface**. Require compatibility/versioning decision, tenant/authz/idempotency semantics, and conformance tests before endpoint commitment. | QUALIFY |
| CR-12 | PoCs listed as “required.” [R03:607] and decision record’s “CONDITIONAL GO” wording. [R04:48-60] | The repository status says this planning record does not authorize provider/runtime integration, and failure diagnosis/source correction requires a separate implementation request. [S08:24-31; S09:132-139] | Say **“candidate future PoCs requiring separate authorization after named gates.”** Do not use implementation-ready language until scope, safety, isolation, and acceptance criteria are individually authorized. | CORRECT — HIGH |
| CR-13 | Long-term “no second queue” requirement. [R03:556] | Correct design intent from existing post-15.5 boundary, but the present runtime job schema has one narrow workload type. A new task graph must compile to or extend this schema without silently weakening its ownership/concurrency semantics. [S01:21-75, 135-141] | Add an explicit runtime-schema compatibility gate: task workload extension, idempotency scope, tenant isolation, result/usage preservation, recovery behavior, and migration proof. | ACCEPT WITH REQUIRED SPEC |
| CR-14 | “Agenta immutable/append-only lineage” imported into ACS language. [R01:229-235, 424-429] | Agenta is a useful conceptual source but not proof that ACS has those guarantees. The Agenta audit itself distinguishes incomplete session history and noncanonical trace evidence. [R01:475-489, 597-607] | Cite Agenta only as an **ADAPT concept**; never use it to state ACS present behavior. | CORRECT |

## Required specifications before any implementation planning is promoted

### 1. Runtime state authority and graph-job compatibility specification

Must define, with source mapping to the existing `ExecutionJob`, `DurableJobAssignment`, `RuntimeStateEvent`, claim, recovery, and worker contracts:

- whether a `TaskRun` is an `ExecutionJob`, a parent record with one-or-more jobs, or a new workload envelope;
- new workload types beyond current `runtime.start`, including task node ID, workflow/workforce run refs, immutable binding/plan refs, graph revision, input/output artifact refs, and policy snapshots;
- graph scheduler ownership, transaction boundary and eligible-state query; CAMEL/Eigent cannot claim/lease jobs;
- dependency state and join semantics; terminal, retryable, blocked and awaiting-approval status mapping to the current runtime status set;
- idempotency relationship: existing job `idempotencyKey`, TaskNode `idempotency_scope`, workflow-level key, and retry attempts;
- cancellation propagation, late result/stale owner behavior, lease expiry/requeue, fencing, and recovery;
- checkpoint/resume and compensation semantics, which do not currently exist in durable runtime source;
- schema migration/backfill/rollback and shared-state compatibility; do not assume current multi-host proof.

The source baseline is `ExecutionJobWorkload = RuntimeStartWorkload`, current job/assignment fields, SQLite table state, the shared PostgreSQL runtime migrations, and `DurableRuntimeCoordinator` recovery/lease behavior. [S01, S16]

### 2. Lease and worker-authentication specification

Do not conflate these mechanisms:

- durable job fencing/stale-owner rejection;
- in-memory `WorkerAssignmentService` lease signatures;
- worker service authentication token signatures;
- authority/governance approval.

The new graph compiler must specify whether it relies on only durable lease/fencing, or requires a durable signed dispatch artifact. If signatures are kept, use secret-bound/key-managed signing and durable verification; do not inherit the `dev-lease-signing-key` default. [S02]

### 3. Evidence truth and correction specification

Define the canonical evidence record as a proposed new store/contract, not a restatement of existing projections:

- event identity, source identity, causation/correlation, ordering/watermarks, payload and redaction;
- source-of-truth rule for scheduler state, worker state, tool calls, provider usage, approvals and economics;
- append versus correction/supersession semantics, including retained inaccurate/corrected records;
- evidence completeness states: complete, incomplete, unavailable, derived, estimated, reconciled;
- artifact/source/knowledge/context references and retention;
- rebuild/replay limits and evidence query consistency.

The source currently gives read-side `OperationalEvidenceService` entity/correlation views derived from audit events, not the proposed ledger. [S04]

### 4. Economic compatibility and cost-allocation specification

V2 Cost Core must be additive to, not a reinterpretation of, the existing economic contract:

- preserve `BillingPolicy` and its revision, `EconomicAccount`, `UsageQuote`, `UsageReservation`, `EconomicAuthorizationDecision`, `UsageRecord`, `Settlement`, and `EconomicReceipt` identifiers/states;
- preserve `tenantId` visibility enforcement and existing `workloadId`, `planId`, `executionRunId`, and idempotency behavior;
- define explicit mappings for `organization` versus retained technical `tenantId` compatibility vocabulary;
- add allocation dimensions for product, workforce, workflow, task, agent revision, provider/model/harness/executor and retry/waste without claiming these are current economic truth;
- separate observation, normalized cost, allocation, pricing, Neurons denomination, obligation and settlement;
- name the current SQLite settlement adapter topology limit (`single_node_durable`, `multiInstance: not_proven`) and prohibit treating it as a production financial provider.

Sources prove upsert-based durable records and tenant-scoped visibility, not immutable economic lines or all-hierarchy allocation. [S06, S07]

### 5. Instructions, guide, and conformance baseline specification

Every future architecture/PoC document must cite and preserve:

- `PLANNING / DISCOVERY` status;
- `L4_READINESS`, `D3+`, execution-gated, non-production, no-mutation-authority status;
- the automation maturity boundary: monitor/validate/recommend/guide/simulate/prepare workflows/telemetry/receipts/manual approval only;
- `ACS-BLOCKER-014` as an open high blocker: 680 total, 673 pass, five fail, two skipped as of 2026-09-09;
- current failure scope, including operational evidence and two economic tests;
- explicit separate authorization for any provider integration, runtime change, schema migration, execution or financial path.

This is necessary because a future “PoC” that changes durable runtime schema, API, evidence store, provider adapter, or economics is an implementation project, not a documentation action. [S08, S09]

## Disposition of unified decision record

| Decision | Cross-review disposition | Required wording / gate |
|---|---|---|
| ACS-native core; no permanent ACS→Eigent→CAMEL chain | ACCEPT | State CAMEL is planner/validator only and has no durable runtime authority. |
| Agenta ADAPT for AgentTemplate, ModelRef/resolution, harness capability and sequenced events | ACCEPT WITH BOUNDARY | Adopt concepts through ACS compiler/adapters only; resolved credentials and session events never become canonical identity/economic truth. |
| Existing ACS Agent/Provider/Runtime/Governance/Evidence/Economics are ADOPT internally | ACCEPT WITH QUALIFICATION | Preserve validated contracts; distinguish source-confirmed capabilities from historically certified/topology-limited evidence and current failing-suite state. |
| Revisioned Workforce/Workflow graph and task state machine | ACCEPT AS PROPOSED DESIGN | Require runtime graph-job compatibility spec and evidence/cost contract first. |
| Compile TaskRun to durable runtime jobs | CONDITIONAL | Only after source-level workload/state/schema mapping and no-second-queue proof. No claim of existing support. |
| `append-oriented` canonical evidence ledger | CONDITIONAL | Proposed new ledger with correction/reconciliation model; current views and JSONL are not sufficient. |
| V2 execution API/SDK/stream/outbox | PROPOSED ONLY | No endpoint, broker, outbox or resume/checkpoint contract is currently implemented. |
| Economic/Neurons layer | ACCEPT AS FUTURE ARCHITECTURE | Preserve existing economic contract and prohibit financial activation; allocation additions must be additive and tenant-scoped. |
| PoCs and Conditional Go | REWORD | “Candidate, separately authorized, isolated implementation PoCs after named gates.” Current sprint grants architecture discovery only. |

## Recommended corrected synthesis paragraph

> ACS v2 proposes an ACS-owned Workforce/Workflow graph layer that compiles validated task workloads into the existing durable runtime only after a schema and state-machine compatibility design is approved. ACS currently owns agent revision fingerprints, execution planning, tenant/governance boundaries, durable job/worker lease/fencing/recovery foundations, Product API projections, and tenant-scoped economic records. Agenta and CAMEL may inform compiler, capability-negotiation, event-ingest, and graph-validation adapters, but neither may own ACS identity, durable runtime state, governance, evidence, or economics. The proposed evidence ledger, graph state machine, task checkpoints, full cost allocation, and V2 API are unimplemented contracts. All implementation and PoCs require separate authorization; `ACS-BLOCKER-014` remains open.

## Evidence index

| Ref | Source | Lines | Relevance |
|---|---|---:|---|
| R01 | `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/agenta-core-audit.md` | 14-29, 180-213, 229-260, 327-335, 398-430, 475-489, 597-607, 644-655 | Agenta reuse limits, ModelRef/resolution, sequenced events, incomplete history, cost insufficiency. |
| R02 | `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/eigent-camel-core-audit.md` | 142-188, 250-330 | Eigent desktop and CAMEL in-memory constraints; evidence/context recommendations. |
| R03 | `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md` | 42-51, 57-100, 102-171, 216-270, 337-353, 384-446, 516, 535-607, 612-620 | Unified target claims reviewed and corrected. |
| R04 | `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/decision-record.md` | 9-18, 32-60 | Decision/reuse path and Conditional-Go/PoC framing under review. |
| S01 | `/opt/Axodus/ACS/src/workers/durable-runtime-state.ts` | 9-141, 230-330, 520-735, 990-1030, 1080-1265 | Actual durable job/assignment schema, narrow workload type, fencing/retry/recovery authority. |
| S02 | `/opt/Axodus/ACS/src/workers/worker-assignment-service.ts` | 27-43, 65-97, 198-276 | Separate in-memory assignment/lease signature implementation and development default key. |
| S03 | `/opt/Axodus/ACS/.instructions/DECISIONS.md` | 300-315, 400-409 | Historical local append-only JSONL receipt/telemetry statements and scope limits. |
| S04 | `/opt/Axodus/ACS/src/control-plane/operational-evidence-service.ts` | 20-110, 696-879 | Current evidence entity limits and read-side derivation from audit events. |
| S05 | `/opt/Axodus/ACS/.instructions/ARCHITECTURE.md` | 205-240 | Historical deterministic/in-process workflow and append-only local telemetry/receipt baseline. |
| S06 | `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts` | 55-170, 185-225, 344-430, 730-765 | Existing economic entities, policy/revision, tenant visibility and authorization semantics. |
| S07 | `/opt/Axodus/ACS/src/control-plane/durable-economic-state.ts` | 270-315, 317-410 | Economic upsert behavior and single-node durable settlement-provider limits. |
| S08 | `/opt/Axodus/ACS/.instructions/STATUS.md` | 5-31 | Planning-only maturity and ACS-BLOCKER-014 baseline. |
| S09 | `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md` | 207-242 | Open blocker details and no-go financial areas. |
| S10 | `/opt/Axodus/ACS/src/control-plane/execution-plan-resolver.ts` | 47-123 | Existing resolution of engine/target/provider/credential/runner and present default policy values. |
| S11 | `/opt/Axodus/ACS/src/control-plane/unified-agent-model.ts` | 21-47, 189-249 | Current AgentDefinition/AgentRevision and fingerprint/freeze behavior. |
| S12 | `/opt/Axodus/ACS/src/control-plane/agent-service.ts` | 55-105, 154-380 | In-memory replace/remove/revision controls and service validation. |
| S13 | `/opt/Axodus/ACS/src/types.ts` | 69-112 | Current linear workflow step and receipt contracts. |
| S14 | `/opt/Axodus/ACS/src/workflows/index.ts` | 13-38; `/opt/Axodus/ACS/src/workflows/dev-coordination.ts` 3-38 | Named workflow factory baseline. |
| S15 | `/opt/Axodus/ACS/src/orchestrator.ts` | 33-116 | Sequential loop and receipt/telemetry behavior. |
| S16 | `/opt/Axodus/ACS/src/control-plane/shared-state/migrations.ts` | 130-160; `/opt/Axodus/ACS/src/http/control-plane-context.ts` 79, 811-816 | Shared-profile PostgreSQL runtime schema exists separately from locally selected SQLite durable runtime state. |
