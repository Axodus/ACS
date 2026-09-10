# ACS-V2-REQ-02 — Sub-Agent A: Agenta Core Extraction Audit

**System audited:** `/home/mzfshark/agenta`
**Audit date:** 2026-09-10
**Scope:** read-only architecture discovery for an ACS-native Agent Core. No repository, credential, runtime-state, production configuration, external service, or financial-system modification was performed.
**Repository state:** `main...origin/main`, commit `204703fc24ff52993be317c7a83e2bd755051d35`, described as `v0.115.2-93-g204703fc24-dirty`; HEAD is the 2026-09-09 merge of release `v0.115.3`. Five pre-existing local modifications affect model-connection endpoint validation and sandbox-run planning. They were not authored, staged, or changed by this audit.

## Executive decision

Agenta contains a useful **agent authoring and execution-contract toolkit**, not a ready-to-transplant ACS Agent Core.

The recommended source strategy is:

**ADOPT decisions: none.** No inspected Agenta component is modular and ACS-aligned enough to become an unadapted ACS core dependency.

| Proposed ACS core | Agenta strategy | Decision |
|---|---|---|
| Agent definition, revision, and lifecycle semantics | Reuse the concept and selected MIT OSS contracts | **ADAPT** |
| Agent identity | Preserve existing ACS canonical identity; independently extend ACS with external design equivalents only where a gap remains | **REIMPLEMENT** |
| Provider/model/credential reference boundary | Use as a design and adapter reference; do not carry Agenta vault semantics into ACS | **ADAPT** |
| Harness capability and configuration boundary | Reuse the separation and capability-negotiation pattern | **ADAPT** |
| Tools, skills, MCP normalization | Reuse selected schemas/normalizers only after ACS ownership and policy changes | **ADAPT** |
| Runtime runner/sidecar | Build ACS Runtime/Executor contracts and adapters; do not import the runner as ACS core | **REIMPLEMENT** |
| Sessions, turn control, human interaction | Reuse event and state-machine concepts, with ACS run/task/workforce identities | **REIMPLEMENT** |
| Tracing and evaluation primitives | Map OpenTelemetry-compatible evidence into an ACS ledger; reuse no external source of truth | **ADAPT** |
| Persistence implementation | ACS-owned schema and migrations; use revision and event ideas only | **REIMPLEMENT** |
| SaaS UI/workspace/billing/marketing/hosting integrations | Outside ACS core | **REJECT** |

The principal conclusion is that ACS should adopt an **Agenta-inspired contract boundary**, not an Agenta dependency graph:

```text
ACS Agent Definition (ACS-owned, versioned)
  -> capability/resource resolution (ACS policy + secrets boundary)
  -> ACS Execution Request (provider-neutral)
  -> Runtime Router
       -> Executor adapter: Codex | OpenClaw | Direct Model | future
  -> ACS Evidence Ledger + Cost Ledger
```

Agenta’s `AgentTemplate` is a strong source for the middle authoring/configuration layer. It is not sufficient as the canonical ACS Agent entity because it has no durable first-class `Agent` record, collapses agent identity into a workflow/application artifact family, and mixes agent definition with harness/sandbox selections that ACS must route independently.

## 1. Scope, method, and evidence standard

### Method

1. Read repository-level instructions and the relevant nested API and runner instructions before inspection.
2. Recorded repository identity, local working-tree condition, remote, release description, license texts, and manifests.
3. Started with `rg --files` and `rg` topology/symbol searches, then inspected implementation and tests with numbered source output.
4. Traced the implemented execution path from workflow/application invocation through `agent_v0`, config resolution, runner `/run`, harness/sandbox lifecycle, session persistence, records/interaction events, and trace ingestion.
5. Distinguished **confirmed implementation** from **tests/contracts**, **documentation/comments**, and **inference**.
6. Did not run services, migrations, dependency installation, test suites, or any remote/network command. This means the audit establishes code-level architecture, not runtime deployment health.

### Source-status conventions

| Label | Meaning |
|---|---|
| **Implemented** | Present in production source path inspected. |
| **Contract/test backed** | Typed contract and/or tests found; not independently executed in this audit. |
| **Docs/comments only** | Intent stated in comments/design material but not proven end-to-end. |
| **Inference** | Architectural conclusion derived from the above; explicitly labelled. |

### Read-only compliance

The discovery report was written outside Agenta and then reconciled into this ACS documentation package. The audited Agenta repository and its pre-existing dirty files were not modified.

## 2. Repository identity, composition, and licensing

### 2.1 Identity and local state

| Item | Finding | Evidence |
|---|---|---|
| Upstream | `origin` points to `https://github.com/Agenta-AI/agenta.git`. | E01 |
| Commit inspected | `204703fc24ff52993be317c7a83e2bd755051d35`. | E01 |
| HEAD subject | Merge pull request #6616 from `release/v0.115.3`, authored 2026-09-09T11:47:20+02:00. | E01 |
| Version declaration | API project declares `0.115.3`. | E04 |
| Working tree | Five modified files, including `sdk/agents/connections/*` and runner `run-plan.ts`. | E02, E31 |
| Important audit limit | Local modifications relax HTTP endpoint restrictions only when an explicit insecure-egress environment flag is present; these are not part of the committed SHA. | E31 |

### 2.2 System topology

The repository is a monorepo. Relevant implemented areas are:

```text
/home/mzfshark/agenta
├── api/
│   ├── oss/src/                 FastAPI OSS domains, core services, Postgres/Redis adapters
│   ├── ee/                      enterprise extensions: workspace/org/billing/entitlements
│   └── entrypoints/             dependency wiring and route mounting
├── sdks/python/agenta/sdk/
│   ├── agents/                  neutral agent contracts, adapters, resolvers, wire serializer
│   ├── models/                  revisioned workflow/application models
│   ├── engines/                 tracing/evaluation primitives
│   └── evaluations/             evaluation runtime contracts
├── services/runner/             Node sidecar: JSON /run in, structured result out
│   └── src/engines/sandbox_agent/  sandbox-agent/ACP/Pi/Claude/Codex-facing implementation
├── services/oss/src/agent/      Python service support for runner URL/config/secrets
├── web/                         product UI, not inspected as reusable ACS core
├── website/                     marketing site, not ACS core
└── hosting/                     Docker/compose/hosting infrastructure
```

This is confirmed by repository and nested guidance, rather than inferred from names. The API instruction explicitly describes `api/oss` as the baseline, `api/ee` as additive extension, and `api/entrypoints` as composition root; runner guidance defines it as a Node agent-runner sidecar with one `/run` contract. [E03, E05]

### 2.3 License and reuse boundary

| Area | License finding | ACS implication |
|---|---|---|
| Repository content outside `ee/` | MIT Expat, copyright 2023–2025 Agentatech UG / Agenta. | Source copying/modification/distribution is permitted if the required copyright and permission notice are retained. Verify exact paths remain outside `ee/` before any extraction. |
| Any `ee/` path | Agenta Enterprise License. Production use requires an enterprise agreement; modifications/patches are restricted; development/testing exception does not grant redistribution/production rights. | **Do not copy, merge, or derive ACS core from `ee/`** without legal approval and an appropriate license. |
| Third-party dependencies | Repository license says third-party components retain their original licenses. API manifests and runner lockfiles name dependencies but do not provide a completed license inventory in the inspected files. | A code-reuse PoC must produce an SBOM/license report for copied modules and transitive runtime dependencies before distribution. |
| Runner harnesses | Runner manifest comments say Codex is Apache-2.0 and baked/pinned; Claude Code is proprietary and installed at runtime. | ACS must treat harness binaries as independently licensed optional executors, never bundled through an assumed Agenta license. |

**Confirmed license conclusion:** copying selected OSS source is potentially feasible under MIT, subject to notice retention and a dependency-level license review. Copying enterprise code is out of scope and presumptively unsuitable. Reimplementing ideas or data-model patterns generally avoids source-code licensing obligations, but legal review remains required for any nontrivial code similarity or shipped dependency.

### 2.4 Dependency surface relevant to core decisions

The API manifest confirms FastAPI/Pydantic/SQLAlchemy/Postgres/Redis/Taskiq/OpenAI/OpenTelemetry protobuf support, plus SaaS/operational dependencies such as SuperTokens, SendGrid, Stripe, PostHog, and New Relic. The runner uses ACP, sandbox-agent, Daytona, Pi, Anthropic SDK, OpenTelemetry JS libraries, and `undici`. [E04, E06]

**Inference:** copying Agenta’s runner wholesale would import a substantial and executor-specific supply chain. ACS should define narrower executor ports and let individual adapters own their dependency sets.

## 3. Architecture map: confirmed implementation

### 3.1 What Agenta calls an “agent”

Agenta currently has two overlapping concepts:

1. A long-standing **workflow/application artifact family**. `Workflow` and `Application` are revisioned artifacts; workflow flags include `is_agent` and `is_skill`, rather than defining a separate durable agent aggregate. [E07, E08]
2. A newer **agent runtime template**. `AgentTemplate` captures instructions, model/model reference, tools, MCP servers, skills, harness permissions/extras, sandbox policy/credentials, harness selection, sandbox selection, and a default permission posture. [E09]

The runtime comments state that `AgentTemplate` describes “what an agent is and how it runs,” but the `RunContext` maps identity to a workflow artifact, variant, and revision. The handler resolves “agent artifact id” from `workflow`, `application`, or `evaluator` references because all three are workflow-backed. [E09, E10]

**Confirmed implication:** Agenta’s current primary identity is an artifact lineage, not a first-class agent identity. ACS must not adopt the naming collision where application/workflow/evaluator can all represent the same agent-run target.

### 3.2 Layered architecture

```text
Authoring / API request
  parameters.agent or prompt-derived shape
        |
        v
SDK AgentTemplate (neutral, flattened authoring contract)
  instructions, model ref, tools, MCP, skills,
  harness permissions, sandbox policy/credentials
        |
        | AgentComposition resolves policy-owned resources
        | - tools -> resolved specs / callback
        | - MCP declarations -> resolved MCP servers
        | - model ref -> resolved provider connection / typed credentials
        | - session context + tracing context
        v
Harness-specific template
  Pi | Claude | Codex adapter conversion
        |
        v
SessionConfig + Python wire serializer
  session, project, trace, turn/control ids, tool/MCP/credential policy
        |
        | HTTP /run or local backend
        v
Node runner (`services/runner`)
  one sandbox_agent engine; acquire environment -> run turn -> teardown/park
        |
        +--> sandbox provider (local / Daytona configured path)
        +--> harness (Pi, Claude Code, Codex ACP support)
        +--> internal tool/MCP relay and permission gates
        +--> OTLP / file spool trace exports
        v
API persistence and streaming
  Postgres session/execution/turn/record/interaction rows
  Redis session watch/control and Taskiq queues
  OTLP tracing rows and query APIs
```

This path is a code-backed synthesis, grounded in SDK comments and types, runner instructions and wire contract, handler composition, session DTOs, entrypoint wiring, and tracing services. [E05, E09, E11, E12, E13, E14]

### 3.3 API and composition boundary

The API follows router → service → DAO interface → DAO → database direction in stated conventions. It exposes domains for workflows/applications, traces, invocations, evaluations, secrets, tools, triggers, sessions, interactions, mounts, webhooks, and OTLP. Route registration is composed in `api/entrypoints/routers.py`. [E03, E15]

This is useful as an implementation pattern but its public route vocabulary is Agenta product vocabulary. ACS should not make external products depend on `/simple/applications`, `workflow`, or an Agenta-specific session API.

## 4. Runtime and data-flow trace

### 4.1 Authoring definition to execution request

1. A workflow/application request contains the authoring object at `parameters.agent`; `AgentTemplate.from_params` parses the definition and selector subsections. Legacy flat shapes are rejected to avoid silently applying defaults. **Implemented.** [E09]
2. `AgentTemplate` holds abstract tool declarations, MCP declarations, skill templates, a model or structured `ModelRef`, and selector configuration. **Implemented.** [E09]
3. `agent_v0` has injectable `AgentComposition` functions for tools, MCP, model connection, sandbox credentials, session context, backend selection, tracing, and usage capture. The default composition uses platform resolvers, capability checks, and a sandbox-agent backend. **Implemented.** [E10]
4. Model-connection resolution is fail-closed in the handler: it checks harness/provider/mode before resolving, then checks the resolved provider/deployment pair after resolution. **Implemented.** [E10]
5. The SDK builds harness-specific configuration. Common wire seams deliberately separate model connection, MCP, skills, sandbox permission, credentials, harness files, and platform instructions. **Implemented.** [E09]
6. The runner request is mirrored between TypeScript `protocol.ts` and Python `wire.py`, with golden fixtures asserted on both sides. **Contract/test backed.** [E05, E11, E30]

### 4.2 Runner execution lifecycle

Runner guidance describes one external contract: JSON `/run` request in and structured result out. `runSandboxAgent` acquires a session-scoped environment, runs a turn, and tears down or parks it. The runtime spans environment acquisition, provider selection, sandbox mounts/workspace/model, MCP/tool delivery, transcript/usage, pause/HITL, session continuity, reconnect, and teardown. **Implemented as a runner design and source tree; live operation was not executed.** [E05, E06]

The runner’s implementation is explicitly a single `sandbox_agent` engine, despite support code for multiple harnesses. Its immediate environments and lifecycle logic are tightly coupled to sandbox-agent/ACP, optional Daytona, Pi, and coding harness configuration. The protocol header says Pi or Claude, while current SDK `HarnessKind` and manifest also include Codex; this is a documentation/header staleness signal, not proof that Codex is absent. [E11, E12, E06]

### 4.3 Session, HITL, and completion

`SessionConfig` carries the resolved agent resources plus `session_id`, detached flag, `turn_id`, `project_id`, control command ID, effective parameters, gateway policy, MCP servers, and resolved sandbox credentials. [E09]

The API describes sessions as runner coordination plus durable state, records, and streams; interactions are human-in-the-loop approvals, inputs, and tool confirmations. Detached workflows invoke the workflow service, and interaction/trigger work is placed on Redis Streams through Taskiq-oriented worker infrastructure. **Implemented.** [E15, E16]

Durable session events include started/stopped/failed/lost execution, completed messages/tools, and requested/responded interactions. Every envelope has session and execution IDs, a sequence/watermark, timestamp, and event-specific payload. **Implemented contract.** [E14]

### 4.4 Evidence and tracing path

`AgentResult` reports output, messages, events, usage, stop reason, capabilities, session id, model, and trace id. Usage is a generic dictionary rather than a stable normalized cost schema. [E09]

Agenta has an OpenTelemetry-oriented tracing data model and API core. Trace querying supports trace/span focus and native/OTel formatting; analytics exposes aggregate count, duration, costs, and tokens. Span ingestion takes organization, project, user, and OTel spans/traces. **Implemented.** [E17]

**Critical ACS conclusion:** this is observability/evaluation infrastructure, not a sufficient canonical evidence ledger. It does not establish ACS-level parent/child relationships among workforce, workflow, task, agent version, executor, economic attribution, policy decision, and settlement obligation in one normalized record.

## 5. Canonical concepts extracted from Agenta

### 5.1 Revisioned artifact lineage

Agenta’s generic Git-like model is:

```text
Artifact
  └── Variant (belongs to artifact)
       └── Revision (version, lifecycle, commit metadata, data)
```

`Revision` carries artifact/variant references, version, lifecycle/header/metadata/commit, and data. `Workflow` specializes an artifact and has workflow variants/revisions; an artifact can be forked through variant/revision fork requests. [E07]

**Reusable primitive:** artifact/variant/revision/commit/fork DTO vocabulary and lineage semantics. The inspected DTOs and API contracts do not by themselves prove storage-level immutability or append-only write guarantees.

**ACS adaptation:**

```text
Existing ACS Agent / AgentRevision (canonical identity and revision controls)
  └── additive ACS-native fields or projections informed by Agenta vocabulary
       └── AgentRelease / activation mapping (optional)
```

Do not make `Workflow`, `Application`, `Evaluator`, and `Agent` aliases of the same identifier. ACS should preserve its existing Agent/AgentRevision authority and use references deliberately: a workflow task selects an `agent_revision_id`; an agent can be reused by many workflows and workforces.

### 5.2 Neutral AgentTemplate

`AgentTemplate` is the most direct reusable design. It includes:

| Agenta field | ACS canonical mapping | Extraction decision |
|---|---|---|
| `instructions` | `definition.instructions` | **ADAPT** |
| `model`, `model_ref` | runtime `model_selector`, `provider_ref` | **ADAPT** |
| `tools` | `resources.tool_refs` | **ADAPT** |
| `mcp_servers` | `resources.mcp_server_refs` | **ADAPT** |
| `skills` | `resources.skill_refs` | **ADAPT** |
| `harness`, `harness_permissions`, `harness_extras` | runtime executor/harness binding plus policy adapter configuration | **ADAPT** |
| `sandbox`, `sandbox_permission`, `sandbox_credentials` | executor placement/sandbox policy and credential-binding request | **ADAPT**, but move authorization to governance |
| `permission_default` | `governance.tool_policy.default_effect` | **ADAPT** |

The current model is deliberately flattened for adapter consumption and parses nested source JSON into that flattened form. This is good for an execution compilation step, but ACS should persist the authored canonical model separately from an execution-resolved plan. [E09]

### 5.3 Provider/model/connection separation

Agenta distinguishes an author-selected `ModelRef` from a `ResolvedConnection`. The resolved object supplies the route and typed credential bindings; the wire code keeps a consumer-owned `modelConnection` distinct from the author’s selected `connection` reference. [E09]

This distinction is directly applicable to ACS:

```text
ProviderProfile       -- stable provider family and endpoint capability metadata
ModelCatalogEntry     -- provider model identifier and capability/cost metadata
ConnectionReference   -- product/domain-owned credential reference, never secret value
ResolvedExecutionRoute -- ephemeral provider/model/endpoint/credential binding
```

**Do not adopt:** Agenta’s `agenta` connection mode, project-default semantics, or vault endpoint/resource vocabulary. They encode its tenancy/product model.

### 5.4 Harness versus backend/environment

Agenta’s `Backend` port owns supported harnesses, sandbox/session lifecycle, and already-harness-shaped configuration. `Sandbox`, `Session`, and `Environment` are separate lifecycle abstractions. The harness sits above the backend and converts neutral config into harness-specific config. [E12]

This separation maps well to ACS but names need tightening:

| Agenta term | Proposed ACS term | Reason |
|---|---|---|
| Harness | **Harness** | The program/protocol that drives an agent loop, such as Codex ACP. |
| Backend | **Executor adapter** | The adapter that fulfills an ACS execution request. |
| Sandbox/provider | **Execution environment provider** | Placement/isolation service, separate from the model provider. |
| Session | **Execution session** | Continuity container, optional for a one-shot run. |

**Important:** Agenta documentation says a session needs everything except “where it runs,” and its runtime selection lives in `agent.sandbox`. ACS should make executor and placement independently routable; a canonical Agent should declare supported/allowed requirements, while a runtime router selects an actual executor and environment subject to policy.

### 5.5 Skills, tools, and MCP

Agenta treats skills as a separate resource seam from tools. It resolves/embeds skills into concrete inline packages before runner wire delivery; tool specifications are resolved server-side and a runner can deliver them natively or through an internal MCP bridge. MCP server declarations and resolved MCP server objects are distinct. [E09, E18, E30]

This is a strong resource-compilation pattern:

```text
AgentRevision resource references
  -> Governance + domain isolation + secret resolution
  -> ResolvedExecutionPlan
       -> Skill packages/materialization
       -> Tool specs + allowed operations
       -> MCP server transport/config + redacted credentials
```

ACS must preserve explicit provenance for each resolved resource version and decision. Agenta’s wire contract can carry resources but is not a complete ACS evidence model.

### 5.6 Permissions and approval

Agenta has three relevant layers:

1. API RBAC is an OSS always-on access vocabulary/enforcement model scoped through projects; enterprise may overlay custom roles. [E03]
2. Agent template permission defaults/rules (`allow`, `ask`, `deny`, `allow_reads`) are translated into harness/gateway controls. [E09]
3. Sessions/interactions persist human approvals and tool confirmations. [E14, E15]

**ACS conclusion:** retain these as three separate policy planes:

```text
Platform authorization: who may create/run/observe/manage an ACS resource?
Execution authority: what categories of actions may this agent revision request?
Per-execution approval: has an authorized human or policy engine approved this operation now?
```

Do not reuse Agenta’s RBAC role catalog or API-specific scopes as ACS governance truth. Adopt the layered approach and normalized approval/event semantics.

## 6. Mapping to the proposed canonical ACS Agent model

| Canonical ACS area | Agenta coverage | Classification | Recommendation and evidence |
|---|---|---|---|
| `identity.id`, `name`, `domain`, `ownership` | Partial: header/slug/lifecycle and workflow artifact id; names can resolve through workflow/application/evaluator artifact-family references. No canonical domain/ownership agent aggregate. | **REIMPLEMENT** | Preserve existing ACS `Agent`/`AgentRevision` identity and independently extend it with missing ownership/domain semantics; borrow only generic identifier/header/slug conventions if useful. [E07, E10] |
| `definition.role`, `instructions`, `capabilities`, `constraints` | Instructions are present; harness capabilities are probed; constraints are scattered across permissions/sandbox/harness settings. No canonical role/capability profile. | **ADAPT** | Separate authored definition from runtime capabilities and governance constraints. [E09, E12] |
| `knowledge_scope`, `context_policy`, `memory_policy` | Session context is rendered prompt input; run context supports hidden server-side tool bindings. No durable agent knowledge/memory policy aggregate found. | **REIMPLEMENT** | Independently add ACS-owned knowledge/memory references with domain isolation and retention policies; do not replace existing ACS governance or repositories. [E19] |
| `skills`, `tools`, `MCP` | First-class list fields, typed resolution, independent wire seams and tests. | **ADAPT** | Retain resource separation; replace product-specific resolvers/gateway policy with ACS resource registry and authorization. [E09, E18, E30] |
| `provider`, `model`, `harness`, `executor` | Strong provider model-reference/resolution and harness abstractions; backend/sandbox selected separately. | **ADAPT** | Use four independent ACS contracts: provider, model, harness, executor. Do not store resolved credentials in AgentRevision. [E09, E10, E12] |
| `authority`, `permissions`, `policy`, `approval_requirements` | Tool permission posture and HITL interactions exist; platform RBAC is project/workspace-oriented. | **ADAPT** | Preserve three-plane policy model; reimplement ACS governance vocabulary and policy evaluator. [E03, E09, E14] |
| `cost_policy`, `budget`, `settlement_policy` | Usage is generic; tracing analytics carries costs/tokens. No agent budget or settlement primitive found in the inspected OSS agent runtime. | **REIMPLEMENT** | Independently extend ACS normalized usage/cost/pricing/settlement contracts over existing ACS economics; do not adapt Stripe/metering/EE billing as core. [E09, E17, E04] |
| `audit_policy` | Trace, records, session durable events, redaction, and tool events exist. | **ADAPT** | Build an ACS evidence-policy model and ledger, using OTel interoperability only as an ingress/egress format. [E14, E17] |
| `version`, `status`, timestamps | Generic artifact/variant/revision lifecycle and commit data exist. | **ADAPT** | Use the DTO vocabulary as input to ACS target design; retain existing ACS revision/fingerprint controls as authoritative and do not infer Agenta storage immutability. Do not bind it to application/workflow aliases. [E07] |

### Proposed canonical ACS Agent schema

This is a design recommendation, not implementation:

```yaml
Agent:
  id: uuid                     # stable ACS agent identity
  slug: string
  name: string
  domain_id: uuid
  owner_ref: PrincipalRef
  lifecycle_status: draft | active | suspended | archived
  current_revision_id: uuid | null
  created_at: timestamp
  updated_at: timestamp

AgentRevision:
  id: uuid
  agent_id: uuid
  revision_number: integer
  parent_revision_id: uuid | null
  content_hash: string
  definition:
    role: string
    instructions: string
    capability_requirements: [CapabilityRequirement]
    constraints: [Constraint]
  knowledge_policy_ref: uuid | null
  context_policy_ref: uuid | null
  memory_policy_ref: uuid | null
  resource_bindings:
    skills: [VersionedResourceRef]
    tools: [VersionedResourceRef]
    mcp_servers: [VersionedResourceRef]
  runtime_policy:
    provider_selector: ProviderSelector
    model_selector: ModelSelector
    allowed_harnesses: [HarnessRef]
    executor_selector: ExecutorSelector
    environment_policy_ref: uuid | null
  governance_policy_ref: uuid
  economics_policy_ref: uuid | null
  evidence_policy_ref: uuid
  commit:
    message: string
    author_ref: PrincipalRef
    committed_at: timestamp
```

Agenta can accelerate compilation from authored resources to a resolved execution configuration. It should not own ACS identity, governance, economics, knowledge, or evidence schemas.

## 7. Capability matrix and reuse decisions

| Capability | Agenta confirmed state | ACS decision | Rationale |
|---|---|---|---|
| Agent identity | Workflow/application/evaluator-backed references; no standalone agent aggregate. | **REIMPLEMENT** | Preserve existing ACS Agent/AgentRevision identity and independently extend it where needed for non-ambiguous cross-product/workforce reuse. |
| Agent definition | `AgentTemplate` with instructions/resources/runtime selectors. | **ADAPT** | Strong schema pattern; split definition from placement and policy binding. |
| Agent versioning | Generic artifact → variant → revision/commit/fork DTO model. | **ADAPT** | Valuable lineage vocabulary and target design; do not infer storage-level immutability. Retain existing ACS revision/fingerprint controls and add only needed ACS-native release semantics. |
| Lifecycle | Generic lifecycle/archive patterns. | **ADAPT** | Preserve status/timestamp concepts but define ACS state machine. |
| Harness abstraction | `HarnessKind`, `HarnessCapabilities`, harness-specific configs. | **ADAPT** | Excellent executor-facing boundary; broaden beyond coding harnesses. |
| Runtime abstraction | Backend/environment/session ports plus sidecar execution. | **REIMPLEMENT** | Independently extend ACS Runtime/Executor contracts where needed; Agenta contracts inform design, while implementation remains tightly coupled to sandbox-agent/ACP. |
| Provider/model abstraction | `ModelRef` → `ResolvedConnection`, typed bindings, capability gates. | **ADAPT** | Keep author ref vs resolved route; replace vault tenancy vocabulary. |
| Skills | First-class templates/materialized packages separate from tools. | **ADAPT** | Preserve first-class versioned resource category and resolver pattern. |
| Tools | Provider-neutral configs resolved to specs/callback plus gateway policy. | **ADAPT** | Retain compiler/gate architecture; place governance/evidence in ACS. |
| MCP | Declarative and resolved server models; runner MCP conversion/validation. | **ADAPT** | Reuse protocol model concepts, keep ACS-controlled policy and credential binding. |
| Execution runner | Node `sandbox_agent` lifecycle, Pi/Claude/Codex code-facing integration. | **REIMPLEMENT** | Too coupled to a sandbox-agent stack and non-neutral operational assumptions. |
| Sessions/runs | Session config, execution/records/streams and durable event envelope. | **REIMPLEMENT** | Independently extend ACS run/evidence contracts for workforce/workflow/task hierarchy; preserve existing ACS governance and durable repositories. |
| Tracing | OTel ingestion/querying and runner exports. | **ADAPT** | Use OTel as compatibility layer; ACS ledger remains authoritative. |
| Evaluations | SDK-owned planner/executor contracts plus Taskiq adapter. | **ADAPT** | Reuse pattern for deterministic evaluation planning, not as workforce orchestration. |
| Persistence | SQLAlchemy/Postgres DAOs and Redis sessions/tasks. | **REIMPLEMENT** | Use ACS-owned authoritative repositories and independently add only required domain schema/cross-core references; do not replace existing ACS persistence/governance. |
| API boundary | FastAPI resource routes and project-scoped APIs. | **REJECT** as public ACS interface | Product-specific vocabulary and compatibility layers would leak Agenta concepts. |
| Events | Session durable events, Redis streams, webhooks. | **ADAPT** | Use event-envelope sequencing/idempotency ideas; define ACS event taxonomy. |
| Artifacts | Object-store mounts/attachments and workflow revision artifacts. | **ADAPT** | Use stable artifact references/content hashes/provenance in ACS. |
| Usage/cost | Generic `usage` result and trace analytics cost/token aggregates. | **REIMPLEMENT** | No normalized cost line items, price provenance, budgets, or settlement. |
| Permissions | RBAC + runner tool permissions + HITL interactions. | **ADAPT** | Preserve layers, replace scopes/policy vocabulary. |
| SaaS workspace/org/billing | OSS/EE platform concerns, SuperTokens/Stripe/etc. | **REJECT** | ACS must retain Axodus governance/product boundaries, not inherit Agenta SaaS tenancy. |
| UI/playground/website | Product/marketing interface. | **REJECT** | No core extraction value for ACS Agent Core. |
| Scheduling/triggers | Triggers and worker queues exist but are platform-specific. | **REJECT** as Agent Core; **ADAPT** only later for Integration Core | Avoid duplicating ACS/other orchestrators. |

## 8. Reusable implementation candidates and rejected components

### 8.1 Candidate primitives for controlled MIT-source evaluation

These are vocabulary/design candidates for a later, separately authorized, isolated legal/technical evaluation. This report authorizes neither source copying nor an inference that any implementation may be imported. Any future PoC requires a clean pinned upstream revision, exact-file notice/SBOM review, and separate implementation authorization.

| Candidate | Source region | Classification | Why it is useful | Required ACS changes |
|---|---|---|---|---|
| Artifact/variant/revision DTO semantics | `sdks/python/agenta/sdk/models/git.py` | **ADAPT** | Explicit artifact/variant/revision/commit/fork vocabulary and lifecycle metadata; storage-level immutability was not proven by the inspected DTOs. | Map vocabulary into additive ACS AgentRevision projections; retain ACS fingerprint/revision controls, remove Agenta-specific aliases, and define any new hash/activation invariant in ACS. |
| AgentTemplate and conversion discipline | `sdks/python/agenta/sdk/agents/dtos.py` | **ADAPT** | Clear separation between authoring template, harness config, and session bundle. | Split canonical stored definition from transient resolved execution plan; remove sandbox as agent identity. |
| Provider resolution separation | `sdk/agents/connections/*` | **ADAPT** | Clean selected reference versus resolved credential route boundary. | Replace project/default/vault semantics; enforce ACS domain and secret isolation. |
| Skills/tool/MCP typed normalization | `sdk/agents/{skills,tools,mcp}/*` | **ADAPT** | Keeps three resource kinds separate and compiles them before execution. | Add version/provenance/evidence/governance fields. |
| Capability negotiation | `HarnessCapabilities` and adapters | **ADAPT** | Prevents routing unsupported resource/harness combinations. | Generalize from coding agent features to executor capabilities. |
| Durable event envelope ideas | `core/sessions/records/dtos.py` | **ADAPT** | Sequenced events, execution/session association, watermarks, typed terminal events. | Add ACS run/workforce/workflow/task/agent revision/cost dimensions. |
| OTel interoperability | tracing SDK/API/runner | **ADAPT** | Interoperable spans and metrics. | Make ledger canonical and OTel a projection/ingest format. |

### 8.2 Components ACS should explicitly not inherit

| Component | Why reject |
|---|---|
| `api/ee/**` | Enterprise license and Agenta-specific organization/subscription/metering model. |
| Web/playground/marketing application | Product UI and SaaS UX, not ACS runtime primitives. |
| SuperTokens, Stripe, SendGrid, PostHog, New Relic defaults | External service and SaaS assumptions are not ACS core and introduce unrelated credential/operational dependencies. |
| Workflow/application/evaluator identity aliasing | Ambiguous identity conflicts with canonical ACS Agent, Workflow, Workforce, and Task objects. |
| `sandbox-agent` runner as a universal runtime | Specific ACP/sandbox deployment and coding-harness stack; cannot serve direct model/OpenClaw/general executor requirements cleanly. |
| Agenta-specific project/workspace/org APIs | Axodus product/domain isolation requires ACS-owned boundaries. |
| Agenta triggers/scheduling as Agent Core | It would duplicate ACS workflow/workforce orchestration and integration responsibilities. |
| Generic `usage: dict` and trace aggregate costs as economic source of truth | Insufficient cost-line provenance and no settlement boundary. |

## 9. Persistence, interfaces, events, and evidence

### 9.1 Persistence model observed

| Data family | Store/implementation | Confirmed role | ACS assessment |
|---|---|---|---|
| Revisioned definitions | Postgres generic Git DBAs/DAOs + workflow DBEs | stores artifact/variant/revision lineage | Pattern valuable, schema must be ACS-owned. |
| Session control/continuity | Postgres session executions, turns, records, interactions, streams; Redis locks/watch/control | supports turn lifecycle, streaming, resume/continuity | Do not use as canonical ACS run schema unchanged. |
| Traces | Postgres tracing entities/DAO plus OTel ingestion | spans/traces, queries, analytics | Project into ACS evidence ledger or consume from it. |
| Async queues | Redis Streams / Taskiq | triggers, interactions, evaluations | Useful infrastructure option, not an agent-core decision. |
| Working files/attachments | mounts/object storage and attachment services | durable working directory and upload management | Treat as executor artifacts under ACS provenance. |

### 9.2 Recommended ACS evidence ledger

Agenta gives useful event ingredients but ACS needs one cross-core schema:

```text
ExecutionRun
  id, request_id, idempotency_key, status, timestamps
  product/domain/tenant scope
  requested_target: Agent | Workforce | Workflow
  resolved target versions
  parent_run_id / root_run_id

ExecutionNode
  run_id, node_id, parent_node_id
  kind: workflow | workforce | task | agent_turn | tool_call | approval | executor
  status, attempt, retry_of, checkpoint_ref

ExecutionEvent
  sequence, occurred_at, event_type, producer
  run_id, node_id, task_id?, workforce_id?, workflow_id?
  agent_id?, agent_revision_id?
  provider/model/harness/executor/environment refs
  policy_decision_refs, approval_refs
  input/output/context/knowledge/artifact refs with content hashes/redaction state
  usage_line_refs and cost_line_refs
  trace_id/span_id
```

**Required invariant:** evidence writes must be append-oriented and reconstruct the execution graph even when an executor stream is lost. Agenta’s `execution.lost` explicitly indicates incomplete history; ACS must preserve that condition rather than fabricating completeness. [E14]

### 9.3 Cost-center design gap

Agenta exposes `usage` as `Dict[str, Any]` in `AgentResult` and aggregate `costs`/`tokens` in trace analytics. This supports UI/evaluation reporting but does not create an immutable normalized cost line with source pricing, currency, resource unit, attribution hierarchy, retry/waste marker, or settlement state. [E09, E17]

ACS must implement:

```text
UsageMeasurement
  source_event_id, metric, quantity, unit, observed_at, confidence

CostLine
  usage_measurement_id, pricing_catalog_version, amount, currency,
  provider/executor/tool/infrastructure source, estimated_or_actual

CostAllocation
  cost_line_id -> Axodus/Product/Domain/Workforce/Workflow/Agent/Task

EconomicObligation
  allocation_id, price policy version, Neurons denomination, settlement status
```

This is **REIMPLEMENT** as an independent extension of existing ACS economic contracts, with Agenta’s usage event only as a possible adapter input.

## 10. Security, permissions, and trust boundaries

### 10.1 Confirmed boundaries

| Boundary | Agenta mechanism | Assessment for ACS |
|---|---|---|
| API identity/access | OSS RBAC, project scope, optional EE overlays. | Retain distinct control-plane authorization; do not reuse role catalog as-is. |
| Provider credentials | Resolver returns typed credential bindings; handler fails closed on resolution/capability mismatch. | Strong pattern: resolve late and only into executor-scoped plan. |
| Sandbox credentials | Resolved credentials are hidden from representation and carried to wire for environment binding. | Retain opaque secret refs and executor-injection boundary. |
| Tool authorization | Default and per-tool rules with allow/ask/deny; gateway/harness adaptation. | Adapt into centralized ACS policy decision point. |
| Human approvals | Session interactions and durable interaction events. | Adapt event semantics; approval must attach to an ACS policy/action reference. |
| Output/trace secret handling | Runner includes redaction mechanisms across errors/records/spans/logs. | A valuable required capability, but needs separate security review before extraction. |
| Network/filesystem sandbox policy | `SandboxPermission` declares egress and filesystem policy, but comments state filesystem enforcement is not implemented and network enforcement is a later slice. | **Do not treat declared settings as control evidence.** ACS must record enforced capability and provider attestation. |

The last item is an important implementation readiness constraint: authoring a policy field is not equivalent to actual sandbox enforcement. The SDK itself labels filesystem policy “declared, NOT enforced” and says sandbox permission plumbing is not enforcement. [E09]

### 10.2 ACS trust-boundary recommendations

1. Never persist raw provider/MCP/tool credentials in AgentRevision, workflow, workforce, evidence payloads, or logs.
2. Resolve secret references after authority checks, scoped to product/domain/execution, and emit only redacted connection/evidence references.
3. Treat executor selection as a governance-sensitive operation. A direct LLM execution, Codex worktree, and OpenClaw persistent process have different authority and containment semantics.
4. Make per-action approval a binding over a canonical action fingerprint, policy version, actor, target resource version, and expiry. A generic “session approval” alone is insufficient.
5. Record actual enforcement outcome: declared policy, executor capability, applied policy, and exceptions/fallbacks.

## 11. Observability, evaluation, and reporting assessment

### What can accelerate ACS

- OTel trace/span compatibility, run context carrying trace references, and OpenTelemetry ingest/query paths are good interoperability primitives. [E17]
- Agent result payloads include stop reason, harness capabilities, usage, model, trace, events, and session identity. [E09]
- Evaluation runtime separates generic execution planning/types in SDK from API Taskiq dispatch adapters. This is a credible pattern for a deterministic planner plus infrastructure adapter. [E20]

### What ACS must own

- Canonical evidence hierarchy across agent/workforce/workflow/task/run/executor.
- Reporter projections and product-specific dashboards derived from that hierarchy.
- Evaluation attribution to exact AgentRevision, knowledge/resource versions, runtime route, and policy decisions.
- Cost data and pricing provenance.
- A stable external evidence retrieval API not coupled to trace-query implementation.

### Evaluation limitation

The inspected evaluation planner is for evaluator/testset/trace processing. It should not be mistaken for a workforce planner or agentic DAG coordinator. Its Taskiq adapter is useful only as a generic async-dispatch pattern. [E20]

## 12. API, event, and integration recommendations for ACS

Agenta’s external APIs are resource-oriented and its `/run` contract is internal. ACS should keep the internal/external split but use ACS vocabulary.

### Product-facing ACS API

```text
POST /v1/executions
  target: { kind: agent | workforce | workflow, ref, revision? }
  input, context_refs, execution_policy, idempotency_key

POST /v1/executions/{id}/approve
POST /v1/executions/{id}/cancel
POST /v1/executions/{id}/resume
GET  /v1/executions/{id}
GET  /v1/executions/{id}/result
GET  /v1/executions/{id}/evidence
GET  /v1/executions/{id}/cost
```

### Internal runtime request

```text
ResolvedExecutionRequest
  execution_id, node_id, attempt, parent refs
  agent_revision_ref
  resolved resources and policy decision references
  provider/model route reference
  harness/executor/environment selection
  input/context/knowledge references
  cancellation/deadline/checkpoint controls
  evidence and cost capture requirements
```

Use an internal schema/versioning discipline inspired by Agenta’s mirrored Python/TypeScript wire contract and golden fixtures, but do not expose it as a cross-product public contract. [E05, E11, E30]

## 13. Blockers, uncertainties, and PoCs

| ID | Severity | Component | Finding | Impact | Required next action |
|---|---|---|---|---|---|
| ACS-AGENTA-001 | High | Agent Core | No first-class durable agent aggregate; current identity aliases workflow/application/evaluator. | Blocks direct schema reuse. | ADR for ACS Agent/AgentRevision/Workflow/Workforce identity graph. |
| ACS-AGENTA-002 | High | Runtime Core | Runner is a single sandbox-agent/ACP-centered engine with executor-specific dependencies. | Blocks direct runner adoption as common ACS runtime. | Build an isolated contract-only PoC for ACS Runtime Router and one Codex adapter; do not import runner wholesale. |
| ACS-AGENTA-003 | High | Governance | Sandbox filesystem policy is declared but not implemented according to source comments. | Prevents using configuration fields as proof of containment. | Executor capability/enforcement attestation PoC and policy evidence model. |
| ACS-AGENTA-004 | High | Cost Core | Usage/cost has no normalized cost-line or settlement model. | Prevents using Agenta cost data as the complete ACS cost-accounting or $Neurons settlement model. | Define measurement, cost, pricing, allocation, and obligation ADRs before implementation. |
| ACS-AGENTA-005 | Medium | Licensing | MIT applies outside `ee/`, but no dependency license inventory was verified; runner includes proprietary harness paths. | Blocks source-copy decision, not conceptual reimplementation. | Legal/SBOM review scoped to exact copied modules and shipped dependencies. |
| ACS-AGENTA-006 | Medium | Contract stability | The runner header says Pi/Claude while current SDK enum/manifest include Codex; working tree is dirty. | Interface documentation and current behavior may diverge. | Pin a clean upstream commit and run contract tests in a disposable PoC before adopting types. |
| ACS-AGENTA-007 | Medium | Evidence | Session records/events and OTel spans are separate system views, and incomplete history is explicitly possible. | Cannot claim complete audit reconstruction solely from current primitives. | Define a proposed append/correction-oriented ACS execution graph and reconciliation rules. |

### Candidate future PoCs and validation gates, in dependency order

All PoCs below require separate implementation authorization and remain disposable, isolated, and non-production. This audit authorizes no source copy, integration, provider call, credential use, or runtime change.

1. **P0 — Canonical schema PoC:** serialize/validate additive ACS `Agent`/`AgentRevision` extensions, `ResolvedExecutionRequest`, and resource references without any Agenta source dependency.
2. **P1 — Provider/harness boundary PoC:** demonstrate a provider-neutral model route resolved into a Codex executor request and a direct-model request, with no credentials in persisted definition.
3. **P2 — Evidence PoC:** reconstruct one run with a parent workflow node, agent turn, tool call, approval, retry, usage measurement, and trace links from a proposed append/correction-oriented event model, including explicit incomplete/lost/unavailable source states.
4. **P3 — Resource compiler PoC:** resolve a versioned skill, tool, and MCP reference under an ACS domain policy into a redacted plan.
5. **P4 — License PoC:** create a reproducible license/SBOM inventory for any exact Agenta OSS files proposed for copying; explicitly exclude `ee/`.

## 14. Concise answers to the sprint decision questions: Agenta system

### What exactly should ACS reuse from Agenta?

- The artifact/variant/revision/commit/fork vocabulary as a design input; any selective MIT OSS source evaluation requires the separate authorization and license gates described above.
- The `AgentTemplate` separation of authored instructions/resources from harness-specific serialized configuration.
- The distinction between **selected provider connection reference** and **resolved execution route/credential binding**.
- Explicit, independent resource categories for **skills**, **tools**, and **MCP**.
- Capability negotiation rather than routing by harness name alone.
- Mirrored internal wire contracts with cross-language golden tests.
- Sequenced durable-event and session/interaction concepts, OpenTelemetry interoperability, and fail-closed resource resolution.

### What must ACS not reuse from Agenta?

- A standalone dependency on the current `services/runner` as the universal runtime.
- Agenta’s workflow-backed application/workflow/evaluator artifact-family identity model as ACS agent identity.
- Enterprise code and licensing terms under `ee/`.
- SaaS workspace/org/auth/billing/product UI/hosting assumptions.
- Stripe/meters/subscriptions or generic trace-cost fields as the ACS economic model.
- Agenta API names and resource hierarchy as the product integration API.

### What remains the responsibility of an executor such as Codex or OpenClaw?

Agenta’s separation supports the following ACS rule:

- **ACS owns:** target identity/version, policy/authority, resource resolution, run orchestration, evidence/cost attribution, approval decisions, and product-facing contracts.
- **Executor owns:** execution mechanics, session process lifecycle, tool transport adaptation, native model/harness invocation, executor telemetry, cancellation behavior, and actual policy enforcement attestations.

### How should providers be abstracted based on Agenta’s design?

Use separate Provider, Model, ConnectionReference, and ResolvedExecutionRoute objects. Agenta validates a selected model route against harness capabilities before and after credential resolution; retain that two-stage compatibility discipline but make ACS policy the authority. [E10]

### How should evidence be reconstructed?

Do not rely on runner logs or provider trace logs alone. Use the proposed ACS append/correction-oriented run graph; attach executor session events and OTel spans as linked evidence. Preserve explicit incomplete/lost-history state.

### How should costs be attributed?

Agenta provides only adapters for raw usage and aggregate costs. ACS needs its own cost lines allocated through Axodus → product → workforce → workflow → agent → task → provider/executor and only then priced/denominated/settled.

## 15. Recommended ADRs resulting from this audit

1. **ADR-ACS-AGENT-001 — Separate Agent, AgentRevision, Workflow, and Workforce identities.**
2. **ADR-ACS-RUNTIME-002 — Runtime Router with independent Provider, Model, Harness, Executor, and Environment contracts.**
3. **ADR-ACS-RESOURCE-003 — Versioned Skills, Tools, MCP, Knowledge, and SecretReference resolution pipeline.**
4. **ADR-ACS-GOV-004 — Three-plane authorization: control-plane authorization, execution authority, and per-action approvals.**
5. **ADR-ACS-EVIDENCE-005 — Proposed append/correction-oriented execution evidence graph with OpenTelemetry interoperability.**
6. **ADR-ACS-COST-006 — Usage, cost, pricing, allocation, and economic obligation are distinct records.**
7. **ADR-ACS-LICENSE-007 — MIT-source extraction process and explicit exclusion of Agenta `ee/` code.**

## 16. Implementation readiness

**Recommendation: CONDITIONAL GO for design and isolated contract PoCs; NO-GO for direct code merge or runtime replacement.**

The Go condition is met only for architecture convergence planning. It is not authorization for implementation, source import, or integration. Any future PoC requires separate authorization; Agenta runtime code remains unsuitable for direct integration until canonical identity alignment, runtime coupling, sandbox enforcement, economics, clean provenance, and license/SBOM gates are resolved.

## 17. Evidence index

| ID | Source | Exact evidence used |
|---|---|---|
| E01 | `/home/mzfshark/agenta/.git` via `git` metadata | `HEAD=204703fc24ff52993be317c7a83e2bd755051d35`; remote and latest commit output captured during audit. |
| E02 | `/home/mzfshark/agenta` via `git status` | Pre-existing modified files: `sdks/python/agenta/sdk/agents/connections/endpoints.py`, `models.py`, corresponding test, `services/runner/src/engines/sandbox_agent/run-plan.ts`, corresponding test. |
| E03 | `/home/mzfshark/agenta/AGENTS.md:1-140`; `/home/mzfshark/agenta/api/AGENTS.md:1-220` | Repository/API topology, layering, revision patterns, scopes, RBAC description, and conventions. |
| E04 | `/home/mzfshark/agenta/LICENSE:1-31`; `/home/mzfshark/agenta/ee/LICENSE:1-29`; `/home/mzfshark/agenta/api/pyproject.toml:1-65` | OSS MIT terms, EE restrictions, API version and dependencies. |
| E05 | `/home/mzfshark/agenta/services/runner/AGENTS.md:1-84` | Runner mission, `/run` contract, lifecycle map, mirrored wire/golden-contract requirement. |
| E06 | `/home/mzfshark/agenta/services/runner/package.json:1-77` | Runner dependencies, harness pins/licensing note, scripts. |
| E07 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/models/git.py:18-113` | Artifact/variant/revision/fork DTO hierarchy. |
| E08 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/models/workflows.py:68-127` | Workflow flags including `is_agent` and `is_skill`. |
| E09 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/dtos.py:618-709`; `:776-950`; `:1176-1245` | Agent result, agent template, harness translation seams, session bundle. |
| E10 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/handler.py:1-120`; `:182-294`; `:297-330` | Agent composition, default backend, workflow-backed agent identity, fail-closed two-stage model/harness resolution. |
| E11 | `/home/mzfshark/agenta/services/runner/src/protocol.ts:1-9`; `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/utils/wire.py` | `/run` protocol source/mirror statement and runner interface. |
| E12 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/interfaces.py:1-28`; `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/dtos.py:46-150`; `:225-263` | Backend/Sandbox/Session/Environment layering, harness identity, capability schema. |
| E13 | `/home/mzfshark/agenta/services/runner/src/engines/sandbox_agent/` file topology; `/home/mzfshark/agenta/services/runner/AGENTS.md:33-56` | Runner composition, environment, turn, session, tool/MCP and teardown implementation map. |
| E14 | `/home/mzfshark/agenta/api/oss/src/core/sessions/records/dtos.py:75-211`; `:214-270` | Durable event types, sequencing/watermarks, session records, incomplete/lost execution marker. |
| E15 | `/home/mzfshark/agenta/api/entrypoints/routers.py:380-479` | Mounted API product domains and descriptions including sessions/interactions/mounts/OTLP. |
| E16 | `/home/mzfshark/agenta/api/entrypoints/routers.py:876-920` | Detached workflow start and Redis Stream interaction/trigger pipeline wiring. |
| E17 | `/home/mzfshark/agenta/api/oss/src/core/tracing/dtos.py:22-68`; `:73-99`; `:194-230`; `:271-358`; `/home/mzfshark/agenta/api/oss/src/core/tracing/service.py:177-222` | OTel model re-exports, fields, analytics cost/tokens, trace data references, ingestion. |
| E18 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/skills/models.py`; `/home/mzfshark/agenta/sdk/agents/tools/models.py`; `/home/mzfshark/agenta/sdk/agents/mcp/models.py` | Typed resource categories and their model surfaces; inspected as implementation files. |
| E19 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/dtos.py:504-610` | Run context and session context behavior; hidden server-side bindings and prompt-only session context. |
| E20 | `/home/mzfshark/agenta/api/oss/src/core/evaluations/runtime/types.py:1-48`; `planner.py:57-120`; `runner.py:12-110`; `broker.py:1-118` | SDK-owned evaluation planner/types, Taskiq adapter, Redis broker behavior. |
| E30 | `/home/mzfshark/agenta/sdks/python/oss/tests/pytest/unit/agents/skills/test_skills_e2e.py:1-208`; `/home/mzfshark/agenta/services/runner/tests/unit/wire-contract.test.ts`; `/home/mzfshark/agenta/sdks/python/oss/tests/pytest/unit/agents/golden/` | Contract/test-backed skills-to-wire and cross-language wire fixture assertions; test files were inspected, not executed. |
| E31 | `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/connections/endpoints.py:34-84`; `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/connections/models.py:242-263`; `/home/mzfshark/agenta/services/runner/src/engines/sandbox_agent/run-plan.ts:384-400` | Pre-existing uncommitted HTTP endpoint/insecure-egress conditional changes. |

## 18. Confidence and limitations

- **High confidence:** agent-template, revision, handler, runner-boundary, session-event, tracing, and license conclusions are based on directly inspected source/contracts.
- **Medium confidence:** exact current Codex runner support breadth, because protocol comments and SDK/manifest references are not fully aligned and no runtime test was executed.
- **Low confidence / not determined:** runtime deployment configuration, live provider behavior, database migrations applied, third-party dependency licenses, security posture in deployment, performance/concurrency limits, and product UI usage paths.
- **Explicitly not asserted:** production readiness, sandbox-policy enforcement, total evidence completeness, financial accounting correctness, or authorization completeness.
