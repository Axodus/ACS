# ACS Core

ACS Core is the initial runtime package for Axodus Cognitive Systems.

It provides deterministic primitives for:

- bounded agent registration
- provider capability registration
- governance policy evaluation
- workflow orchestration
- audit-friendly telemetry
- execution receipts
- local JSONL receipt persistence
- OpenClaw agent discovery without code execution

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

- OpenClaw discovery from `~/.openclaw/agents`
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

`npm run acs -- redhat skills`, `redhat describe <skillId>`, and `redhat plan <task>` use the safe RedHat adapter. The adapter reads local skill metadata only; it does not execute commands, mutate files, call MCP tools, or run OpenClaw agents.

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
