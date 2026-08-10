# S20 — Frontend Integration

## Overview

S20 connects the frontend UI model to the ACS Product API via `ProductApiClient`.

## Architectural Boundaries

- **Product API Only:** The frontend communicates strictly with the ACS Product API layer.
- **No Direct Engine Access:** The frontend never communicates directly with `AgentsAI`, Python CLI, OpenClaw filesystem (`~/.openclaw`), or LLM providers.
- **Secret Redaction:** Product API surfaces secret-free references only. Raw keys or tokens are never exposed or returned to the browser.
- **Sandbox Mode Restriction:** UI operations for deployment and runtime execution enforce `sandbox` mode. Requests for live mode are blocked with `EngineSandboxOnlyError`.

## Supported Client Operations

- `listAgents()` / `getAgent(id)`
- `listTargets()`
- `listProviders()`
- `listRunners()`
- `deployAgent(request)`
- `listDeployments()`
- `startRuntime(request)` / `stopRuntime(id)` / `listRuntimes()`
- `queryAuditEvents(filter)`
