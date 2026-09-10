# ACS-V2-REQ-02 — Sub-Agent C: ACS Current Core Audit

**Repository:** `/opt/Axodus/ACS`
**Audit date:** 2026-09-10
**Scope:** read-only architecture discovery; no source, configuration, credential, runtime, or external-service mutation.
**Repository state:** clean `dev` branch at `cd9544131ffb622d407faf266357b4d28598cd16` (`2026-09-09T12:23:53-03:00`, “Add ACS v2 architectural documentation and evaluation framework”). Remote: `https://github.com/Axodus/ACS.git`.
**Output status:** evidence-backed current-state input to the ACS-v2 cross-system synthesis; it is not an implementation or production-readiness approval.

## 1. Scope, method, and evidence standard

I inspected governing instructions, ACS-v2 planning material, EPIC-10 through post-15.5/EPIC-16 boundary and closure records, source and test inventories, TypeScript contracts and implementations, the Product API route surface, Python OpenClaw/AgentsAI engine submodule metadata, dependency manifests/lockfile, git identity, and license-file presence. Search began with `rg --files`/`rg` and source conclusions are cited as absolute paths and 1-based ranges.

Classification used in this report:

- **Confirmed implementation** — current source defines behavior or executable contracts; tests may corroborate but do not substitute for source review.
- **Documented/certified record** — an EPIC or certification document records prior evidence; its stated topology and date limitations remain binding.
- **Docs-only design** — ACS-v2 proposal, not proof of an active capability.
- **Inference/gap** — architectural conclusion drawn from what was and was not found in the inspected repository.

The repository guide requires the Product API and EPIC documentation as source of truth, maintains the distinction among control plane, runtime state, and external targets, and prohibits unsupported production-readiness claims. [Evidence E01]

## 2. Executive architecture finding

ACS is already a substantial control-plane platform. It must not be treated as a greenfield shell around Agenta, Eigent, CAMEL, or OpenClaw. The current system has an ACS-owned agent definition/revision lifecycle; model, runner, credential, engine, target, deployment, runtime, and execution-run separation; deterministic workflow primitives; durable jobs, assignments, worker leases/fencing/recovery; tenant-scoped governance and trusted HTTP identity; auditable/economic evidence projections; and a broad Product API. [E03, E04, E05, E06, E07, E08, E09]

The central convergence gap is equally clear: ACS has no canonical **Workforce** aggregate, workforce revision, task graph/DAG model, dependency/join semantics, task handoff envelope, or provider-neutral multi-agent orchestration lineage. The existing early `AcsOrchestrator` synchronously walks sequential steps for policy/capability validation and receipt synthesis; it does not invoke agent task work. The later durable runtime is a job/worker control plane. Neither should be relabeled as a completed workforce core. [E06, E07]

**Preservation rule:** retain ACS ownership of canonical identities, revisions, plans, governance, tenant isolation, evidence, economics, and Product API. Any Agenta/Eigent/CAMEL/OpenClaw mechanism must enter behind ACS-owned contracts; it must not become the institutional source of truth. This aligns with the current ACS-v2 planning package, which is explicitly planning/discovery and names third parties as replaceable capability providers. [E02]

## 3. Repository identity, dependencies, and provenance

| Item | Finding | Status / implication |
|---|---|---|
| Main package | `@axodus/acs-core`, `0.1.0`, private ESM TypeScript package; declared purpose is “core runtime contracts and deterministic orchestration primitives.” | Confirmed implementation package identity. [E10] |
| Direct runtime dependencies | `pg` and `viem`; TypeScript and Node/pg types are dev dependencies. Lockfile resolves `pg@8.23.0`, `viem@2.55.19`, `typescript@5.9.3`. | Dependency set is narrow at root; no Agenta/Eigent/CAMEL dependency is declared. [E10] |
| Root repository license | No root `LICENSE`, `COPYING`, or `NOTICE` file was found outside dependencies. | **LIC-ACS-001 / HIGH for reuse/distribution planning:** ACS ownership/license terms are not evidenced locally; legal review must establish them before importing third-party code or distributing combined work. |
| OpenClaw engine | `engines/agentsai` is a git submodule, checked out detached at `7a073ed…`; remote is Axodus `AgentsAI`. | Confirmed external-engine boundary, but separately versioned. [E11] |
| Submodule provenance drift | The superproject gitlink is `7a073ed…`; manifest says source revision `ce46b…`, and states that pinned revision is not fetchable from origin because S01/S02/S04 commits are local-only. | **ACS-V2-BLOCKER-001 / HIGH:** OpenClaw engine reproduction/provenance is inconsistent. Do not copy/adopt its code until the exact source revision, upstream history, and license are reconciled. [E11] |
| AgentsAI license | No license/copyright/notice file was found at inspected submodule depth; `pyproject.toml` identifies package `openclaw-acs` and only `PyYAML>=6.0`. | **LIC-ACS-002 / HIGH:** no local license proof for OpenClaw/AgentsAI submodule reuse. [E11] |
| Dependency licenses sampled | `pg` and `viem` contain MIT licenses; TypeScript contains Apache-2.0 text. | Dependency license review is incomplete; this is a factual sample, not a complete SBOM or compatibility opinion. [E10] |

## 4. Current architecture map and runtime/data flow

```text
Axodus product / operator
  -> ACS Product API (/api/v1; trusted identity + tenant/governance context)
  -> ACS control-plane services
     -> canonical AgentRevision + composition resources
     -> ExecutionPlanResolver
        -> ModelProviderRegistry + CredentialConnectionRegistry + AgentRunnerRegistry
        -> EngineRegistry + ExecutionTargetRegistry
     -> deployment/runtime lifecycle OR durable RuntimeCoordinator
        -> worker registration/eligibility/assignment/lease/fencing/retry/cancel/recovery
        -> AgentEngine adapter (OpenClaw adapter is one implementation)
        -> runner/provider/credential/external target
  -> correlated events, audit, evidence, logs, telemetry, usage/economic records
  -> Product API read models and operational journeys
```

This is a **control-plane-first** architecture. The canonical execution planning model carries agent revision/fingerprint, tenant/workload scope, engine, target, runner, provider/model/credential, governance/economic/isolation policy references, materialization roots, deployment mode, and correlation ID. [E03]

### 4.1 Confirmed control-plane layers

| Layer | Confirmed current capability | V2 consequence |
|---|---|---|
| Agent core | `AgentDefinition`, immutable fingerprinted `AgentRevision`, composition, lifecycle actions/revision history. | Preserve and extend; do not replace with provider-specific agent identity. [E03] |
| Composition resources | Role, profile, capability, skill, tool, plugin/package-source concepts are surfaced by Product API and used in composition. | Preserve resource references; add version/provenance/governance semantics where needed. [E05] |
| Runtime/provider separation | Agent model uses a model strategy; resolver independently resolves model provider, credential, runner, engine/target plan. `AgentEngine` and `AgentRunner` are separate contracts. | Preserve this separation exactly; it matches the requested Provider/Model/Harness/Executor distinction, though harness is not yet a named first-class canonical contract. [E03, E04] |
| Execution | Deployment, runtime instance, execution run, engine deployment/start/inspect/rollback contract. | Preserve lifecycle entity separation. [E03, E04] |
| Durable runtime | Jobs, assignments, workers, capacity, heartbeats, leases/fencing, retries, cancellation, recovery, durable state. | Reuse as execution substrate beneath workforce/task orchestration; do not create a second executor/lease system. [E07] |
| Workflow | Named registered workflows and an early deterministic orchestrator. | Preserve as deterministic workflow compatibility; replace/extend its limited sequencing model with a canonical workflow/task-graph layer. [E06] |
| Evidence | Events, logs, audit, evidence, diagnostics, correlation, entity references, and operational/economic query models. | Preserve established correlation/evidence APIs and append-oriented audit posture; extend canonical lineage to workforce/task/tool/context/provenance. [E08] |
| Governance/tenant isolation | Tenant domain/governance, trusted HTTP context, policy checks, secret references, fail-closed boundaries. | Non-negotiable transversal boundary. Workforce and agent-level policy must consume it rather than replicate it. [E09] |
| Economics | Quote/reserve/authorize/meter/settle/release types, usage dimensions, receipts, tenant-aware visibility/idempotency, durable economic adapters. | Preserve as economic evidence/accounting foundation; do not present as general billing or money movement. [E08, E12] |

### 4.2 Product API boundary

The `/api/v1` route surface already provides the ACS-owned consumer interface: health/readiness/auth/session/account/dashboard, composition resources, agents and revisions/lifecycle/composition/readiness/deployment, providers/credentials, targets, plans/deployments/runtimes, runtime jobs/cancel, execution runs, workers/runners, events/logs/audit/evidence/diagnostics, and economics/settlement/reconciliation read paths. It enforces public-route exceptions, platform-admin/system boundaries, and account/tenant context before internal routing. [E05]

**Required future integration strategy:** extend this API and its asynchronous job/evidence vocabulary for `run agent`, `run workforce`, `run workflow`, `resume`, `approve`, `cancel`, `retrieve result/evidence/cost`; do not expose Agenta, Eigent, CAMEL, or OpenClaw native APIs as the product contract.

## 5. Canonical concepts currently implemented

### 5.1 Agent identity, definition, versioning, lifecycle

`AgentDefinition` already includes stable `agentId`, name/status, role/profile revisions, capability/skill/tool IDs, a model strategy with primary/fallback model references and optional runner/capability requirements, credential connection IDs, runner preferences, execution-policy ID, and metadata. `AgentRevision` carries immutable definition, integer revision, SHA-256 fingerprint, timestamps, and optional creator. Secret-looking definition fields are rejected, and any credential used in a model strategy must be declared in the agent’s credential references. [E03]

`AgentComposition` distinguishes requested from effective resources and produces readiness findings. Its present optional materialization is explicitly `openclaw-compatible`, which is a legacy coupling to isolate behind a generalized materialization/harness contract before adding new executors. [E03]

**Must preserve:** identity, revision, fingerprint, optimistic revision conflict behavior, lifecycle guardrails, composition-readiness findings, and secret-reference-only rule.

**Must extend:** domain/ownership, explicit instructions/constraints, knowledge and memory policies, authority/approval/cost/audit policies, agent version provenance, provider-neutral harness declaration, and an immutable policy snapshot linked to each execution plan/run.

### 5.2 Runtime, provider, runner, engine, target, worker

Current contracts already separate:

- **Provider/model:** `AgentModelReference` and `AgentModelStrategy`; model-provider registry used by execution planning.
- **Credential:** `credentialConnectionId` references and a credential registry; no secret is embedded in agent definition.
- **Runner:** `AgentRunner` health/capabilities/execute/inspect interface and runner registry.
- **Engine:** `AgentEngine` owns target discovery/health, capabilities/version, deploy/inspect/rollback/start runtime.
- **Target:** target registry evaluates engine/runner/provider compatibility and refreshes engine-reported target state.
- **Worker:** worker identity/capability/capacity/health, assignment and dispatch lease are distinct from agent and target.

This is a stronger basis than the requested V2 hypothesis assumes. V2 should add an explicit **Harness** contract between composed agent/workforce task intent and executor materialization, and it should clarify whether a runner is an executor implementation or a sub-capability of one. It should not collapse the existing concepts into a single “provider.” [E03, E04, E07]

### 5.3 OpenClaw

OpenClaw is already positioned as an ACS engine adapter rather than ACS domain truth. The manifest identifies the engine protocol as `acs-engine/1`, source-only policy, and externally owned operational roots. The current ACS-v2 README also identifies OpenClaw behind an ACS-owned adapter as a foundation to preserve. [E02, E11]

**Preserve:** ACS adapter ownership, source/runtime/state/config/artifact/workspace root separation, and the rule that external discovery/materialization does not grant authority.

**Isolate/deprecate:** `openclaw-compatible` materialization type from the generic agent composition contract; it must become an adapter-specific capability.

**Decision relevant to OpenClaw:** keep it as a candidate persistent operational executor/engine behind `AgentEngine`, subject to submodule provenance and license remediation. It is not the workforce, agent identity, workflow, governance, or evidence owner.

### 5.4 Workflow and coordination

The early `AcsOrchestrator` evaluates policy, chooses a provider by capability, then walks sequential workflow steps and synthesizes completed step receipts without calling a provider, runner, engine, tool, or inference API. Named workflow factories register development-coordination, governance-alignment, implementation-plan, and security-review flows. This is a deterministic compatibility and validation path, but it is not task execution and does not establish DAG, branch/join, dynamic decomposition, task-level retries/compensation, human review nodes, or cross-agent handoffs. [E06]

The later durable runtime coordinator supplies the lower-level operational controls needed by future workflows: job/event records, worker eligibility and remote dispatch, lease expiry/fencing/stale-owner rejection, idempotency, cancellation, retries and recovery. [E07]

**Recommended boundary:**

```text
Workflow Core (new canonical definition/revision/task graph)
  -> Workforce Core (new composition/coordinator/task allocation)
     -> Runtime Core (existing durable job/worker/lease substrate)
        -> Engine/Runner/Provider/Target adapters
```

Deterministic workflow definitions should compile to durable task nodes. Dynamic agentic planning should produce a governed, versioned, auditable task-graph amendment; it must not bypass graph validation, governance, budget, evidence, or runtime ownership.

### 5.5 Workforce

No `Workforce` type, workforce repository, workforce revision, coordinator contract, participating-agent roster, task graph, or workforce lifecycle was found in source. Existing labels such as “workers” mean runtime execution workers, not a composition of collaborating agents. This semantic distinction is essential and must be preserved. [E07]

**Classification:** ACS Workforce Core is **REIMPLEMENT** as an ACS-owned aggregate, built on existing agent revisions and durable runtime contracts. Eigent/CAMEL findings may later inform an adapter or orchestration implementation, but the ACS model must remain canonical.

### 5.6 Knowledge, memory, tools, skills, MCP

ACS currently models role/profile/capability/skill/tool/plugin/package-source resource references and has a `redhat-mcp` contract/risk-gate boundary. That adapter explicitly states that it does not call MCP tools or execute commands. The audit found no general RAG pipeline, canonical knowledge object/reference graph, memory-store policy, context budgeting policy, or product-domain knowledge isolation model equivalent to the requested V2 contract. [E05, E09]

**Preserve:** resource registry semantics and explicit tool references.

**Extend/reimplement:** canonical `KnowledgeReference`, provenance, retrieval policy, scoped context envelope, memory policy/store, tool schema/version/capability/approval metadata, and MCP server/tool provenance. Avoid treating an external provider’s prompt context or memory as canonical ACS institutional knowledge.

## 6. Persistence, interfaces, events, and reconstruction

### 6.1 Persistence

The implementation contains in-memory repositories for local/service behavior and durable state stores for control-plane/runtime/economic concerns, including SQLite-backed state in the certified single-host record and later shared PostgreSQL authority evidence. The post-15.5 boundary requires new authoritative state to support the shared profile and fail closed; it explicitly says runtime jobs, assignments, workers, leases, results and cancellation already exist and must not be replaced with a parallel executor. [E03, E07, E12]

**Persistence rule for V2:** Agent, workforce, workflow, task graph, execution plan, task run, and evidence lineage must each declare their authoritative store, tenant scope, optimistic/concurrency behavior, idempotency key, retention, and cross-process semantics. Do not infer authoritative status from a read model or telemetry projection.

### 6.2 Events/evidence

`OperationalEvidenceService` has entity/correlation references; events/logs/audit entries; typed source categories; evidence records; diagnostic reports; and query APIs. It defines evidence kinds spanning readiness, deployment, runtime, worker, execution-run, policy, sandbox, isolation, credential, economic, and diagnostic evidence. Economic read models expose quote/reservation/authorization/metering/settlement/receipt/reconciliation states. [E08]

**Preserve:** correlation IDs, entity references, audit actor types, source segregation, evidence/read-model separation, tenant-scoped visibility, and existing Product API evidence reads.

**Gap:** no one canonical execution lineage contains workforce/workflow/task hierarchy, agent revision, instructions/context/knowledge references, provider/model/harness/executor, tool call request/result, artifacts/sources, parent/child causality, checkpoint/replay, approval decision, token/compute/storage/provider costs, and settlement linkage. The proposed V2 design should create an ACS-owned append/correction-oriented event and lineage schema; provider traces are inputs, not the ledger.

### 6.3 Observability

The platform has structured telemetry, correlation and diagnostics, with documented external-process OTLP boundaries in certified topology. Documentation requires redacted metric labels/logs and prohibits telemetry-exporter failures from affecting authoritative mutation, ownership, fencing, or settlement semantics. [E12]

**V2 consequence:** use the existing telemetry boundary for operational signals, but preserve the distinction that telemetry is not authoritative audit/evidence.

## 7. Governance, security, and trust boundaries

Current V2 planning and consolidated EPIC boundaries make the following non-negotiable:

- Governance is above ACS execution; ACS evaluates/enforces explicit authority and does not grant itself authority. [E02]
- Tenant/Organization scope, membership, authority, policy, entitlement, and limits are separate concepts; no cross-tenant mutation is allowed without explicit scope. [E09]
- Product API obtains trusted identity/context and maps into domain services; user-facing “Organization” retains technical `tenantId` compatibility vocabulary. [E02, E05]
- Agent definitions cannot contain secret values; credential connections and secret boundaries carry references/versions. [E03, E09]
- Worker ownership is lease/fencing/idempotency/recovery governed; an added workforce layer must not side-step it. [E07, E12]
- Financial records and settlement mechanisms remain governed/evidentiary boundaries; the current API cannot be interpreted as authority for unrestricted money movement. [E08, E12]

The current execution-plan resolver validates engine/target/provider/credential/runner references, but assigns `default-sandbox-policy`, `default-dev-policy`, and `sandbox` directly in the resolved plan. These defaults are implementation evidence for the present development path, not a complete governance/economic/isolation policy-resolution contract. [E04]

**V2 trust-zone design implication:** Each `AgentRevision`, `WorkforceRevision`, `WorkflowRevision`, `TaskRun`, `KnowledgeReference`, `CredentialReference`, and `EconomicRecord` must carry tenant/product/domain scope or a documented shared-capability authorization. Cross-domain context, credentials, budgets, evidence access, and shared agents require an explicit policy decision and auditable approval; visibility must not be converted into authority.

## 8. Economics and $Neurons baseline

The code defines a measured economic lifecycle: quote, reserve, authorize, meter, settle, release/fail; `UsageDimension` records and `NeuronsAmount`; tenant-aware accounts/policies; idempotent state/settlement provider interfaces; receipts; and visibility checks. The Product API exposes read models and controlled operations around these concepts. [E08]

**Confirmed foundation:** internal usage/economic accounting and settlement evidence are more mature than a planning-only cost concept.

**Not established by this audit:** complete provider-normalized token/model/tool/compute/storage cost ingestion, product → workforce → workflow → agent → task attribution, public billing/pricing, invoice/tax/accounting, payment capture, or money movement. EPIC-16 calls invoices/payment capture/tax/accounting unsupported and records that it has reopened; do not flatten earlier “production-eligible” language into a financial-execution approval. [E12]

**V2 requirement:** retain distinct data contracts:

```text
Usage observation -> normalized measured cost -> internal cost allocation
-> pricing policy -> Neurons denomination -> governed settlement obligation
-> authorized settlement provider/action
```

The existing `EconomicService` should be **ADAPT** as the lower economic authorization/usage/receipt substrate. A future Cost Core should **REIMPLEMENT** a provider-neutral cost allocation ledger that feeds this substrate; it must not encode billing or on-chain settlement into agent execution.

## 9. Capability mapping: current ACS versus requested V2 cores

| Requested core/capability | Current ACS evidence | State | V2 disposition |
|---|---|---|---|
| Agent identity/definition/versioning | AgentDefinition, revision/fingerprint, lifecycle/repository/service. | Confirmed implementation. | **PRESERVE + EXTEND** |
| Agent lifecycle | Draft/active/disabled/archived, revision and lifecycle actions. | Confirmed implementation. | **PRESERVE** |
| Skills/tools/roles/profiles | Composition resource IDs and API resources. | Confirmed implementation; detailed semantic/version model incomplete. | **PRESERVE + ADAPT** |
| MCP | Red Hat MCP contract/risk gate explicitly does not invoke MCP tools; no general MCP registry/governance model found. | Contract-only/partial. | **REIMPLEMENT canonical MCP registry/policy** |
| Provider/model | Model strategy + provider registry and resolver. | Confirmed implementation. | **PRESERVE + EXTEND** |
| Harness | OpenClaw-compatible materialization implied. | Coupled/partial. | **REIMPLEMENT explicit neutral harness contract** |
| Executor/runner/engine/target | Separate contracts and target/worker registries. | Confirmed implementation. | **PRESERVE + CLARIFY** |
| OpenClaw | ACS-owned adapter plus Axodus submodule. | Implemented adapter with provenance/license gap. | **ADAPT; isolate pending blocker** |
| Codex | No canonical Codex adapter identified in current public source contracts. | Docs/intended capability only. | **PoC/ADAPT after contract definition** |
| Direct model runtime | Provider/runner abstractions support it conceptually; no specific direct-LLM adapter confirmed. | Partial. | **ADAPT** |
| Workforce | No canonical aggregate. | Absent/gap. | **REIMPLEMENT** |
| Workflow | Named deterministic sequential workflows. | Confirmed but limited. | **PRESERVE + EXTEND** |
| DAG/dependencies/parallel branches | No canonical graph model found. | Gap. | **REIMPLEMENT** |
| Dynamic decomposition/handoffs | No canonical task planner/handoff/context envelope found. | Gap. | **REIMPLEMENT/possibly adapter-backed** |
| Durable tasks/retry/cancel/recovery | Runtime jobs, workers, leases/fencing/recovery. | Confirmed implementation. | **PRESERVE + ADAPT as substrate** |
| Knowledge/memory/context | Resource refs only; no general knowledge/memory model found. | Partial/gap. | **REIMPLEMENT** |
| Governance/isolation/secrets | Tenant/governance boundaries and credential references. | Confirmed implementation. | **PRESERVE** |
| Evidence/provenance | Operational evidence/audit/telemetry/read models. | Confirmed but incomplete execution lineage. | **PRESERVE + EXTEND** |
| Reporting | Product API operational/economic projections. | Confirmed read paths. | **PRESERVE + EXTEND** |
| Cost/economics/$Neurons | Quote/reserve/usage/settlement/receipt contracts and durable adapters. | Confirmed foundation, not full billing. | **PRESERVE + ADAPT** |
| Product integration | Product API with broad management/read routes. | Confirmed implementation. | **PRESERVE; add stable run/workforce APIs** |

## 10. Reuse decisions for ACS-native convergence

These decisions describe ACS’s own current implementation and the required posture for external discoveries; they are not a decision to import external code.

| Major core | Current ACS asset | Recommended strategy | Rationale |
|---|---|---|---|
| ACS Agent Core | Unified agent model, revisions, composition, lifecycle, resource/service interfaces. | **ADOPT existing ACS; ADAPT external concepts only** | It already owns correct identity/revision/secrets/provider boundaries. External agent-management code must map into this model. |
| ACS Workforce Core | No canonical aggregate; durable runtime workers are a different domain. | **REIMPLEMENT ACS-native; ADAPT Eigent/CAMEL planning concepts under the reconciled proposal** | Workforce identity/composition/governance/economics/evidence must be ACS-owned. |
| ACS Workflow Core | Deterministic registered workflows + sequential orchestrator. | **ADAPT existing ACS, REIMPLEMENT graph semantics** | Preserve compatibility flows while introducing DAG/task/node/revision/checkpoint contracts. |
| ACS Runtime Core | Runtime lifecycle/jobs/workers/leases/fencing/recovery. | **ADOPT existing ACS** | A second executor/lease system would violate consolidated platform boundaries. |
| ACS Provider Core | Model strategy, provider/credential/runner registries and plan resolver. | **ADOPT existing ACS; ADAPT providers** | Existing separation is fit for provider neutrality. |
| ACS Executor Core | AgentEngine, targets, runners, worker dispatch. | **ADOPT existing ACS; ADAPT Codex/OpenClaw/direct runtimes** | Adapter boundary exists; OpenClaw provenance must first be fixed. |
| ACS Integration Core | Product API and async runtime/evidence endpoints. | **ADOPT existing ACS; EXTEND** | Products must consume ACS-native API/events/SDK contracts. |
| ACS Evidence Core | Audit/evidence/telemetry/economics projections. | **ADOPT + EXTEND** | Preserve correlation/audit; add complete lineage graph. |
| ACS Reporting Core | Product API projections/diagnostics/operational read models. | **ADOPT + EXTEND** | Derive from canonical evidence and economics, not provider dashboards. |
| ACS Cost Core | Economic authorization/usage/receipt/settlement substrate. | **ADAPT + REIMPLEMENT allocation normalization** | Existing terms support measured usage, but workforce/task/provider allocation is not canonical. |
| ACS Economic Core | $Neurons-oriented amount, usage and settlement interfaces. | **ADOPT guarded foundation; REJECT financial execution expansion in this sprint** | Distinguish accounting/evidence from pricing, settlement authorization, and money movement. |

## 11. Rejected, isolated, stale, or uncertain elements

| Item | Classification | Evidence and reason |
|---|---|---|
| Treating OpenClaw/AgentsAI as ACS agent/workflow/evidence owner | **REJECT** | ACS-v2 principles expressly reserve canonical identity/workflow/evidence/governance to ACS; OpenClaw is adapter-scoped. [E02, E11] |
| Generic “worker” equals “workforce” | **REJECT** | Existing worker types describe execution process identity/capability/capacity/leases, not agent composition. [E07] |
| `openclaw-compatible` as canonical materialization | **ISOLATE/DEPRECATE from core** | Current `AgentComposition` directly names it; it prevents executor neutrality. [E03] |
| Full RAG/memory/context capability claim | **REJECT as unsupported** | No general canonical RAG/knowledge/memory/context policy model was found; resource references are insufficient. [E05, E09] |
| Canonical DAG/multi-agent/agentic planning claim | **REJECT as unsupported** | Current deterministic workflows and durable jobs do not define workforce/task graph semantics. [E06, E07] |
| Global production / multi-host claim | **REJECT** | Global multi-host is terminal `NOT_CERTIFIED`; single-host certification remains bounded. [E12] |
| Billing/money movement/financial settlement execution | **REJECT for V2 sprint and current base** | EPIC-16 documents invoices/payment capture/tax as unsupported; request itself prohibits financial operations. [E12] |
| OpenClaw submodule reuse today | **DEFER/BLOCK** | Revision mismatch/non-fetchability and absent local license proof. [E11] |
| ACS-v2 current-state document baseline hash | **STALE DOCUMENT METADATA** | `docs/architecture/acs-v2/current-state-audit.md` names `5212e3a…`; actual audited HEAD is `cd9544…`. Treat its substantive claims as historical until reconciled. [E13] |

## 12. Blockers, risks, and candidate future PoCs

### Existing baseline blocker to preserve

**ACS-BLOCKER-014 — HIGH, OPEN:** a 2026-09-09 `npm run check` reported TypeScript compilation passing but the 680-test suite at 673 passing, five failing, two skipped. Failures affect operational-evidence HTTP behavior, observability/rate limiting, a production-target child process, a missing public export in an economic test, and usage/reservation correlation. It does not invalidate planning, but blocks a fresh full-suite health claim and implementation readiness evidence. This audit did not run it, because the sprint is read-only and the blocker expressly calls for separately scoped diagnosis. [E14]

### New findings from this ACS audit

| ID | Severity | Affected component | Finding | Planning impact / required action |
|---|---|---|---|---|
| ACS-V2-BLOCKER-001 | HIGH | OpenClaw/AgentsAI engine provenance | Gitlink (`7a073ed…`) and manifest revision (`ce46b…`) differ; manifest says pinned revision is not fetchable from origin. | Blocks reproducible code reuse and credible ADOPT decision for engine code. Reconcile source revision and upstream availability before a PoC. |
| LIC-ACS-001 | HIGH | ACS repository reuse/distribution | No root project license/notice was found. | Legal ownership/license decision required before combining/distributing copied third-party work. |
| LIC-ACS-002 | HIGH | AgentsAI/OpenClaw | No local license/notice proof found in inspected submodule. | Blocks code copying/adoption pending upstream license and copyright audit. |
| ACS-V2-GAP-001 | HIGH | Workforce/workflow core | No canonical workforce/task-DAG/handoff/checkpoint model. | Core implementation work required; validates need for Eigent/CAMEL discovery and a bounded PoC. |
| ACS-V2-GAP-002 | HIGH | Evidence/cost lineage | Existing evidence/economic models lack full workforce→workflow→task→tool/context/provider cost lineage. | Contract-first evidence/cost extension must precede multi-agent production adoption. |
| ACS-V2-GAP-003 | MEDIUM | Knowledge/context/MCP | No general scoped knowledge, memory, context, or MCP governance model found. | Must be designed before cross-domain workforce execution. |
| ACS-V2-GAP-004 | MEDIUM | Canonical runtime vocabulary | Harness is implicit/coupled; Runner, Engine, Target, Worker have strong contracts but need V2 semantic mapping. | ADR required before provider/executor integration. |
| ACS-V2-GAP-005 | MEDIUM | Plan policy resolution | Resolver currently injects default sandbox/dev policy and isolation identifiers rather than resolving versioned policy snapshots. | Add governance/economic/isolation resolvers before multi-agent execution. |

### Candidate future bounded PoCs, after separate implementation authorization

1. **Execution-envelope adapter PoC:** run one inert/low-risk agent definition through a new provider-neutral request/result/evidence envelope and prove parity with current `AgentEngine`/`AgentRunner` planning, tenant scope, correlation, and secret-reference rules.
2. **Workflow-to-durable-job compilation PoC:** compile a two-node deterministic workflow into existing durable jobs/leases/cancellation/evidence without creating a parallel queue or worker ownership system.
3. **Workforce DAG PoC:** model a small, non-financial, domain-isolated workforce with two agent revisions and explicit dependency/approval nodes; test branch/join, retry, cancellation, and evidence lineage. Use a mock/fixture executor unless a separately approved sandbox permits a real runner.
4. **External orchestrator adapter PoC:** only after Agenta/Eigent/CAMEL and license audits, map one external planner output into an ACS validated task-graph proposal. ACS accepts or rejects it; external software never writes canonical workflow/workforce state directly.
5. **Normalized cost lineage PoC:** map provider/runner usage to internal usage dimensions and preserve quote/reservation/metering/receipt idempotency without settlement execution.

## 13. ADR proposals

1. **ADR-ACS-V2-01 — Canonical Agent Revision Supersedes External Agent Identity.** Preserve `AgentRevision`/fingerprint as ACS truth; all external identities are adapter metadata.
2. **ADR-ACS-V2-02 — Workforce Is an ACS-Owned Aggregate, Distinct from Runtime Worker.** Establish workforce revision, roster, coordinator, policy snapshots, task graph, and lifecycle.
3. **ADR-ACS-V2-03 — Workflow Core Supports Deterministic and Agentic Graph Amendments.** Deterministic graphs are versioned; dynamic plans require explicit validation, policy/budget checks, and evidence.
4. **ADR-ACS-V2-04 — Runtime Reuse Mandate.** Workforce/workflow tasks compile to existing durable runtime jobs/assignments/leases/fencing; no second executor queue.
5. **ADR-ACS-V2-05 — Provider/Model/Harness/Executor Contract Separation.** Retain provider/runner/engine/target distinctions and introduce explicit neutral harness semantics.
6. **ADR-ACS-V2-06 — ACS Institutional Evidence Ledger.** Provider traces are normalized input; ACS proposes an append/correction-oriented canonical lineage ledger for audit and reporting source data, with explicit incomplete/lost/unavailable source states.
7. **ADR-ACS-V2-07 — Domain-Isolated Context, Knowledge, Credentials and Budgets.** Default deny cross-product sharing; authorized shared capability requires scope and audit.
8. **ADR-ACS-V2-08 — Economic Layer Separation.** Usage, measured cost, allocation, pricing, denomination, and settlement remain distinct; no financial execution is implied.
9. **ADR-ACS-V2-09 — External Code Provenance/Licensing Gate.** No imported Agenta/Eigent/CAMEL/AgentsAI code before upstream revision/license/copyright/dependency assessment.

## 14. Dependency-ordered ACS implementation recommendation

The user’s proposed ordering should be adjusted to use existing runtime/evidence/governance foundations first rather than rebuilding them:

```text
0. Close or characterize ACS-BLOCKER-014; reconcile engine provenance/license
1. Freeze/extend canonical AgentRevision + resource/provenance contracts
2. Define Provider/Model/Harness/Executor mapping and ACS Execution Request envelope
3. Define canonical Evidence Lineage + Cost Allocation contracts at the same time
4. Define WorkforceRevision + WorkflowRevision + TaskGraph contracts
5. Compile deterministic workflows into existing durable runtime jobs/workers
6. Add dynamic planner/coordinator adapter boundary and constrained DAG amendments
7. Integrate first executor adapters (Codex, OpenClaw subject to blockers, Direct LLM)
8. Extend Product API/events/SDK for agent/workforce/workflow run/resume/approve/cancel/result/evidence/cost
9. Add reporting projections from canonical ledger
10. Add normalized cost accounting and, only after separate authorization, pricing/$Neurons settlement integrations
```

**Why evidence/cost is moved earlier:** introducing autonomous/multi-agent task decomposition without task-level identity, approval, context provenance, retry, and cost lineage would create unreconstructable operational behavior. Existing evidence and economic foundations make a contract-first extension feasible.

## 15. Concise answers to final decision questions — ACS system

| Question | ACS current-core answer |
|---|---|
| What must ACS preserve? | Agent revisions/fingerprints/composition, plan/deployment/runtime/run separation, provider/runner/engine/target/worker boundaries, durable lease/fencing/recovery, tenant governance/identity/secrets, Product API, evidence/audit/telemetry correlation, economics usage/receipt primitives, and bounded topology truthfulness. |
| What does ACS already implement? | Agent lifecycle and resources, execution planning, engine adapters/targets, deterministic workflows, durable runtime/worker operations, governance/isolation, broad Product API, evidence/read models, and economic authorization/usage/settlement-record foundation. |
| What is missing? | Workforce identity/revisions, task DAG and joins, dynamic planning/handoff semantics, canonical knowledge/memory/context/MCP policy, full execution lineage, and normalized task/provider cost allocation. |
| What remains OpenClaw’s responsibility? | Adapter-exposed persistent engine behavior and its own runtime/materialization mechanisms only; never ACS canonical identity, governance, workflow, evidence, or economic truth. Current reuse is blocked on provenance/license reconciliation. |
| What becomes Codex’s responsibility? | If adopted, an ACS executor/runner adapter for bounded engineering/repository tasks under ACS plan/governance/evidence contracts; no source adapter is confirmed today. |
| How are providers abstracted? | Keep separate contracts for Provider/Model, Credential, Harness, Runner/Executor, Engine, Target, Worker. The execution-plan resolver is the right ACS-owned selection point. |
| How do products consume ACS? | Through stable Product API/async job/event/evidence interfaces, not provider-native APIs. Extend existing routes rather than create a side platform. |
| How is execution reconstructed? | Existing correlation/audit/evidence is the base; the proposed V2 design extends it to an append/correction-oriented lineage graph across workforce/workflow/task/agent revision/context/knowledge/tools/provider/harness/executor/output/cost/approval, with explicit incomplete/lost/unavailable states. |
| How is consumption attributed? | Existing tenant-aware economic records are the base; add product/workforce/workflow/agent/task/provider-executor allocation dimensions before pricing or settlement. |
| Is ACS ready to implement? | **CONDITIONAL GO for future separately authorized contract-first work and isolated non-production PoCs; architecture planning is complete. NO-GO for production migration, external-code adoption, global/multi-host claims, financial settlement execution, or uncontrolled multi-agent runtime replacement.** |

## 16. Evidence index

| ID | Absolute evidence location | Lines | Used for |
|---|---|---:|---|
| E01 | `/opt/Axodus/ACS/AGENTS.md` | 1-43 | Repository source-of-truth, control-plane and EPIC rules. |
| E02 | `/opt/Axodus/ACS/docs/architecture/acs-v2/README.md` | 1-145 | V2 planning-only status, ownership principles, preserve list, non-goals. |
| E03 | `/opt/Axodus/ACS/src/control-plane/unified-agent-model.ts` | 3-305 | Agent model, revision/fingerprint, composition, execution lifecycle entities, secret guard. |
| E04 | `/opt/Axodus/ACS/src/engines/agent-engine.ts` | 1-154; `/opt/Axodus/ACS/src/intelligence/agent-runner.ts` 1-64; `/opt/Axodus/ACS/src/control-plane/execution-plan-resolver.ts` 16-125 | Engine/runner/target/provider execution contracts and plan resolution. |
| E05 | `/opt/Axodus/ACS/src/http/routes/product-api-routes.ts` | 82-1539 | Product API identity/control surface, agents/resources/deployments/runtime/evidence/economics routes. |
| E06 | `/opt/Axodus/ACS/src/orchestrator.ts` | 1-220; `/opt/Axodus/ACS/src/workflows/index.ts` 1-45; `/opt/Axodus/ACS/src/workflows/types.ts` 1-12 | Sequential deterministic orchestration and registered workflows. |
| E07 | `/opt/Axodus/ACS/src/workers/worker-types.ts` | 8-253; `/opt/Axodus/ACS/src/workers/durable-runtime-state.ts` 50-179, 230-287, 539-731, 1091-1260 | Worker/assignment/lease distinction and durable runtime substrate. |
| E08 | `/opt/Axodus/ACS/src/control-plane/operational-evidence-service.ts` | 20-715; `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts` 4-221; `/opt/Axodus/ACS/src/control-plane/durable-economic-state.ts` 180-376 | Evidence, audit, correlation, usage, economics, settlement state/adapters. |
| E09 | `/opt/Axodus/ACS/docs/epics/epic-15/AGENTS.md` | 3-65; `/opt/Axodus/ACS/src/redhat-mcp.ts` 30-151; supporting implementations in `/opt/Axodus/ACS/src/control-plane/governance-boundary.ts`, `isolation.ts`, and `secrets-boundary.ts` | Tenant/governance/isolation/secret boundary and contract-only MCP gate. |
| E10 | `/opt/Axodus/ACS/package.json` | 1-27; `/opt/Axodus/ACS/pnpm-lock.yaml` 1-26; sampled dependency licenses under `/opt/Axodus/ACS/node_modules/{pg,viem,typescript}` | Package identity, direct dependencies, sampled license facts. |
| E11 | `/opt/Axodus/ACS/engines/agentsai.manifest.json` | 1-28; `/opt/Axodus/ACS/engines/agentsai/pyproject.toml` 1-23; gitlink/submodule metadata | AgentsAI/OpenClaw source, protocol, provenance inconsistency, lack of inspected license file. |
| E12 | `/opt/Axodus/ACS/docs/epics/epic-15-5/epic-15-5-closure-report.md` | 1-96; `/opt/Axodus/ACS/docs/post-15-5/aees-mh/global-readiness-decision.md` 1-64; `/opt/Axodus/ACS/docs/epics/epic-16/epic-16-closure-report.md` 1-63 | Certified topology limits, global NO-GO, financial scope limits. |
| E13 | `/opt/Axodus/ACS/docs/architecture/acs-v2/current-state-audit.md` | 1-130 | Historical prior V2 audit and stale baseline-hash identification. |
| E14 | `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md` | 207-231 | ACS-BLOCKER-014 status, evidence and scoped-resolution rule. |
