# ACS v2 Discovery and Implementation Backlog

**Status:** `BACKLOG / NO IMPLEMENTATION AUTHORIZATION`

## Sequencing rule

Complete discovery and decision gates before adding dependencies or changing
runtime behavior. Parallel work is allowed only where it cannot pre-decide the
architecture.

## EPIC V2-0 — Baseline and coordination

Objective: establish the multi-domain documentation baseline.

- [x] Create ACS v2 discovery package.
- [x] Record canonical ACS terminology and legacy aliases.
- [x] Record ACS/Core/Governance/Documentation ownership boundaries.
- [x] Register the cross-nucleus planning track and handoff.
- [ ] Obtain human review of the architectural framing.

Acceptance:

- no runtime, dependency, schema, or maturity change;
- all new links resolve;
- production/execution gates remain unchanged.

## EPIC V2-1 — Current-state architecture audit

Objective: produce a requirement-to-evidence map for the real ACS codebase.

- [ ] Inventory every canonical entity and authoritative store.
- [ ] Reconcile early local agent/workflow primitives with EPIC-10+ services.
- [ ] Audit AgentsAI/OpenClaw source, runtime, memory, scheduler, tools, and
  recovery responsibilities.
- [ ] Map every EPIC-10 through EPIC-16/post-15.5 decision relevant to v2.
- [ ] Classify obsolete documents and supersession paths.
- [ ] Produce current architecture diagrams from observed code.

Acceptance:

- every v2 requirement is `IMPLEMENTED`, `PARTIAL`, `MISSING`, `BLOCKED`, or
  `OBSOLETE`, with evidence;
- no provider capability inferred from name or marketing.

## EPIC V2-2 — Canonical agent and workforce model

Objective: specify agent, workforce, workflow, task, handoff, checkpoint, and
approval semantics.

- [ ] Compare proposed fields with `unified-agent-model.ts`.
- [ ] Define Organization/domain isolation and shared-agent rules.
- [ ] Define revisioning, fingerprinting, supersession, and provider projection.
- [ ] Define DAG, parallel branch, join, retry, cancellation, compensation, and
  human approval semantics.
- [ ] Prepare proposed ADRs and compatibility notes.

Acceptance:

- no duplicate abstraction without a migration rationale;
- historical runs remain resolvable to exact definitions.

## EPIC V2-3 — Evidence, provenance, and knowledge contracts

Objective: extend existing audit/receipt foundations into complete workforce
lineage without moving knowledge authority into ACS.

- [ ] Define source and knowledge-reference contract.
- [ ] Define run/task/agent/provider/tool/artifact lineage.
- [ ] Define evidence completeness, redaction, retention, correction, and
  unavailable states.
- [ ] Map to Core receipts/telemetry and identify any additive shared semantics.
- [ ] Define provider trace ingestion without canonical-store delegation.

Acceptance:

- a reference run is reconstructable;
- sensitive payload handling is explicit;
- missing telemetry is visible rather than fabricated.

## EPIC V2-4 — Provider discovery and spikes

Objective: verify external provider fit through narrow reversible tests.

- [ ] Agenta API, export, edition/license, operations, and projection spike.
- [ ] Eigent headless/API, state, recovery, and workforce spike.
- [ ] Direct CAMEL comparison spike.
- [ ] Codex execution-provider adapter spike using current official interfaces.
- [ ] OpenClaw/AgentsAI incumbent capability and overlap audit.

Acceptance:

- exact version/commit/license/deployment topology recorded;
- no production data or credentials;
- provider-removal tests pass or failure is documented.

## EPIC V2-5 — BBA reference PoC

Objective: compare candidate architectures using one canonical workload.

Dependencies:

- BBA Agency confirms the role/workflow inventory and schemas;
- V2-2 and V2-3 contracts are review-ready;
- provider spikes have passed minimum security gates.

- [ ] Implement five representative slots in a non-production fixture.
- [ ] Exercise parallel research, deterministic join, planning, allocation,
  reviewer, and human approval.
- [ ] Inject retryable, terminal, timeout, cancellation, and missing-provider
  failures.
- [ ] Verify domain isolation and evidence reconstruction.
- [ ] Run Options A–D under equivalent conditions.

Acceptance:

- comparative evidence is repeatable;
- BBA does not claim active external publishing or production agents;
- no product-specific truth is reimplemented in ACS.

## EPIC V2-6 — Decision and migration authorization

Objective: produce the decision matrix, ADR disposition, and implementation
gate.

- [ ] Score Options A–D with evidence.
- [ ] Record Agenta/Eigent/CAMEL dispositions.
- [ ] Record Codex and OpenClaw roles.
- [ ] Complete architecture, security, operations, Core, Governance, and BBA
  reviews.
- [ ] Decide `GO`, `CONDITIONAL_GO`, or `NO_GO`.
- [ ] If authorized, issue a separately scoped adapter-first implementation
  request.

Acceptance:

- recommendation preserves ACS canonical ownership and provider independence;
- migration has rollback and compatibility gates;
- decision does not imply production authority.

## Explicitly blocked in this backlog

- installing provider stacks in production;
- migrating existing workflows;
- granting autonomous authority;
- production credentials or unrestricted tool access;
- trading, treasury, payments, settlement, payouts, wallet signing, and
  on-chain writes;
- changing global or nucleus maturity through documentation alone.
