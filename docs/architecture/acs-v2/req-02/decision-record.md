# ACS-V2-REQ-02 Decision Record

**Decision date:** 2026-09-10
**Decision:** `CONDITIONAL GO FOR FUTURE CONTRACT-FIRST WORK AFTER SEPARATE AUTHORIZATION`
**Scope:** architecture convergence, canonical contracts, ADR proposals and planning; this record does not authorize implementation or PoCs

## Architecture

Adopt an ACS-native core that retains current ACS control-plane, runtime, governance, evidence and economic foundations. Add revisioned Workforce and Workflow aggregates, a canonical task graph, a common execution protocol, provider-neutral harness/executor adapters, source-qualified evidence lineage with explicit gaps, normalized cost accounting and a separated Neurons economic layer.

## Source strategies

| Core | Recommendation |
|---|---|
| ACS Agent Core | **Agenta: ADAPT** selected definition, revision, resource compilation, connection resolution and harness-capability patterns. **ADOPT** existing ACS identity, revision, repository, governance and economic foundations; independently author missing fields and adapters without importing external authority. |
| ACS Workforce Core | **Eigent: REJECT** as long-term runtime dependency. **CAMEL: ADAPT** only as a removable planner/graph-proposal adapter in a separately authorized PoC, then **REIMPLEMENT** durable ACS semantics. |
| ACS Workflow Core | **ADAPT** current deterministic ACS workflows; **REIMPLEMENT** revisioned graph, dynamic amendments, handoffs, approvals and checkpoints. |
| ACS Runtime Core | **ADOPT** existing durable `runtime.start` jobs, workers, assignments, leases, fencing, cancellation and recovery as the substrate; **REIMPLEMENT** task-graph workload and state semantics. |
| ACS Provider Core | **ADOPT** current ACS model/provider/credential resolution and extend conformance/cost metadata. |
| ACS Executor Core | **ADOPT** ACS engine/runner/target boundaries; **ADAPT** Codex, OpenClaw, Direct Model and future executors. |
| ACS Integration Core | **ADOPT** the Product API and existing async jobs; **REIMPLEMENT** proposed SDK, versioned event, streaming and webhook extensions through that boundary. |
| ACS Evidence Core | **ADOPT + EXTEND** current audit/evidence/correlation into a proposed append/correction-oriented canonical lineage ledger; current evidence views are not that ledger. |
| ACS Reporting Core | **ADOPT** current ACS read projections; **REIMPLEMENT** new views over the proposed canonical ledger and authoritative stores. |
| ACS Cost Core | **ADAPT + REIMPLEMENT** normalized attribution over current usage/economic primitives. |
| ACS Economic Core | **ADOPT** guarded Neurons amount/quote/reserve/usage/receipt foundation; keep settlement execution outside this sprint. |

## Eigent dependency decision

The recommended long-term architecture is neither `ACS -> Eigent -> CAMEL` nor a CAMEL-owned system of record. It is:

```text
ACS Workforce/Workflow Core
  -> optional CAMEL planner/graph-proposal adapter
  -> ACS validation and persisted TaskGraph
  -> existing ACS durable Runtime Core
```

The adapter must be removable without losing definitions, checkpoints, evidence, cost data or resumability. CAMEL emits a scoped, serializable proposal; it does not dispatch work, own task channels/worker pools, resolve resources or credentials, retain checkpoint truth, or commit graph changes.

Eigent is rejected as a permanent dependency for architectural reasons, not only because ACS has a different product direction. The audit found that its workforce behavior is coupled to a desktop-owned application/runtime boundary, application-specific persistence and UI/controller lifecycle, while its CAMEL integration reaches into process-local channels, snapshots and private implementation details. Those mechanisms do not provide ACS with durable cross-product dispatch, restart recovery, domain isolation, canonical evidence or cost ownership. Keeping Eigent in the runtime path would duplicate ACS control-plane and runtime responsibilities and make removal of the desktop application part of ACS correctness. ACS therefore retains the workforce concepts that are useful and reimplements the authoritative contracts inside ACS.

## Ownership boundaries

The target boundary is:

```text
ACS Control Plane
  ├─ Agent Core: ACS identity, revisions, resources, governance and policy
  ├─ Workforce/Workflow Core: roster, graph, task state, coordination and recovery
  ├─ Evidence/Reporting/Cost Core: canonical facts, projections and attribution
  └─ Runtime Core: admission, durable jobs, leases, fencing and routing
       ├─ Agenta-derived primitives: authored-template and resource-resolution patterns
       ├─ optional CAMEL adapter: untrusted planner/graph proposal only
       ├─ Codex adapter: bounded engineering execution only
       └─ OpenClaw adapter: persistent operational execution only
```

Agenta-derived primitives cannot own ACS identity, governance, persistence or history. The CAMEL adapter cannot own dispatch, workers, queues, retries, checkpoints or graph commits. Codex and OpenClaw cannot own canonical Agent definitions, Workforce/Workflow state, evidence, cost attribution or settlement. Every external capability is replaceable behind an ACS-owned contract.

## Reuse and fork boundary

The roadmap distinguishes conceptual adaptation from exact source reuse:

| Reuse mode | ACS rule |
|---|---|
| Conceptual adaptation | Default path. Reimplement the useful semantics in ACS-owned contracts, preserving ACS naming, identity, governance, persistence and evidence. |
| Selective reusable code | Allowed only after a pinned revision, exact-file provenance, license/NOTICE review, SBOM, dependency review and provider-removal test. The code remains behind an ACS adapter and cannot become canonical authority. |
| Fork disguised as integration | Prohibited. Do not copy an Agenta application/runtime, SaaS/workspace model, internal API or persistence model into ACS and call it an adapter. A candidate module must be independently removable without loss of ACS truth. |

Phase 1 freezes ACS contracts before Phase 5 evaluates candidate adapters. Phase 5 is a separately authorized compatibility exercise; it is not permission to merge an external source tree or create a permanent Agenta, Eigent or CAMEL runtime dependency.

## Migration strategy

Use additive schemas and compatibility adapters. Current durable `RuntimeJob` supports `runtime.start`; a task workload/schema and state-machine compatibility design is required before graph compilation. Preserve existing Agent revisions, Product API behavior, engine/runner/provider/target/worker distinctions and OpenClaw adapter behavior. Do not create a second queue, worker registry, evidence store, tenant model, governance engine or economic ledger.

## Decision conditions

This discovery record does not authorize implementation or PoCs. A future separately authorized implementation can begin only in contract-first, isolated units. Before source import or provider-dependent PoCs:

1. characterize or close `ACS-BLOCKER-014` for the relevant validation gate;
2. pin clean external source revisions;
3. resolve ACS and AgentsAI/OpenClaw licensing/provenance, including the gitlink/manifest revision mismatch;
4. produce exact-file SBOM and notice inventories for copied code;
5. approve the Agent/Workforce/Workflow and Provider/Model/Harness/Executor ADRs;
6. implement proposed evidence/cost identities and incomplete/lost/unavailable states before dynamic orchestration;
7. prove provider removal, domain isolation, restart recovery, evidence completeness and the runtime task-workload compatibility model.

## Readiness classification

- **REQ-02:** **ACCEPT**.
- **Architecture direction:** **GO** for the ACS v2 architecture baseline.
- **Provider integration:** **NO-GO** without separate authorization, including Codex, OpenClaw, direct-model and external provider integration.
- **Next phase:** freeze ACS-native contracts and execute the dependency-ordered implementation plan in the unified blueprint.
- **GO in this completed sprint:** documentation, audit, ADR proposals, schema designs and compatibility analysis only.
- **CONDITIONAL GO after separate authorization:** contract-first ACS v2 implementation and individually gated disposable PoCs following the dependency order in the blueprint.
- **NO-GO:** production migration, runtime replacement, permanent Eigent dependency, uncontrolled CAMEL state ownership, direct external code merge, credential changes, financial operations, trading/treasury/payment/signature/on-chain execution, or Neurons settlement activation. No Agenta, Eigent or CAMEL source import is approved by this decision.
