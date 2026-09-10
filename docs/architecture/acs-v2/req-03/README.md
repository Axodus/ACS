# ACS-V2-REQ-03 — Native Contracts Freeze and Dependency-Ordered Implementation Plan

**Status:** `ARCHITECTURE -> IMPLEMENTATION PLANNING / CONDITIONAL GO`
**Decision date:** 2026-09-10
**Baseline:** REQ-02 accepted; current ACS v2 documentation baseline from 2026-09-09
**Scope:** ACS-native contract definition, dependency analysis, state/event semantics, migration planning, test strategy, ADR preparation, and implementation sequencing.

This package freezes the smallest shared vocabulary that future ACS cores may
implement independently. It does not authorize provider integration, CAMEL
integration, Agenta code import, runtime replacement, production migration,
credential changes, autonomous-execution expansion, financial settlement,
trading, treasury, signatures, or on-chain writes.

## Governing interpretation

`FROZEN-v1` means that the semantic contract is stable enough for independent
implementation work. It does not mean that every implementation, persistence
adapter, route, provider, or executor already exists. `PARTIAL` means that the
semantic direction is clear but a required ACS-owned aggregate or boundary is
not yet sufficiently implemented or proven. `BLOCKED` means that work cannot
progress without resolving a named dependency or authority gate.

The following documents contain the deliverables:

| Deliverable | Location |
|---|---|
| Canonical domain model and contracts | [contracts.md](contracts.md) |
| Run/Task state machine and event model | [state-machine-and-events.md](state-machine-and-events.md) |
| Persistence, migration, dependency graph, backlog and testing | [implementation-plan.md](implementation-plan.md) |
| ADR proposals and decision records | [adr-proposals.md](adr-proposals.md) |

The parent architecture package remains the governing REQ-02 baseline:
[ACS v2 architecture](../README.md), [REQ-02 accepted baseline](../req-02/README.md),
and [unified core architecture](../req-02/unified-core-architecture.md).

## Baseline facts

- ACS owns canonical Agent, Workforce, Workflow, Runtime, Provider, Executor,
  Evidence, Usage, Cost, Governance, and Product API semantics.
- `AgentRevision` is immutable authored intent; run-scoped provider, model,
  credential, harness, executor, engine, and target choices belong in an
  `ExecutionBinding`.
- The current repository already contains Agent revision fingerprinting,
  provider/model discovery, runner and engine interfaces, Product API routing,
  tenant isolation, audit/telemetry, economic records, workers, leases and
  recovery-related runtime state.
- The current linear workflow and `runtime.start` substrate do not yet provide
  the full durable TaskGraph, WorkforceRunMembership, checkpoint, approval,
  join, compensation, or v2 execution API described here.
- `ACS-BLOCKER-014` remains `HIGH / OPEN`. The authoritative 2026-09-09 check
  recorded 680 tests, 673 passing, 5 failing, and 2 skipped. It blocks a fresh
  full-suite health claim and implementation-readiness evidence; it does not
  block this documentation package.

## Contract decision gate

| Contract family | Decision | Reason |
|---|---|---|
| Agent | `FROZEN-v1` | Existing revision/fingerprint model plus explicit run binding gives a stable provider-neutral semantic boundary. Durable lineage tests remain a Phase 1 gate. |
| Runtime | `FROZEN-v1` | Request/result/binding semantics preserve leases, fencing, idempotency, recovery and adapter neutrality. Full TaskGraph execution remains implementation work. |
| Workforce | `PARTIAL` | The aggregate and revision semantics are defined, but current ACS does not yet persist membership and coordination as a canonical runtime model. |
| Evidence | `FROZEN-v1` | ACS-owned append/correction evidence, correlation, provenance and external-observation rules are defined. |
| Usage and Cost | `FROZEN-v1` | Normalized measurement and hierarchical allocation are defined independently from pricing and settlement. |
| Product API | `PARTIAL` | Existing v1 routes and read models are preserved; the v2 asynchronous execution/approval/evidence surface is not implemented. |

## Implementation readiness

`CONDITIONAL GO` for contract-first implementation in isolated, non-production
workstreams after the Phase 0 gates in [implementation-plan.md](implementation-plan.md).

The first implementation work may define schemas, repositories, validators,
state transitions, event append/outbox behavior, and conformance fixtures. It
must not activate an external provider, import external runtime code, widen
authority, change credentials, or claim production readiness.

## Final decision gate

```text
Agent contracts: FROZEN-v1
Runtime contracts: FROZEN-v1
Workforce contracts: PARTIAL
Evidence contracts: FROZEN-v1
Cost contracts: FROZEN-v1
Product API contracts: PARTIAL

Implementation Phase 1:
  Shared primitives, immutable AgentRevision persistence, provider/model refs,
  policy snapshots, and schema/conformance fixtures.

Implementation Phase 2:
  ExecutionBinding admission, executor protocol, Run/Task/Attempt state,
  leases, fencing, idempotency, recovery, and resume.

Implementation Phase 3:
  ACS event/outbox, Evidence, Usage, Cost allocation, Workforce membership,
  Workflow graph, checkpoints, and Product API v2 projections in dependency order.

Parallel workstreams:
  Shared primitives; Agent Core; Runtime Core; Event/Evidence Core;
  Usage/Cost Core; Workforce/Workflow Core; Product API.

ACS-BLOCKER-014 impact:
  Documentation and isolated contract work are not blocked. Runtime mutation,
  fresh full-suite health claims, and implementation-readiness evidence remain
  partially blocked until the five failures are separately classified and the
  complete suite is rerun.

ADRs:
  ADR-REQ03-001 through ADR-REQ03-009 are proposed in adr-proposals.md.

Implementation readiness: CONDITIONAL GO
```
