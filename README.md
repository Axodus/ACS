# ACS Core

ACS Core is the initial runtime package for Axodus Cognitive Systems.

Current planning reset:

- ACS is the tenant-aware Autonomous Coordination System for Core, Service, and Product consumption.
- Trading Ignition is a mapped ACS Product/Service use case, not the entire ACS identity.
- Operational States, the ACS Policy Matrix, and What ACS Is Not are mandatory before new product features.
- ACS must not custody funds, withdraw funds, promise profit, or activate strategies outside policy.

It provides deterministic primitives for:

- bounded agent registration
- provider capability registration
- governance policy evaluation
- workflow orchestration
- audit-friendly telemetry
- execution receipts
- local JSONL receipt persistence
- OpenClaw agent discovery without code execution
- Operational State and ACS Policy Matrix contracts
- Operational State transition telemetry and receipts
- Readiness checklist and mock license validation contracts
- Mock exchange API safety validation with withdrawal blocking and IP allowlist recommendations
- Risk preset schema with conservative public default and limit evaluation
- Core/Service/Product consumption-level contracts
- tenant context, capability registry, tenant service access, and product access contracts

This package does not execute real inference, access wallets, settle treasury flows, or route production compute. Provider execution is represented as capability matching until the provider verification, pricing, memory, and billing decisions are finalized.

## Commands

```bash
npm install
npm run build
npm test
npm run acs -- help
npm run acs -- agents
npm run acs -- receipts
npm run acs -- telemetry
npm run acs -- redhat skills
npm run acs -- redhat plan "create implementation plan"
npm run acs -- redhat guarded "run tests"
npm run acs -- workflow dev-coordination
npm run acs -- workflow security-review
npm run acs -- workflow governance-alignment
npm run acs -- workflow implementation-plan
npm run smoke:openclaw
npm run smoke:runtime
```

## Runtime Bootstrap

```ts
import { createAcsRuntime } from "@axodus/acs-core";

const runtime = createAcsRuntime({
  workspaceRoot: process.cwd(),
});
```

Default bootstrap wires:

- OpenClaw discovery from `ACS_OPENCLAW_AGENTS_ROOT` or `~/.openclaw/agents`
- local agent registry
- default bounded governance policy
- in-memory telemetry sink
- persistent telemetry at `.acs/telemetry/events.jsonl`
- append-only receipt store at `.acs/receipts/execution.jsonl`
- local coordination provider for visible capability routing

## OpenClaw Discovery

```ts
import { discoverOpenClawAgents } from "@axodus/acs-core";

const agents = discoverOpenClawAgents({
  rootPath: `${process.env.HOME}/.openclaw/agents`,
});
```

Discovery only reads local agent directories and manifests. It does not execute agent code, does not mutate OpenClaw state, and grants only bounded default permissions.

ACS does not vendor `.openclaw` as a submodule. `.openclaw` is treated as a local operational runtime with mutable state, memory, logs, credentials, and environment files. If ACS needs versioned OpenClaw contracts later, use a sanitized schema/adapter package instead of submoduling the runtime.

Known agent boundaries:

- `morpheus`, `agentsmith`, and `trinity` are Axodus CORE agents.
- `redhat` is an owner-private product agent for the Head Dev Senior context.
- `mariana` is a client-dedicated product agent.
- `main` is normalized as an OpenClaw alias/source for canonical `trinity`.
- Trinity is the only CORE agent currently allowed to spawn sub-agents, limited to trading/market/MCP Trading scopes.

## Smoke Commands

`npm run acs -- agents` lists discovered OpenClaw agents.

`npm run acs -- workflow dev-coordination` executes the named development coordination workflow. The default workflow run id is stable, so repeated executions return the existing receipt unless `--force` is passed.

`npm run acs -- receipts` lists local execution receipts from `.acs/receipts/execution.jsonl`. Supported filters:

- `--workflow-run <id>`
- `--workflow <id>`
- `--agent <id>`
- `--status <completed|failed|rejected>`

`npm run acs -- telemetry` lists persisted telemetry events from `.acs/telemetry/events.jsonl`.

`npm run acs -- redhat skills`, `redhat describe <skillId>`, `redhat plan <task>`, and `redhat guarded <task>` use the safe RedHat adapter. The adapter reads local skill metadata only; it does not execute commands, mutate files, call MCP tools, or run OpenClaw agents.

`redhat guarded <task>` classifies risk and emits a blocked guarded-task result. It is the contract shape for a future `executeGuardedTask(task)` implementation, not an execution path.

## Execution Policy

Command execution is modeled but disabled by default.

`DefaultExecutionPolicy` evaluates:

- command/task risk
- requested action allowlist
- approval token state
- sandbox boundary
- global execution enablement

Default behavior:

- `executionEnabled: false`
- sandbox mode: `blocked`
- no allowlisted actions
- no approval tokens
- critical tasks are blocked under the default policy

This keeps `executeGuardedTask(task)` as a risk-gated contract until a future execution adapter is explicitly designed.

## Operational States and Policy Matrix

Canonical operational states:

- `UNINITIALIZED`
- `LEARNING`
- `CERTIFIED`
- `LICENSED`
- `API_PENDING`
- `API_VALIDATED`
- `RISK_RESTRICTED`
- `READY`
- `ACTIVE`
- `PAUSED`
- `EMERGENCY_STOP`
- `SUSPENDED`
- `REVOKED`

Strategy activation requires `READY`. `EMERGENCY_STOP`, `SUSPENDED`, and `REVOKED` block activation.

The ACS Policy Matrix defines initial authorities for critical Trading Ignition capabilities. `withdraw.funds` is never allowed for user via ACS, ACS, governance, or risk engine.

State transitions can be applied with `OperationalStateMachine`, which records accepted/rejected transition telemetry and state-change receipts. The current readiness and license contracts are intentionally local/mock-friendly so AxodusAPP can build against stable shapes before real Marketplace and exchange integrations exist.

`validateMockExchangeApiSafety()` blocks withdrawal/transfer permissions, unsafe secret handling, and returns UI recommendations to disable withdrawals, use IP permission/allowlist, and grant only minimum required trading permissions.

`risk-preset` exports `conservative`, `balanced`, and `experimental` presets. Public users default to `conservative`: max $100 capital, max 1x leverage, spot-only, no futures, no margin. Higher-risk presets require governance/internal validation gates before use.

The tenant-aware layer exports `AcsCapabilityRegistry`, `AcsTenantContext`, `evaluateTenantServiceAccess`, and `evaluateProductAccess`. Operational state receipts and telemetry can include `consumptionLevel` and `tenantId` for tenant-scoped auditability.

## Tenant-Aware Inspection

Read-only inspection commands expose ACS capability and access policy without triggering automation:

```bash
npm run acs -- capabilities
npm run acs -- capabilities --level core
npm run acs -- capabilities --level service
npm run acs -- capabilities --level product
npm run acs -- tenant-services
npm run acs -- tenant-services --tenant dao-alpha
npm run acs -- product-access
npm run acs -- product-access --wallet 0xlicensed
npm run acs -- product-access --product product.trading-ignition
npm run acs -- policy-matrix
npm run acs -- policy-check --capability product.trading-ignition --tenant dao-alpha
```

Inspection commands return JSON and do not initialize runtime telemetry/receipt persistence.

## HTTP Inspection API

ACS exposes the same read-only inspection layer through a JSON HTTP API:

```bash
npm run http
```

Default local base URL:

```text
http://127.0.0.1:8788/acs
```

Endpoints include:

- `GET /acs/health`
- `GET /acs/version`
- `GET /acs/capabilities`
- `GET /acs/capabilities?level=product`
- `GET /acs/tenant-services`
- `GET /acs/tenant-services/:tenantId`
- `GET /acs/product-access/:wallet`
- `GET /acs/product-access/:wallet/:productId`
- `GET /acs/policy-matrix`
- `GET /acs/policy-check?capabilityId=product.trading-ignition&tenantId=dao-alpha`
- `GET /acs/status/:wallet`
- `GET /acs/readiness/:wallet`
- `GET /acs/operational-state/:wallet`

The API is GET-only and inspection-only. It must not trigger automation, trading, CEX calls, tenant state mutation, or license mutation.

`npm run smoke:openclaw` lists discovered OpenClaw agents, mapped permissions, local providers, and the configured receipt path.

`npm run smoke:runtime` executes a coordination workflow using RedHat Dev, Morpheus, and Agent Smith. It writes the execution receipt to `.acs/receipts/execution.jsonl`.

## Idempotency

Every workflow should carry a stable `workflowRunId`. `AcsRuntime.execute` checks the receipt store before executing and returns the existing receipt for duplicate run ids. Use `force: true` or CLI `--force` only when a deliberate replay is needed.

## Workflow Registry

Named workflows live under `src/workflows/` and expose name, version, description, and factory:

- `dev-coordination`
- `security-review`
- `governance-alignment`
- `implementation-plan`

## Current Runtime Boundary

The first runtime boundary is intentionally narrow:

- workflows must contain explicit steps
- every step must name an agent
- every required permission must be held by that agent
- provider routing is capability-based and visible in receipts
- telemetry is emitted for accepted, rejected, started, completed, and failed workflows
- failures return execution receipts instead of failing silently
- receipt persistence is append-only JSONL when `JsonlReceiptStore` is configured

## Development Notes

Workspace instructions live in `.instructions/` and remain the operational source of truth for ACS development.
