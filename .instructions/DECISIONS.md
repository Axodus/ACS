# ACS Decisions

# Active Decisions

## Tenant-Aware Consumption Model

Decision:
ACS is a tenant-aware operational intelligence layer with Core, Service, and Product consumption levels.

Trading Ignition remains an important use case, but it is classified as an ACS Product for end users, an ACS Service when offered by enabled DAO Tenants, and an ACS Core monitoring/policy target.

Status:
CONFIRMED

---

## Automation Maturity Boundary

Decision:
Full autonomous execution is not allowed yet. Current ACS may monitor, validate, recommend, guide, simulate, prepare workflows, emit telemetry, generate receipts, and require manual approval.

Autonomous tenant-critical actions depend on future Governance maturity.

Status:
CONFIRMED

---

## ACS Planning Reset

Decision:
ACS is reset around the Autonomous Coordination System direction. The first MVP target is Trading Ignition, with Operational States, ACS Policy Matrix, and What ACS Is Not as mandatory foundations before new features.

Status:
CONFIRMED

---

## Operational States

Decision:
ACS uses canonical operational states as the control backbone:
`UNINITIALIZED`, `LEARNING`, `CERTIFIED`, `LICENSED`, `API_PENDING`, `API_VALIDATED`, `RISK_RESTRICTED`, `READY`, `ACTIVE`, `PAUSED`, `EMERGENCY_STOP`, `SUSPENDED`, `REVOKED`.

`READY` is required for strategy activation. `EMERGENCY_STOP`, `SUSPENDED`, and `REVOKED` block activation.

Status:
CONFIRMED

---

## ACS Policy Matrix

Decision:
Every ACS capability must be represented in the ACS Policy Matrix before implementation. Withdraw funds is never allowed for user via ACS, ACS, governance, or risk engine.

Status:
CONFIRMED

---

## What ACS Is Not

Decision:
ACS is not an autonomous hedge fund, profit promise system, custodian, unrestricted execution engine, governance bypass, or public product before internal validation.

Status:
CONFIRMED

---

## OpenClaw Workspace Boundary

Decision:
ACS will not add `.openclaw` as a submodule now. ACS uses the local configurable OpenClaw agents path, defaulting to `~/.openclaw/agents` or `ACS_OPENCLAW_AGENTS_ROOT`.

Rationale:
`.openclaw` is an operational runtime with memory, logs, local state, credentials, environment files, and live changes. If ACS needs versioned OpenClaw contracts later, create a sanitized schema/adapter package instead of submoduling the runtime.

Status:
CONFIRMED

---

## ACS Direction

Decision:
ACS acts as the cognitive infrastructure layer of the Axodus ecosystem.

Status:
CONFIRMED

---

## MCP Positioning

Decision:
MCP is an internal protocol/service layer of ACS.

MCP is not the sovereign cognitive workspace itself.

Status:
CONFIRMED

---

## Agent Philosophy

Decision:
Agents are bounded operational systems.

Agents must remain:
- observable
- auditable
- permission-constrained

Agents are not sovereign authorities.

Status:
CONFIRMED

---

## Compute Federation

Decision:
ACS supports decentralized compute participation.

Providers may contribute:
- GPU infrastructure
- inference execution
- model hosting
- compute capabilities

Status:
CONFIRMED

---

## Governance Compatibility

Decision:
ACS remains governance-aware and governance-constrained.

ACS systems must never bypass:
- governance permissions
- treasury restrictions
- constitutional boundaries

Status:
CONFIRMED

---

## Enterprise Cognitive Systems

Decision:
ACS supports dedicated enterprise MCP deployments.

Enterprise deployments may include:
- isolated orchestration
- isolated memory
- isolated compute
- isolated workflows

Status:
CONFIRMED

---

## Billing Philosophy

Decision:
Billing acts as the accounting layer for cognitive execution.

Billing must expose:
- token metering
- provider compensation
- execution visibility
- settlement consistency

Status:
CONFIRMED

---

## Memory Philosophy

Decision:
Memory is sovereign operational infrastructure.

Memory systems must support:
- contextual persistence
- permission isolation
- retention policies
- auditability

Status:
CONFIRMED

---

## ACS Core Runtime Baseline

Decision:
The first ACS core implementation is a local TypeScript package with deterministic orchestration primitives, in-memory registries, explicit governance policy checks, provider capability matching, telemetry events, and execution receipts.

Constraints:
- no real provider execution
- no wallet or treasury mutation
- no production contract addresses
- no hidden workflow execution
- no persistent memory until the canonical memory strategy is decided

Status:
CONFIRMED

---

## Local OpenClaw Coordination

Decision:
ACS may discover local OpenClaw agents from `~/.openclaw/agents` by reading agent directories and manifests, but discovery must not execute agent code or mutate OpenClaw state.

Initial permission mapping is conservative:
- RedHat Dev receives development orchestration permissions.
- Morpheus, Agent Smith, Mariana, and Trinity receive bounded planning/review permissions.
- Unknown agents receive only `workflow.plan`.
- `main` is normalized as alias/source of canonical `trinity`.

Status:
CONFIRMED

---

## Agent Product Boundaries

Decision:
ACS separates agents by consumption boundary:
- Morpheus, Agent Smith, and Trinity are Axodus CORE agents and are exclusive to the Axodus ecosystem.
- RedHat Dev is a product agent currently exclusive to the Axodus Head Dev Senior owner/operator context.
- Mariana is a client-dedicated product agent for a specific client deployment.
- Unknown discovered agents remain unclassified and receive minimal permissions.

Status:
CONFIRMED

---

## Trinity Sub-Agent Boundary

Decision:
Trinity is the only Axodus CORE branch currently allowed to spawn client-facing sub-agents.

Allowed scope:
- personal trading agents
- market-operation agents
- personal MCP Trading operators

Constraints:
- spawned agents must remain sub-agents of Trinity
- spawned agents must not inherit unrestricted Trinity authority
- spawned agents must stay inside trading/market scopes
- spawned agents must expose telemetry and execution receipts
- wallet/treasury actions remain permission and governance constrained

Status:
CONFIRMED

---

## Local Runtime Bootstrap

Decision:
ACS local bootstrap composes OpenClaw agent discovery, in-memory telemetry, default bounded governance policy, a local coordination provider, and append-only JSONL execution receipts at `.acs/receipts/execution.jsonl`.

Smoke workflows may validate coordination among RedHat Dev, Morpheus, and Agent Smith, but they must not execute agent code, mutate OpenClaw state, call production providers, sign wallet actions, or perform treasury transfers.

Status:
CONFIRMED

---

## Workflow Idempotency

Decision:
ACS workflows should use stable `workflowRunId` values. Runtime execution checks the receipt store before orchestration and returns the existing receipt for duplicate run ids unless execution is explicitly forced.

Rationale:
This prevents accidental duplicate workflow execution while keeping deliberate replay available for local validation.

Status:
CONFIRMED

---

## Local CLI Boundary

Decision:
ACS exposes a local CLI through `npm run acs -- ...` for agents, providers, workflow listing, workflow execution, smoke execution, and receipt queries.

Boundary:
The CLI only uses the local ACS runtime. It does not execute OpenClaw agent code, call production providers, mutate treasury state, sign wallet operations, or bypass governance policy.

Status:
CONFIRMED

---

## RedHat MCP Safe Contract

Decision:
ACS defines an initial safe RedHat Dev MCP adapter with read/plan methods only:
- `listSkills()`
- `describeSkill(skillId)`
- `planTask(task)`
- `executeGuardedTask(task)` as a blocked contract/risk gate only

Boundary:
The adapter reads local RedHat Dev skill metadata and creates bounded plans. It does not execute commands, mutate files, call MCP tools, invoke OpenClaw agents, or perform deployment actions.

Future:
Actual guarded execution may be enabled only after explicit command allowlists, approval gates, sandbox boundaries, telemetry, receipts, and permission checks are implemented.

Status:
CONFIRMED

---

## Command Execution Policy

Decision:
ACS models command execution through `ExecutionPolicy` before any real execution adapter exists.

Policy decisions expose:
- risk assessment
- allowlist match
- approval state
- sandbox boundary
- execution enablement
- blocking reasons

Default posture:
- execution disabled
- sandbox blocked
- no network
- no filesystem writes
- no allowlisted actions
- no approval tokens

Status:
CONFIRMED

---

## Workflow Registry

Decision:
ACS workflows are named and versioned under `src/workflows/`.

Initial workflows:
- `dev-coordination`
- `security-review`
- `governance-alignment`
- `implementation-plan`

Status:
CONFIRMED

---

## Persistent Telemetry

Decision:
ACS persists telemetry events as append-only JSONL records at `.acs/telemetry/events.jsonl` by default.

Rationale:
Receipts summarize executions; telemetry preserves operational event history for local replay, inspection, and future observability.

Status:
CONFIRMED

---

# Pending Decisions

## Provider Verification Model

Status:
PENDING

---

## Compute Pricing Model

Status:
PENDING

---

## Canonical Memory Persistence Strategy

Status:
PENDING

---

## Autonomous Routing Limits

Status:
PENDING

---

## Cognitive Marketplace Strategy

Status:
PENDING
