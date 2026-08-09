# S18 — Runtime Lifecycle

## Overview

S18 manages the runtime lifecycle for sandbox deployments via `RuntimeInstance` and `ExecutionRun` state machines.

## State Machine

The runtime state transitions follow strict validation:

- `pending` -> `starting` -> `running` -> `stopping` -> `stopped` -> `terminated`
- `running` -> `failed` -> `terminated`

Illegal transitions (e.g. `stopped` -> `running`) are rejected by `RuntimeLifecycleService`.

## Mode Restrictions

- **Sandbox Only:** Runtime start operations are restricted to `deploymentMode === "sandbox"`. Requests for live runtime start are denied.

## Operational Safety

Runtime instances and execution runs are tracked independently. Runtime instances map to engine runtime records, while execution runs represent discrete task executions inside an instance. Real runtime configuration files under `~/.openclaw` remain untouched.
