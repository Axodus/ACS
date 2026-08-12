# EPIC-11 - ACS Agent Operations & Management Surface

## Final Closure Report

Status: CLOSED / ACCEPTANCE PASS WITH FORMAL CAVEATS

Sprint: S07 - EPIC-11 Closure, Readiness Report & Transition Planning

Branch: `dev`

Date: 2026-08-11

Report commit: `docs(epic-11): add final closure report`

## Mission

EPIC-11 built the first operational surface of the ACS Control Plane by exposing
the capabilities consolidated by EPIC-10 through the Product API in complete
operational flows: operation, observation, composition, execution, evidence,
operational economics and governance.

This sprint performs the formal closure of EPIC-11. It consolidates evidence,
commits, milestones, validations, caveats, deferred scope and the transition
recommendation for the next EPIC without adding new functional capabilities.

## Organizing Principle

The EPIC-11 surface follows the operational flow boundary
`Fluxo > Modulo > Tela` and consumes the control-plane capabilities exposed by
the Product API. EPIC-11 does not reimplement EPIC-10 domains. The resulting
surface is inspection-oriented, sandbox-oriented, Product API-driven, and
honest about unsupported actions and production readiness.

## Executive Summary

EPIC-11 delivered the first operational surface of the ACS Control Plane:

- a Product API with awareness, agent lifecycle, composition, execution,
  evidence and economics, and system/governance projections;
- a standalone control-plane app that consumes the Product API through
  inspection-oriented screens;
- explicit unsupported action handling that never simulates success;
- six milestone gates that all passed, with Milestone F passing with formal
  caveats;
- validation coverage across backend typecheck, backend tests, app typecheck,
  app lint, app build and app tests.

The final state remains a development and sandbox operational surface.
Production readiness, billing product readiness and administration console
readiness are all explicitly `NO`.

## Final Status

```text
EPIC-11 / Final Sprint
S07 - EPIC-11 Closure, Readiness Report & Transition Planning

Status: PASS
Commit: docs(epic-11): add final closure report
Push: completed
```

```text
EPIC-11 - ACS Agent Operations & Management Surface
Status: CLOSED / ACCEPTANCE PASS WITH FORMAL CAVEATS
```

## Milestones

### Milestone A - Operational Awareness: PASS

Goal: the user can understand the current ACS state before taking any mutating
action.

Main deliveries:

- control-plane shell connectivity;
- system dashboard;
- global readiness and health;
- readiness and blocker visibility.

Representative commits: `3db10ff`, `f8243bf`, `4a1303b`, `4c932c2`.

Validation: backend and app checks passed; readiness projections are
read-only and expose blockers without mutating state.

### Milestone B - Agent Lifecycle: PASS

Goal: the user can locate, inspect, create, edit and administer an Agent as a
governed operational entity.

Main deliveries:

- agent inventory and detail;
- governed agent create and edit;
- revision creation, adoption and restore;
- lifecycle, duplicate, archive, restore and protected delete operations;
- agent deploy as a governed execution action.

Representative commit: `55e143a`.

Validation: Product API contract tests exercise the lifecycle actions;
unsupported lifecycle paths return structured errors.

### Milestone C - Composition Surface: PASS

Goal: the user can compose an Agent correctly from governed resources.

Main deliveries:

- composition overview;
- role, profile and capability catalogs;
- skills, tools, plugins, engines, providers and models;
- agent composition, effective capability sources and compatibility.

Representative commit: `bd323e1`.

Validation: catalog and composition projections are read-only and validated
through the acceptance test path. Composition mutation attempts return
`unsupported_action`.

### Milestone D - Operational Execution: PASS

Goal: the user can transform composition into governed execution.

Main deliveries:

- targets, credentials and provider connections;
- agent readiness, deployment plans and execution plans;
- deployments, runtimes, execution runs, workers, workloads and runners;
- governed agent deploy and sandbox runtime start/stop.

Representative commits: `8efdee8`, `6e48a25`.

Validation: execution projections are covered by backend tests. Read-only
boundaries are explicit; unsupported execution mutations never simulate
success.

### Milestone E - Operational Evidence & Economics: PASS

Goal: the user can reconstruct what happened, why it happened and what it cost.

Main deliveries:

- events, logs, audit, diagnostics and evidence;
- readiness evidence;
- economic summary, quotes, reservations, metering, settlements and receipts;
- entity-scoped evidence, audit and economics projections.

Representative commit: `e076b15`.

Validation: evidence and economics projections pass the acceptance suite.
Economics remains operational metering and reservation visibility, not a
billing product.

### Milestone F - Control Plane Hardening & Acceptance: PASS with formal caveats

Goal: the surface becomes consistent, recoverable and ready for acceptance.

Main deliveries:

- system guardrails, configuration and policy visibility;
- administration and tenant boundaries;
- operational error handling and UX consistency;
- EPIC-11 acceptance projection exposed through the Product API.

Representative commit: `e66b3f4`.

Validation: backend typecheck, backend tests, app typecheck, app lint, app
build and app tests passed. Visual/browser verification remains a formal
caveat.

## Commits

The following EPIC-11 delivery commits were confirmed with
`git log --oneline --decorate -15`:

| Hash | Summary | Primary milestone |
| --- | --- | --- |
| `3db10ff` | feat(epic-11): establish control plane shell connectivity | A |
| `f8243bf` | feat(epic-11): add operational system dashboard | A |
| `4a1303b` | feat(epic-11): surface global readiness and health | A |
| `4c932c2` | feat(epic-11): complete operational awareness foundation | A |
| `55e143a` | feat(epic-11): add agent lifecycle operational surface | B |
| `bd323e1` | feat(epic-11): add composition operational surface | C |
| `8efdee8` | feat(epic-11): add operational execution product api projections | D |
| `6e48a25` | feat(epic-11): add governed execution operational surface | D |
| `e076b15` | feat(epic-11): add operational evidence and economics surface | E |
| `e66b3f4` | feat(epic-11): harden control plane operational surface | F |

The latest delivered commit is `e66b3f4` on `dev`; `origin/dev` matches this
commit before the closure report is added.

## Product API Surface Inventory

All Product API routes are under `GET /api/v1` unless another method is listed.

### Awareness

- `GET /health`;
- `GET /dashboard`;
- `GET /readiness`.

### Agent Lifecycle

- `GET /agents`, `POST /agents`;
- `GET /agents/:agentId`, `PATCH /agents/:agentId`, `DELETE /agents/:agentId`;
- `GET /agents/:agentId/revisions`, `POST /agents/:agentId/revisions`;
- `POST /agents/:agentId/revisions/:revisionId/adopt`;
- `POST /agents/:agentId/revisions/:revisionId/restore`;
- `GET /agents/:agentId/lifecycle`;
- `POST /agents/:agentId/duplicate`;
- `POST /agents/:agentId/archive`;
- `POST /agents/:agentId/restore`;
- `POST /agents/:agentId/deploy`.

### Composition

- `GET /composition`, `GET /composition/summary`;
- `GET /roles`, `GET /roles/:roleId`;
- `GET /profiles`, `GET /profiles/:profileId`;
- `GET /capabilities`, `GET /capabilities/:capabilityId`;
- `GET /skills`, `GET /skills/:skillId`;
- `GET /tools`, `GET /tools/:toolId`;
- `GET /plugins`, `GET /plugins/:pluginId`;
- `GET /plugin-packages`, `GET /package-sources`;
- `GET /engines`, `GET /engines/:engineId`;
- `GET /providers`, `GET /providers/:providerId`;
- `GET /models`;
- `GET /agents/:agentId/composition`;
- `GET /agents/:agentId/composition/capabilities`;
- `GET /agents/:agentId/composition/compatibility`.

### Operational Execution

- `GET /targets`;
- `GET /credentials`, `GET /credentials/:credentialId`;
- `GET /provider-connections`, `GET /provider-connections/:connectionId`;
- `GET /agents/:agentId/readiness`;
- `GET /agents/:agentId/deployment-plan`;
- `GET /agents/:agentId/execution-plan`;
- `GET /deployments`, `GET /deployments/:deploymentId`;
- `GET /runtimes`, `GET /runtimes/:runtimeId`;
- `POST /runtimes/:runtimeInstanceId/start`;
- `POST /runtimes/:runtimeInstanceId/stop`;
- `GET /execution-runs`, `GET /execution-runs/:runId`;
- `GET /agents/:agentId/execution-runs`;
- `GET /workers`, `GET /workers/:workerId`;
- `GET /workers/:workerId/workloads`;
- `GET /runners`.

### Evidence & Economics

- `GET /events`, `GET /events/:eventId`;
- `GET /logs`, `GET /logs/:logId`;
- `GET /audit`, `GET /audit/:auditId`;
- `GET /evidence`, `GET /evidence/:evidenceId`;
- `GET /diagnostics`, `GET /diagnostics/:diagnosticId`;
- `GET /readiness/evidence`;
- `GET /economics`, `GET /economics/summary`;
- `GET /economics/quotes`, `GET /economics/quotes/:quoteId`;
- `GET /economics/reservations`, `GET /economics/reservations/:reservationId`;
- `GET /economics/metering`, `GET /economics/metering/:meterId`;
- `GET /economics/settlements`, `GET /economics/settlements/:settlementId`;
- `GET /economics/receipts`, `GET /economics/receipts/:receiptId`;
- `GET /economics/audit`;
- entity-scoped events, audit, evidence and economics projections for agents,
  deployments, runtimes, workers and execution runs.

### System / Acceptance

- `GET /system/guardrails`;
- `GET /system/configuration`;
- `GET /system/policies`;
- `GET /system/administration`;
- `GET /system/tenants`;
- `GET /system/acceptance`.

### Unsupported Actions

Unsupported or governed mutation paths return structured
`unsupported_action` or `method_not_allowed` responses with guidance and
guardrail metadata. They never simulate success. This includes read-only
composition mutations, unsupported execution mutations, runtime control paths
outside the supported sandbox actions, and economic mutations such as quote,
reserve, cancel and settle.

## App Standalone Surface Inventory

The standalone app lives at `.design/app-standalone` and uses the Product API
as its source of truth. The delivered routes are:

- `/` - Control Plane shell and System Dashboard;
- `/readiness` - Global Readiness;
- `/agents` - Agents inventory;
- `/agents/new` - Agent create;
- `/agents/:agentId/edit` - Agent edit;
- `/agents/:agentId` - Agent detail;
- `/agents/:agentId/composition` - Agent composition;
- `/composition` - Composition overview;
- `/roles`, `/profiles`, `/capabilities`, `/skills` - catalogs;
- `/plugins`, `/tools/:toolId`, `/plugins/:pluginId` - Tools and Plugins;
- `/engines`, `/engines/:engineId`, `/providers/:providerId` - Engines and
  Providers;
- `/operational-execution` - Operational Execution overview;
- `/runtime` - Runtimes;
- `/memory` - Memory surface;
- `/logs` - Logs;
- `/operational-evidence` - Operational Evidence;
- `/audit` - Audit;
- `/economics` - Economics;
- `/system` - Governance and System;
- `/settings` - Settings.

The UI posture is:

```text
inspection-oriented
sandbox/dev-oriented
Product API-driven
not production-claimed
not billing product
not administration console
```

## Validation Summary

Validation was executed with Node `v24.15.0` and npm `11.12.1`.

### Backend

- `npx tsc --noEmit`: PASS;
- `npm run build`: PASS;
- `node --test tests/*.test.mjs`: PASS, 62/62 tests.

### App Standalone

Run from `.design/app-standalone`:

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS, Vite production build;
- `npm test`: PASS, 1/1 smoke test.

### Git and Scope

- `git diff --check`: PASS, no whitespace errors;
- `git diff --stat ./static`: no changes, `./static` untouched;
- `git status --short`: clean before the closure report, report file only
  after;
- `git log --oneline -10`: confirms `e66b3f4` as the latest delivered EPIC-11
  commit;
- no secrets are introduced by this report or by the closure surface;
- no production-ready claim is introduced;
- no billing product claim is introduced;
- unsupported action boundaries remain explicit.

## Caveats & Residual Risk Register

### Visual/browser verification

- Caveat: no complete browser harness was executed;
- status: non-blocking;
- recommendation: create a visual/browser acceptance harness in a later EPIC.

### Distributed Operations E2E

- Caveat: distributed E2E depends on real multi-agent/worker data;
- status: non-blocking;
- current behavior: unsupported/unavailable is reported honestly where real
  data does not exist.

### Production readiness

- Caveat: Production Ready remains `NO`;
- status: expected;
- origin: EPIC-10 already declared blockers for production readiness.

### UX maturity

- Caveat: the UI is functional and hardened, but it is not yet a final visual
  product;
- status: acceptable for the first operational surface;
- recommendation: UX polish in a later EPIC.

### Codex/Git environment

- Caveat: earlier noise involved `.git/index.lock` and read-only environment
  behavior;
- status: resolved/workaround completed;
- confirmation: EPIC-11 commits exist on `dev` and `origin/dev` is current.

## Out of Scope

This sprint did not:

- add new functional capabilities;
- create new mutations;
- alter EPIC-10 domains;
- refactor large surfaces;
- introduce a new design system;
- change `./static`;
- resolve production readiness;
- resolve the browser harness;
- resolve full tenant or administration support;
- expand Economics into billing.

## Recommended EPIC-12 Scope

### Production Readiness

- authentication;
- RBAC and permissioning;
- persistent production storage;
- production secrets;
- production observability;
- production deployment target.

### UX / Productization

- browser visual harness;
- accessibility pass;
- responsive QA formal;
- navigation polish;
- information architecture refinement;
- guided flows.

### Advanced Operations

- real worker fleet management;
- worker autoscaling;
- advanced scheduling;
- runtime recovery automation;
- multi-worker real E2E.

### Advanced Observability

- distributed tracing;
- log retention;
- alerting;
- SLO/SLA;
- incident workflow.

### Advanced Economics

- billing;
- invoices;
- budgets;
- pricing configuration;
- tenant billing;
- forecasting.

### Administration / Tenants

- complete tenant management;
- tenant policies;
- user and admin roles;
- configuration mutation;
- governance console.

## Final EPIC-11 Readiness Statement

```text
DEV Operational Surface Ready: YES
Sandbox Control Plane Operational Surface Ready: YES
Distributed Runtime Operational Visibility: PARTIAL / YES, where data exists
Production Ready: NO
Billing Product Ready: NO
Administration Console Ready: NO
```

This formulation is intentional. EPIC-11 is ready as a development and sandbox
operational surface. It is not a production-ready control plane, a billing
product, or an administration console.

## Conclusion

EPIC-11 fulfilled its mission as the first operational surface of the ACS
Control Plane. Milestones A through F are recorded as PASS, with Milestone F
closing as PASS with formal caveats. The Product API and app surfaces are
inventoried, final validations pass, the worktree is limited to this closure
report, and the recommended EPIC-12 scope is explicitly deferred without
overstating readiness.

The EPIC-11 acceptance status is:

```text
EPIC-11 - ACS Agent Operations & Management Surface
Status: CLOSED / ACCEPTANCE PASS WITH FORMAL CAVEATS
```
