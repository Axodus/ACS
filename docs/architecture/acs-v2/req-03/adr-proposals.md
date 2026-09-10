# REQ-03 Proposed ADRs

These ADRs are prepared for implementation review. They do not authorize
provider integration, production migration, authority expansion, or settlement.

## ADR-REQ03-001 — ACS owns canonical identity and revision lineage

**Status:** Proposed

**Decision:** Agent, Workforce, and Workflow identities are ACS-owned stable
identities with immutable revisions. External systems may contribute templates,
proposals, or observations but cannot become the source of canonical identity
or history.

**Consequences:** Every run stores exact revision references and fingerprints.
Adapters cannot mutate definitions in place. Revision repositories need durable
lineage and conflict tests.

## ADR-REQ03-002 — Run-scoped ExecutionBinding separates intent from resolution

**Status:** Proposed

**Decision:** Provider, model, credential mode, harness, executor, engine, and
target selection is resolved into an immutable run-scoped ExecutionBinding.
Agent revisions contain preferences and constraints only.

**Consequences:** Fallbacks and executor transfers produce replacement bindings
and new evidence. Credentials remain outside canonical definitions.

## ADR-REQ03-003 — Extend the current durable runtime instead of creating a second queue

**Status:** Proposed

**Decision:** Task attempts compile to the existing durable runtime assignment,
lease, fencing, worker, retry, cancellation, and recovery substrate. A new
TaskGraph layer may add dependencies and checkpoints, but not a parallel lease
authority.

**Consequences:** Runtime changes must preserve current durable behavior and
must be validated separately from `ACS-BLOCKER-014` diagnosis.

## ADR-REQ03-004 — ACS event/evidence ledger is authoritative

**Status:** Proposed

**Decision:** Every meaningful lifecycle, execution, governance, usage, cost,
artifact, approval, retry, and error change emits an ACS-native event. Provider,
executor, planner, and external traces are linked observations.

**Consequences:** Evidence can reconstruct runs, reporting can project from one
substrate, and external telemetry loss is explicit rather than silently treated
as absence of execution.

## ADR-REQ03-005 — Usage and Cost precede Pricing and Settlement

**Status:** Proposed

**Decision:** Normalize measurable resource usage and allocate ACS CostRecords
before pricing, `$Neurons` denomination, or settlement.

**Consequences:** Cost accounting can be tested with fake rates and incomplete
telemetry. Settlement remains a later authorization gate.

## ADR-REQ03-006 — Planner proposals are untrusted inputs

**Status:** Proposed

**Decision:** CAMEL or any future planner implements only `IPlanner` and emits a
typed proposal. ACS validates and commits graph amendments.

**Consequences:** Planner replacement does not change canonical Workflow or
Workforce semantics. No planner receives direct mutation authority.

## ADR-REQ03-007 — Adapter conformance is the integration gate

**Status:** Proposed

**Decision:** Codex, OpenClaw, direct-model, and future executors must pass one
ACS-owned conformance suite before any non-production adapter PoC is accepted.

**Consequences:** Adapter-specific features remain capability-dependent and do
not leak into the core contract. Real adapter work needs separate authorization.

## ADR-REQ03-008 — Product API remains the only product integration boundary

**Status:** Proposed

**Decision:** BBA, Trading, Academy, Business, Marketplace, and third-party
products use ACS-owned versioned API/event contracts. They do not call native
provider, executor, planner, or runtime administration interfaces.

**Consequences:** Product API v1 compatibility remains during additive v2
migration. Tenant/domain/authority enforcement stays in ACS.

## ADR-REQ03-009 — ACS-BLOCKER-014 is a separate validation workstream

**Status:** Proposed

**Decision:** REQ-03 proceeds as documentation and isolated contract planning.
Any runtime/public-export/rate-limit/production-target change must be scoped to
the blocker diagnosis and must not be smuggled into contract freeze.

**Consequences:** This package may say `CONDITIONAL GO` for contract-first work,
but cannot claim fresh full-suite health or unrestricted implementation
readiness.

## Decision record for REQ-03

The minimum shared contract surface is sufficiently coherent to begin Phase 1
implementation planning. Agent, Runtime, Event/Evidence, and Usage/Cost
semantics are frozen v1. Workforce and Product API remain partial until their
ACS-owned persistence and route/read-model boundaries are implemented and
validated. The implementation gate is therefore:

```text
CONDITIONAL GO
```

The condition is contract-first, non-production implementation with the Phase 0
baseline gate preserved and no provider/CAMEL/Agenta integration in this sprint.

