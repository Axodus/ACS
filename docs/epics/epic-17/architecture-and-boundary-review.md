# EPIC-17 Architecture & Boundary Review

**Status:** `COMPLETE / READY FOR REQ DECOMPOSITION`
**Authority:** documentation only
**Implementation changes:** none

## 1. Review result

The original Genome proposal is directionally compatible with ACS only when it
is treated as an extension of existing canonical boundaries. The current
repository already owns Agent identity and lineage, Workforce, runtime
admission and execution, Evidence, Cost, shared persistence, Product API and
Control Plane presentation. Those domains are inputs, not EPIC-17
implementation targets.

The review did not find a canonical Automation, Channel, durable Memory or
Genome-trait domain. It also did not find enough evidence to decide that any of
them requires an independent aggregate. These are `NEW` capability gaps whose
ownership and representation belong to later REQs.

The detailed disposition is in [Capability Inventory](capability-inventory.md).

## 2. Evidence baseline

The review inspected:

- Native Agent contracts and fingerprinted revisions in
  `src/native-core/agent.ts`;
- durable Agent and Workforce lineage in
  `src/control-plane/shared-state/native-core-durable.ts`;
- Workforce definitions and Run membership in `src/native-core/workforce.ts`
  and `src/native-core/workforce-run-membership.ts`;
- Run, Task, Assignment, Attempt and execution bindings in
  `src/native-core/runtime.ts`;
- runtime compilation and recovery in
  `src/native-core/runtime-compilation.ts` and
  `src/workers/durable-runtime-state.ts`;
- governed composition catalogs in
  `src/control-plane/composition-resources.ts`;
- model, credential and engine boundaries under `src/intelligence/` and
  `src/engines/`;
- Evidence and Cost contracts in `src/native-core/evidence.ts` and
  `src/native-core/accounting.ts`;
- Product API routes and projections in
  `src/http/routes/product-api-routes.ts` and
  `src/control-plane/product-api-client.ts`;
- the Control Plane shell under `.design/app-standalone/src/`;
- accepted ACS v2 Agent and Workforce architecture records.

## 3. Canonical ownership boundary

| Concern | Current canonical owner | EPIC-17 treatment |
| --- | --- | --- |
| Agent identity, lifecycle and revisions | Native Agent Core and shared Agent lineage | `REUSE`; presentation and behavior may reference or add to this lineage only through accepted REQs. |
| Workforce and admission | Workforce v1 and Workforce Run membership | `REUSE`; no incompatible change is permitted inside EPIC-17. |
| Execution | Workflow/Run/Task/Assignment/Attempt, runtime compilation and durable workers | `REUSE`; delegation and automation feed accepted admission boundaries. |
| Provider execution | AgentEngine, AgentRunner and replaceable adapters | `ADAPT`; providers never own canonical Agent or Automation state. |
| Evidence and provenance | Native Evidence contracts and durable event/audit boundaries | `REUSE`; add references only when a REQ proves a gap. |
| Usage, Cost and Economics | Native Cost plus existing EconomicService/shared economic state | `REUSE`; no Genome economic semantics. |
| Persistence and recovery | shared PostgreSQL, event/outbox, idempotency, leases and fencing | `REUSE`; no parallel store or recovery path. |
| Public application boundary | Product API and Control Plane | `EXTEND` candidate; later endpoints and screens remain additive and domain-driven. |
| Governance and Tenant scope | existing governance and Tenant administration | `REUSE`; lower layers cannot grant themselves authority. |

## 4. Automation and delegation

Automation remains distinct from execution:

```text
Automation domain
    -> Activation
    -> execution intent
    -> existing admission boundary
    -> Run / Workflow target
```

The repository has runtime eligibility, durable work, retry, recovery and
idempotency primitives, but no canonical Automation identity, trigger or
schedule contract. The review therefore classifies the domain as `NEW` while
reserving aggregate, identity, revision and persistence decisions for REQ work.

Delegation freezes only this semantic invariant:

```text
Agent A -> bounded delegation authority -> Agent B
Agent B = canonical ACS Agent
execution = existing Run / Task / Assignment machinery
```

The relationship representation and revision ownership remain open. A second
`SubAgent` identity is rejected.

## 5. Configuration and historical reconstruction

The current Native Agent revision already carries capability, skill, tool,
MCP, provider/model, policy, budget and Evidence references. Workforce members
add capability and authority constraints. Runtime bindings and execution
intents preserve exact Agent/Workforce revisions, policy snapshots and runtime
configuration.

The evidence does not support one universal override chain. The
[Configuration Precedence Matrix](precedence-matrix.md) records current
authority and future decisions separately for each class.

The frozen invariant is:

> Every execution has deterministic, historically reproducible effective
> configuration, and a lower layer cannot exceed authority granted by an upper
> layer.

## 6. Contradictions discovered

1. Native `AgentDefinitionV2`/`AgentRevisionV2` and the older Control Plane
   `AgentDefinition`/`AgentRevision` coexist. Native lineage is canonical for
   the accepted ACS v2 path, but compatibility projections remain. EPIC-17 must
   not add a third model; a REQ must state which existing seam it extends.
2. `AgentService` currently includes governed profile capability IDs in the
   effective capability set. The desired distinction between presentation and
   operational truth is therefore not already guaranteed. A REQ must resolve
   this without silently changing existing Agent behavior.
3. `RuntimeExecutionIntentV2.runtime_configuration` is a validated object but
   remains structurally untyped. It is evidence of a snapshot boundary, not
   proof that EPIC-17 configuration-resolution semantics are complete.
4. Memory appears as an Agent policy reference and Control Plane navigation
   concept, but no canonical memory policy/store aggregate is implemented.
5. Automation appears in policy/readiness surfaces as blocked, manual or
   disabled, but no first-class Automation domain was found.
6. Provider, tool, MCP and credential concepts exist, but a distinct Connector
   definition is not proven necessary or implemented.

These findings are REQ gates, not authority to change code.

## 7. Genome boundary

Genome compatibility means that future work can classify or reference
canonical, revisioned and provenance-bearing Agent state. It does not create
new operational truth.

```text
Trait != capability
Trait != permission
Trait != credential
Trait != reputation
Trait != economic right
Trait != NFT
```

No trait can authorize execution, broaden scope, reveal credentials, establish
reputation, transfer ownership or create economic rights.

## 8. Dependency graph

```text
canonical baseline and compatibility-seam decisions
    -> Agent presentation/persona ownership
    -> capability catalogs / models / settings / connections / memory
    -> delegation and automation semantics
    -> activation, runtime resolution and adapter boundaries
    -> historical reconstruction, Evidence and Cost correlation
    -> Genome-compatible trait classification
    -> cross-domain validation design
```

Catalog, connection and memory topics may be analyzed in parallel after the
canonical baseline is frozen. Delegation and Automation must wait for Agent,
authority and configuration-resolution decisions. Genome classification is
last because it references the accepted state produced by the earlier REQs.

## 9. Candidate REQ topics

The review recommends deriving REQs for these dependency groups without
freezing count or identifiers yet:

- canonical Agent compatibility seam and profile/persona ownership;
- Administration ownership, global settings and configuration precedence;
- models, skills, tools, capabilities and connector/connection/channel
  boundaries;
- Memory ownership, policy, retention, deletion and retrieval;
- delegation semantics and authority attenuation;
- Automation, activation, trigger and scheduling semantics;
- runtime resolution, OpenClaw adapter, recovery and historical snapshots;
- Product API and Control Plane projections;
- Evidence, Cost and Genome-trait compatibility;
- progressive and final validation.

## 10. Closure

Every capability family and original non-goal has a disposition. Ownership
boundaries, precedence gaps, contradictions and dependency ordering are
explicit. No code, public contract, database or migration change is included.

```text
EPIC-17 ARCHITECTURE & BOUNDARY REVIEW
COMPLETE / READY FOR REQ DECOMPOSITION

Implementation authority: NONE
CEO escalation: NONE
```
