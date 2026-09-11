# Decision Record

## D06-01 — Workforce is an ACS-owned revisioned composition aggregate

**DECISION** Workforce v1 is an ACS-owned aggregate distinct from Runtime
Worker, executor, provider, and Workflow.

**CONTEXT** Current ACS has Agent lineage, runtime, evidence, accounting, and a
generic Workforce revision reference but no Workforce aggregate. REQ-03 left
Workforce partial.

**EVIDENCE** src/native-core/agent.ts:20-230; src/native-core/runtime.ts:50-198;
docs/architecture/acs-v2/req-03/contracts.md:160-213.

**OPTIONS** Reuse runtime Worker; adopt Eigent/CAMEL Workforce; create ACS
aggregate.

**SELECTED** Create an ACS aggregate using existing Scope, RevisionRef,
fingerprint, CAS, event/outbox, and shared PostgreSQL patterns.

**REJECTED** Runtime Worker confuses capacity with composition. Eigent/CAMEL
would make external object graphs and local persistence authoritative.

**RATIONALE** Preserves provider independence, reproducibility, governance, and
removability.

**CONSEQUENCES** Durable Workforce repository and migration remain future work.

## D06-02 — Workforce membership supports pinned and admission-resolved selectors

**DECISION** A slot uses pinned AgentRevisionRef or
current_head_at_admission. Run admission freezes the resolved Agent revision.

**CONTEXT** Reproducibility requires historical Agent identity; controlled
upgrades require a deliberate current-head option.

**EVIDENCE** Agent lineage contract, docs/architecture/acs-v2/req-04/agent-lineage-contract.md;
existing Run/Execution context refs, src/native-core/runtime.ts:50-67,109-128.

**OPTIONS** Agent id only; pinned only; current head only; explicit dual mode.

**SELECTED** Explicit dual mode.

**REJECTED** Agent id only is ambiguous; current head at dispatch loses
reproducibility; pinned-only prevents a governed upgrade path.

**RATIONALE** Captures exact evidence while allowing authorized admission-time
resolution.

**CONSEQUENCES** Run admission must transactionally create membership snapshots.

## D06-03 — Coordination is separated from Workforce composition

**DECISION** Workflow/Coordination owns graph, delegation, dependency,
assignment, routing, scheduling policy, recovery strategy, and supervisor
behavior. Workforce owns eligible stable composition only.

**CONTEXT** Earlier proposal mixed coordinator policy and Workflow references
into WorkforceRevision.

**EVIDENCE** docs/architecture/acs-v2/req-03/contracts.md:160-268; Eigent
workforce.py:287-379,599-753; CAMEL TaskChannel as inspected under
backend/.venv/lib/python3.11/site-packages/camel/societies/workforce/.

**OPTIONS** Workforce owns coordination; Workflow owns coordination; external
engine owns coordination.

**SELECTED** ACS Workflow/Coordination owns coordination through a separate
contract.

**REJECTED** Workforce-owned coordination causes revision churn and engine
coupling. External ownership violates ACS sovereignty.

**RATIONALE** Assignment changes often without roster change; therefore it is a
Run/Task decision, not composition mutation.

**CONSEQUENCES** Workflow graph and assignment persistence are explicitly
deferred rather than hidden inside Workforce v1.

## D06-04 — Removable adapter has proposal-only sovereignty

**DECISION** Future coordination engines may submit proposals and normalized
observations but cannot write canonical ACS state.

**CONTEXT** Eigent/CAMEL have valuable decomposition/assignment patterns but
own local graphs, queues, sessions, and retry behavior.

**EVIDENCE** Eigent backend/app/utils/workforce.py:155-219,287-379,599-753;
backend/app/service/task.py:411-440; backend/pyproject.toml:1-40.

**OPTIONS** Integrate engine as runtime authority; generic adapter with write
authority; proposal-only adapter.

**SELECTED** Proposal-only adapter.

**REJECTED** Integration or write authority would change canonical persistence,
Run/Task truth, governance, and provider neutrality.

**RATIONALE** ACS validates every canonical decision and survives adapter removal.

**CONSEQUENCES** CAMEL remains future PoC only; Eigent remains rejected as a
permanent dependency.

## D06-05 — Existing native Run/Task/Attempt and accounting contracts remain intact

**DECISION** REQ-06 extends references and future projections; it does not
redesign Run/Task/Attempt, runtime fencing, evidence, Usage, Cost, price, or
settlement.

**CONTEXT** These are already frozen semantic foundations.

**EVIDENCE** src/native-core/runtime.ts:109-198; src/native-core/accounting.ts:30-148;
docs/architecture/acs-v2/req-03/contracts.md:462-635.

**OPTIONS** Redesign execution/economics with Workforce; additive Workforce
linkage.

**SELECTED** Additive linkage.

**REJECTED** Redesign would exceed authorization and modify accepted contracts.

**RATIONALE** Existing dimensions already support Workforce revision and
cost-center attribution.

**CONSEQUENCES** Task assignment needs an additive decision projection, not a
replacement Task model.

## D06-06 — REQ-06 resolves the partial REQ-03 Workforce proposal

**DECISION** REQ-06 is the FROZEN-v1 Workforce semantic contract and supersedes
only the `PARTIAL` WorkforceDefinition, WorkforceRevision, and
WorkforceRunMembership proposal in REQ-03.

**CONTEXT** REQ-03 deliberately left Workforce partial and placed coordination
policy, Workflow references, and execution-policy fields in WorkforceRevision.

**EVIDENCE** docs/architecture/acs-v2/req-03/contracts.md:160-213;
docs/architecture/acs-v2/req-06/acs-current-state-audit.md:46-56.

**OPTIONS** Preserve the partial proposal unchanged; treat it as an accepted
implementation contract; freeze a narrower ACS Workforce contract.

**SELECTED** Freeze the narrower Workforce-only contract in REQ-06.

**REJECTED** Leaving coordination policy in Workforce causes composition
revision churn and permits engine semantics to influence Workforce identity.

**RATIONALE** The earlier record was explicitly partial, while the source audit
shows no durable Workforce implementation to preserve.

**CONSEQUENCES** REQ-03 continues to govern its other accepted contracts;
implementation is still separately authorized work.

## D06-07 — Direct Attempt-level accounting needs additive linkage

**DECISION** The Workforce attribution boundary requires a direct immutable
Attempt reference or bridge before a future implementation claims lossless
attempt-level Usage or Cost attribution.

**CONTEXT** UsageRecordV2 stores Run, optional Task, Agent revision, Workforce
revision, provider/model/executor, and evidence, but not `attempt_id`. Cost
references Usage rather than a TaskAttempt.

**EVIDENCE** src/native-core/accounting.ts:30-73,99-121;
src/native-core/runtime.ts:130-153; src/native-core/evidence.ts:20-48.

**OPTIONS** Aggregate only by Task; infer Attempt from mutable executor data or
evidence; add an optional immutable Attempt reference or bridge.

**SELECTED** Require an additive optional `attempt_id` or immutable bridge,
subject to accounting-contract compatibility review in an authorized milestone.

**REJECTED** Task-only aggregation cannot distinguish retries. Mutable executor
or evidence inference is not a lossless canonical accounting key.

**RATIONALE** The linkage preserves the current economic model while making
retry attribution reproducible.

**CONSEQUENCES** This does not block the Workforce v1 semantic freeze. It is a
prerequisite for direct Attempt-level attribution and its related VAL-03 test.

## D06-08 — Workforce reuses governed roles by exact historical revision

**DECISION** WorkforceMemberV2 MAY reference the existing governed role
resource only by exact id and revision. Workforce Core does not introduce a
WorkforceRole aggregate.

**CONTEXT** The role registry supports role references and current resource
validation, but its current in-memory implementation does not demonstrate
historical revision lookup.

**EVIDENCE** src/control-plane/composition-resources.ts:4-69,216-255;
docs/architecture/acs-v2/req-06/acs-current-state-audit.md:35-48.

**OPTIONS** Copy role data into Workforce; resolve current role at admission;
extend existing governed-resource lineage for exact revision resolution.

**SELECTED** Extend the existing governed-resource domain when implementation
is authorized; retain exact role references in Workforce revisions.

**REJECTED** Copying roles creates parallel authority. Current-head substitution
breaks historical reproducibility and can silently change slot semantics.

**RATIONALE** Roles are ACS-governed composition resources, while Workforce
only binds the role expectation to a member slot.

**CONSEQUENCES** Exact historical role resolution is an IMP-03A prerequisite.
It does not block the Workforce semantic contract.

## D06-09 — New operational Runs bind only the active current Workforce head

**DECISION** A new operational Workforce Run binds the active current
Workforce revision during admission. A historical revision may be bound only by
a separately authorized replay or reconstruction operation.

**CONTEXT** Immutable history must remain reproducible without allowing an old
definition to bypass the current lifecycle or governance state.

**EVIDENCE** src/native-core/runtime.ts:109-153,478-535;
docs/architecture/acs-v2/req-04/agent-lineage-contract.md:116-123;
docs/architecture/acs-v2/req-06/workforce-run-task-ownership.md:29-54.

**OPTIONS** Permit any historical revision for new Runs; bind current active
head only; allow a governed replay/reconstruction exception.

**SELECTED** Bind current active head for new work and gate historical binding
to replay/reconstruction.

**REJECTED** Unrestricted historical binding bypasses lifecycle status and can
revive a superseded composition without a new authoritative revision.

**RATIONALE** Reproducibility is preserved by immutable records and snapshots,
not by treating obsolete operational definitions as eligible work admission.

**CONSEQUENCES** Product API and Run admission require a distinct historical
reconstruction path. This is not a current-head rewind.

## CTO and CEO decisions

No CTO decision blocks the Workforce v1 contract freeze. CTO must authorize any
implementation milestone separately, including the accounting-contract
compatibility review required for direct Attempt-level attribution.

No CEO decision is required by this REQ. CEO review is required before any
future change to governance authority, cross-scope sharing, security posture,
economic responsibility, provider-specific Workforce semantics, or canonical
persistence topology.
