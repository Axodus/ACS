# S17 — Governed Sandbox Deployment

## Overview

S17 establishes the governed deployment chain for ACS agents. Every deployment passes through explicit governance authorization, target eligibility verification, economic token reservation ($Neurons), and engine mutation.

## Governed Deployment Chain

1. **Governance Evaluation:** Enforces that `deploymentMode === "sandbox"`. Requests for `live` or `staged` modes are explicitly denied.
2. **Target Eligibility:** Validates that the selected `ExecutionTarget` (e.g. `local-wsl`) is healthy and supports `sandbox` deployment mode.
3. **Economic Reservation:** Calculates quote and reserves `$Neurons` using `EconomicService`. Releases reservation if deployment fails or governance denies.
4. **Engine Mutation:** Invokes `agent.deploy` via `acs-engine/1` protocol to generate deployment artifacts under configured `artifacts_root`.

## Error Taxonomy

- `EngineSandboxOnlyError` (`ACS_ENGINE_SANDBOX_ONLY`): Thrown when live or staged deployment modes are requested.
- `EngineTargetNotFoundError` (`ACS_ENGINE_TARGET_NOT_FOUND`): Thrown when target is invalid or missing.

## Operational Safety

Real runtime files under `~/.openclaw` remain untouched. Deployments produce isolated artifacts under `artifacts_root/deployments`.
