# ACS Architecture

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
- `src/runtime.ts` bootstraps local ACS with OpenClaw discovery, default policy, telemetry, local provider registration, and `.acs/receipts/execution.jsonl` persistence.
- `src/workflows.ts` defines named local workflows with stable `workflowRunId` values.
- `scripts/acs.mjs` exposes local operational commands for agents, providers, workflows, receipts, and bounded workflow execution.
- Runtime execution is idempotent by default: an existing receipt for a `workflowRunId` is returned unless forced.

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
