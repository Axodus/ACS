# EPIC-11 Architecture

## 1. System boundary

EPIC-11 is the first operational surface above the ACS Product API. It does not own the underlying domain truth for Agents, Runtime, Deployment, ExecutionPlan, ExecutionRun, Worker, Credential, Provider, Engine, Policy, Eligibility, Sandbox, or the Economic Contract. Those domains are exposed, not recreated.

```text
Frontend
  ↓
Product API
  ↓
ACS Control Plane
  ↓
Workers / Runtime / Execution Target
  ↓
OpenClaw
```

## 2. Organizing rule

```text
Fluxo > Módulo > Tela
```

The Product API must be planned and consumed as a Control Plane. UI structure follows operational flow, not the reverse.

## 3. Operational layers

### Operational Awareness

System shell, global health, readiness, blockers, warnings, and evidence summary.

### Agent Lifecycle

Inventory, detail, creation, editing, revision management, and lifecycle actions for governed agents.

### Composition Surface

Roles, Profiles, Skills, Capabilities, Tools, Plugins, Engines, Providers, and Models as a single composition system.

### Operational Execution

Credentials, connections, readiness, planning, deploy, runtime, execution runs, and worker operations.

### Operational Evidence & Economics

Logs, events, audit, diagnostics, readiness evidence, settlement, and economic visibility.

### Control Plane Hardening

Policies, configuration, administration, consistency, recovery, regression, and acceptance.

## 4. Boundary constraints

1. The frontend consumes the Product API only.
2. EPIC-11 does not infer truth from local files, CLI state, or execution side effects.
3. The control plane owns identity, authority, revisioning, planning, governance, and evidence.
4. Runtime and worker state are observed state, not source state.
5. Economics may remain a distinct flow or be treated as part of evidence, but the decision stays open until refinement.

## 5. Dependency shape

```text
Operational Awareness
        │
        ▼
Agent Lifecycle
        │
        ▼
Composition Surface
        │
        ▼
Operational Execution
        │
        ├──────────────┐
        ▼              ▼
Operational Evidence   Economics / Economic Evidence
        │              │
        └──────┬───────┘
               ▼
Control Plane Hardening
```

## 6. Implementation guidance

- Keep all views and requests aligned to a single operational flow.
- Avoid duplicating backend logic in the UI.
- Preserve explicit loading, empty, error, pending, and recovery states.
- Keep evidence append-oriented and correlation-friendly.
