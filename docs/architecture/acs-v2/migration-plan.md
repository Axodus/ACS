# ACS v2 Evolution and Migration Plan

**Status:** `PROPOSED / PLANNING ONLY`

## Migration principle

```text
Current ACS
  -> audit and reconcile current contracts
  -> add canonical workforce/orchestrator semantics
  -> project to candidate providers through adapters
  -> run the same bounded PoC across options
  -> select with evidence
  -> migrate workflows incrementally
  -> retire legacy paths only after parity and rollback proof
```

No phase authorizes a big-bang rewrite.

## Phase 0 — Documentation and vocabulary baseline

Outcomes:

- adopt Agent Coordination System as the canonical expansion;
- identify Access Control System and Autonomous Coordination System as legacy
  aliases;
- preserve technical tenant identifiers while using Organization on surfaces;
- map ACS, Core, Governance, Documentation, and product ownership;
- register the discovery track without changing maturity.

Exit criteria:

- documentation links validate;
- no runtime/code behavior changes;
- Core and global coordination records acknowledge the boundary.

## Phase 1 — Full current-state traceability audit

Actions:

- map every v2 requirement to current code and EPIC evidence;
- audit the AgentsAI/OpenClaw submodule and runtime responsibilities;
- inventory agent, workflow, provider, runner, target, credential, knowledge,
  audit, receipt, and worker persistence;
- reconcile early local primitives with later control-plane services;
- classify implemented, partial, proposed, blocked, and obsolete paths;
- obtain BBA Agency's canonical reference-workforce definition.

Exit criteria:

- no unresolved duplicate domain owner;
- authoritative store and lifecycle identified for every canonical entity;
- known documentation drift recorded.

## Phase 2 — Contract and ADR proposals

Actions:

- define additive agent-domain fields;
- define WorkforceDefinition, WorkflowDefinition, Task, Handoff, Checkpoint, and
  Evidence lineage semantics;
- decide whether `IOrchestrator` and `IKnowledgeProvider` are new interfaces or
  documentation-level compositions of existing services;
- define provider projection and provider-removal contracts;
- prepare ADRs as `Proposed`, not accepted.

Exit criteria:

- Core compatibility impact classified;
- no duplicate `AgentEngine`/`AgentRunner` abstraction introduced without
  rationale;
- migration and public API impact documented.

## Phase 3 — Provider spikes

Run independent, disposable spikes:

### Agenta spike

- project one ACS agent revision;
- run a configuration/evaluation cycle;
- export results and link them into ACS evidence;
- verify no canonical drift and no required commercial-only dependency that
  has not been approved.

### Eigent/CAMEL spike

- execute the five-slot BBA reference workflow;
- test parallel branches, join, retry, cancellation, human approval, context
  isolation, and event export;
- compare Eigent with direct CAMEL where feasible.

### Codex adapter spike

- execute one bounded engineering task through an ACS task envelope;
- constrain repository root, tools, network, timeout, and approval;
- capture artifacts and verifiable validation output.

No spike may use production credentials, customer data, unrestricted tools, or
execution-sensitive Axodus domains.

## Phase 4 — Comparative PoC and decision

Use identical inputs, policies, failure injection, and evidence requirements
for Options A–D. Score the decision matrix and run provider-removal tests.

Exit criteria:

- exact versions/commits and licenses recorded;
- repeatable results and failure evidence available;
- security and operations review complete;
- recommendation records tradeoffs and rejected alternatives;
- implementation readiness explicitly decided.

## Phase 5 — Adapter-first implementation

Only after `GO` or `CONDITIONAL_GO`:

- introduce approved ACS-owned contracts;
- implement one provider adapter at a time;
- place changes behind feature/configuration gates;
- preserve existing OpenClaw path as rollback until parity is demonstrated;
- migrate one non-sensitive workflow first;
- retain old evidence and revision references.

## Phase 6 — Incremental product adoption

Candidate sequence:

1. BBA Agency reference workflow in a non-production environment;
2. shared documentation/research workflows;
3. other non-execution-sensitive product workforces;
4. execution-sensitive products only through separate governance/security
   requests.

Each product remains responsible for domain truth, acceptance criteria, and
public claims.

## Rollback and compatibility

- provider projection is rebuildable from canonical ACS records;
- old workflow revisions remain readable;
- in-flight runs use pinned provider and contract revisions;
- failed migration produces an explicit terminal or resumable state;
- provider removal does not delete ACS evidence;
- no existing API/schema is renamed without versioning and migration metadata;
- tenant wire identifiers remain compatible during the Organization surface
  terminology transition.

## Migration blockers

- unresolved current-state duplication or authoritative-store ambiguity;
- missing BBA workload confirmation;
- no stable headless/API path for a candidate provider;
- inability to export state/evidence;
- provider-removal test failure;
- cross-domain context leakage;
- license/edition mismatch;
- absent security review;
- any implied Governance or execution-authority expansion.
