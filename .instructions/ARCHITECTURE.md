# ACS Architecture

Planning reset:
ACS is currently scoped as a tenant-aware Autonomous Coordination System with Core, Service, and Product consumption levels. Trading Ignition is one mapped ACS Product/Service use case.

The first architectural authorities are:
- `ACS_CONSUMPTION_MODEL.md`
- `ACS_TENANT_SERVICE_MODEL.md`
- `ACS_CORE_OPERATIONS.md`
- `ACS_PRODUCT_LAYER.md`
- `ACS_OPERATIONAL_STATES.md`
- `ACS_POLICY_MATRIX.md`
- `ACS_IS_NOT.md`
- `ACS_TRADING_IGNITION_PRODUCT.md`
- `ACS_LICENSE_AND_ACCESS_MODEL.md`
- `ACS_RISK_MODEL.md`
- `ACS_SECURITY_REQUIREMENTS.md`

# Architectural Mission

ACS provides the cognitive infrastructure of the Axodus ecosystem.

ACS coordinates:
- cognitive execution
- orchestration
- distributed inference
- persistent memory
- workflow automation
- enterprise cognitive systems
- decentralized compute participation

while remaining:
- auditable
- bounded
- governance-aware
- modular

---

# ACS Topology

ACS is composed of multiple interoperable cognitive layers.

Core layers:
- orchestration layer
- memory layer
- compute layer
- provider layer
- billing layer
- telemetry layer
- governance boundary layer

---

# Cognitive Execution Layer

Coordinates:
- agents
- workflows
- orchestration
- reasoning
- execution routing

This layer acts as operational cognition infrastructure.

---

# Agent Layer

Agents are bounded operational entities.

Agents may:
- coordinate tasks
- execute workflows
- monitor systems
- generate reports
- assist governance
- assist treasury operations

Agents must remain:
- permission-bound
- observable
- auditable

Agents are not sovereign authorities.

Agent separation model:
- Axodus CORE agents: Morpheus, Agent Smith, Trinity.
- Owner-product agent: RedHat Dev, currently exclusive to the Axodus Head Dev Senior context.
- Client-dedicated product agent: Mariana, isolated for a specific client deployment.
- Unknown/discovered agents: treated as unclassified and restricted to minimal planning permissions.

CORE consumption boundary:
- Morpheus, Agent Smith, and Trinity are exclusive to the Axodus ecosystem.
- They must not be exposed as generic client products.
- Trinity is the only CORE branch that may spawn client-facing sub-agents, and only for trading/market/MCP Trading scopes.

OpenClaw normalization:
- `main` and `trinity` are the same conceptual Trinity agent.
- ACS normalizes both local directories to canonical agent id `trinity`.

---

# MCP Layer

MCP acts as an internal orchestration and interoperability protocol.

Responsibilities:
- runtime coordination
- tool interoperability
- transport abstraction
- execution interfaces
- orchestration communication

MCP is infrastructure, not the sovereign cognitive layer itself.

---

# Memory Architecture

Memory systems coordinate:
- contextual persistence
- vector memory
- execution history
- workflow continuity
- operational recall

Memory must support:
- isolation
- permission boundaries
- retention policies
- auditability

---

# Compute Architecture

ACS supports decentralized compute federation.

Compute providers may expose:
- GPU infrastructure
- model execution
- inference APIs
- routing endpoints

Compute participation should remain:
- permission-aware
- metered
- observable

---

# Provider Architecture

Providers expose:
- models
- execution capabilities
- inference endpoints
- telemetry
- pricing metadata

Providers may be:
- internal
- external
- federated
- enterprise-dedicated

---

# Billing Architecture

Billing coordinates:
- token metering
- compute usage
- provider compensation
- treasury settlement

Billing must expose:
- execution cost
- provider usage
- metering consistency
- accounting telemetry

---

# Orchestration Layer

The orchestration layer coordinates:
- workflows
- multi-agent execution
- event routing
- execution sequencing
- bounded autonomy

Orchestration must remain deterministic and observable.

Current implementation baseline:
- `src/orchestrator.ts` provides a deterministic in-process orchestration primitive.
- Workflows produce execution receipts instead of hidden side effects.
- Provider routing is capability matching only; no real inference or external compute is executed.
- Governance policy evaluation gates workflow and step execution before receipts are completed.
- Telemetry is emitted through an explicit sink interface.
- `src/receipts.ts` provides in-memory and append-only JSONL receipt stores.
- `src/openclaw.ts` discovers local OpenClaw agents by reading directories/manifests only.
- `src/openclaw.ts` classifies known agents by CORE/product/client boundary and normalizes `main` into canonical `trinity`.
- `src/runtime.ts` bootstraps local ACS with OpenClaw discovery, default policy, persistent telemetry, local provider registration, and `.acs/receipts/execution.jsonl` persistence.
- `src/workflows/` defines named/versioned local workflows with stable `workflowRunId` values.
- `scripts/acs.mjs` exposes local operational commands for agents, providers, workflows, receipts, and bounded workflow execution.
- Runtime execution is idempotent by default: an existing receipt for a `workflowRunId` is returned unless forced.
- `src/telemetry.ts` provides append-only JSONL telemetry persistence at `.acs/telemetry/events.jsonl`.
- `src/redhat-mcp.ts` defines the safe RedHat Dev MCP contract for listing skills, describing skills, and planning tasks without command execution.
- `src/execution-policy.ts` defines `ExecutionPolicy`, `DefaultExecutionPolicy`, command risk assessment, action allowlists, approval state, and sandbox boundaries.
- `src/operational-state.ts` defines the canonical ACS operational states and allowed transitions.
- `src/acs-policy-matrix.ts` defines the initial capability authority matrix for Trading Ignition.
- `src/operational-state-machine.ts` applies operational state transitions, emits telemetry, and writes transition receipts.
- `src/readiness.ts` defines the MVP readiness checklist contract.
- `src/license.ts` defines the replaceable mock license validation contract.
- `src/consumption-levels.ts` defines Core, Service, and Product consumption levels plus automation levels.
- `src/tenant-context.ts` defines tenant-aware context and isolation helpers.
- `src/capability-registry.ts` defines initial ACS capabilities, including Trading Ignition.
- `src/tenant-service-registry.ts` evaluates tenant service access.
- `src/product-access-registry.ts` evaluates user/product access.

Trading Ignition baseline:
- Operational state is the central gate for user progress and strategy activation.
- `READY` is required before strategy activation.
- `EMERGENCY_STOP`, `SUSPENDED`, and `REVOKED` block strategy activation.
- Withdraw funds is never an ACS capability.
- Operational state changes must emit telemetry and receipts.

Current workflow registry:
- `dev-coordination`
- `security-review`
- `governance-alignment`
- `implementation-plan`

RedHat MCP boundary:
- `listSkills()` reads local skill metadata.
- `describeSkill(skillId)` reads a local skill manifest.
- `planTask(task)` creates a bounded plan from local skill metadata.
- `executeGuardedTask(task)` is currently a blocked contract/risk gate only.
- No RedHat MCP method currently executes commands, mutates files, calls MCP tools, or runs OpenClaw agents.

Execution policy model:
- command execution is disabled by default
- default sandbox mode is `blocked`
- requested actions must match explicit allowlists
- risky commands require approval tokens
- critical risk remains blocked under the default policy
- policy decisions expose reasons, risk assessment, approval state, and sandbox boundaries

---

# Enterprise Architecture

Enterprise deployments support:
- isolated orchestration
- isolated memory
- isolated compute
- isolated agents
- dedicated workflows

Enterprise systems must preserve permission isolation.

---

# Governance Boundaries

ACS remains subordinate to governance sovereignty.

Governance may:
- restrict execution
- restrict permissions
- restrict treasury interaction
- restrict compute participation

ACS must never bypass governance authority.

---

# Security Constraints

- no hidden execution
- no hidden provider routing
- no opaque memory access
- no unrestricted agent autonomy
- no centralized cognitive authority
- no unbounded execution chains
