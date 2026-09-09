# ACS v2 Current-State Audit

**Audit date:** 2026-09-09  
**Repository baseline:** `5212e3a83276e26ce81e9428a1732e4c43a36cb6`  
**Audit type:** repository/documentation discovery  
**Runtime mutation:** none

## Executive finding

ACS is no longer accurately described as only an OpenClaw-centric assistant or
as the small deterministic runtime recorded in the June 2026 status baseline.
The current repository contains a substantial control-plane architecture with
agent revisions, composition, engine adapters, execution targets, runners,
providers, credentials, tenant-scoped authority, audit evidence, durable state,
HTTP surfaces, workers, operational readiness, and economic operations.

The ACS v2 request therefore represents an architectural consolidation and
multi-agent expansion over an existing platform, not a greenfield rewrite.

## Observed implementation baseline

| Concern | Evidence in the current repository | Interpretation |
| --- | --- | --- |
| Agent identity | `src/control-plane/unified-agent-model.ts` | `AgentDefinition`, immutable `AgentRevision`, composition fingerprint, deployment, runtime, and run identities already exist. |
| Agent registry/state | `src/control-plane/agent-service.ts`, `durable-agent-state.ts`, `agents.ts` | There are both early local-registry primitives and later control-plane services; v2 must reconcile rather than duplicate them. |
| Workflow model | `src/workflows/`, `src/orchestrator.ts` | Named/versioned local workflows and deterministic step sequencing exist, but a canonical workforce/DAG model is not yet defined. |
| Execution abstraction | `src/engines/agent-engine.ts`, `src/intelligence/agent-runner.ts` | Engine, runner, provider, credential, and execution-target roles are already separated. |
| OpenClaw | `src/openclaw.ts`, `src/engines/openclaw-engine-adapter.ts`, `engines/agentsai` | OpenClaw discovery and execution are already placed behind ACS-owned code and a pinned AgentsAI submodule. |
| Codex | runner references in EPIC-10 architecture; no canonical production adapter found in the inspected public export surface | Codex is an intended runner/provider capability, but its exact v2 adapter and evidence contract require discovery. |
| Governance | policy evaluation, tenant governance, entitlement/limit and boundary services | ACS already models bounded authority, but must remain subordinate to Governance and explicit human approval. |
| Evidence | `audit-service.ts`, `operational-evidence-service.ts`, receipts and telemetry services | Correlation and redacted audit records exist; the full provider-neutral institutional lineage requested for v2 is not yet expressed as one canonical contract. |
| Persistence | durable control-plane state and shared PostgreSQL adapters | The current platform includes more than in-memory/JSONL state, but authoritative-store coverage must be mapped per entity. |
| Runtime topology | EPIC-10 through EPIC-16 and post-15.5 packages | Local, development, production-candidate, shared-state, and multi-host concerns are documented; their current certification states must not be flattened. |
| Organization isolation | tenant-scoped types and services | Technical contracts retain tenant terminology. User-facing wording should use Organization without breaking backend compatibility. |

## Current OpenClaw role

The repository already rejects the idea that OpenClaw should own the ACS
domain:

- `AgentEngine` is the stable ACS-facing contract;
- `OpenClawEngineAdapter` maps OpenClaw/AgentsAI protocol results to ACS-native
  outcomes;
- source, runtime, state, configuration, artifacts, and per-run workspace roots
  are separated;
- runtime materialization is not the canonical agent definition;
- OpenClaw discovery does not by itself grant authority;
- the pinned `engines/agentsai` submodule preserves independent provenance.

ACS v2 should retain OpenClaw as a candidate persistent operational execution
provider where its behavior is supported by evidence. It should not demote a
working adapter merely because another orchestrator is being evaluated.

## Current orchestration limitations

The early `AcsOrchestrator` provides deterministic sequential execution and
provider capability matching. Later control-plane modules add planning,
workers, targets, runtime lifecycle, durability, and operational surfaces.

The inspected code does not yet establish one canonical model for:

- a stable workforce identity distinct from an agent;
- reusable workforce revisions;
- DAG branches, joins, and dependency semantics;
- task-level handoff envelopes between heterogeneous providers;
- orchestration-engine leases and replay across Eigent/CAMEL or alternatives;
- a single provider-neutral retry, compensation, and partial-failure model;
- product-domain knowledge isolation at workforce level;
- reconstruction of an entire multi-agent decision from one lineage graph.

These are discovery gaps, not proof that the capabilities are absent from every
submodule or external provider.

## Documentation drift found

1. Core public documentation expands ACS as **Access Control System**.
2. ACS local instructions expand it as **Autonomous Coordination System**.
3. The current architecture direction uses **Agent Coordination System**.
4. June 2026 ACS status/roadmap material predates the extensive EPIC-10 through
   EPIC-16 work visible in the repository.
5. Some historical architecture text says no real provider execution exists,
   while later EPIC documents describe development and production-eligible
   paths. Those later claims must be evaluated against current acceptance
   evidence rather than merged into one blanket readiness claim.
6. BBA Agency confirms an AI Workforce concept, but the precise claim of
   14–16 implemented or finalized agents was not verified in the inspected BBA
   documentation. It remains a planning input until BBA confirms the canonical
   workload inventory.

## Security and authority baseline

ACS v2 must preserve:

- explicit actor, Organization/tenant, domain, capability, tool, and provider
  scope;
- default-deny action evaluation;
- approval before high-impact execution;
- credential references instead of secret values;
- execution isolation and bounded filesystem/network access;
- prompt-injection and cross-domain context controls;
- immutable or append-oriented evidence with corrections through lineage;
- fail-closed behavior when authority, leases, policy, or dependencies expire;
- Governance and human accountability above orchestration and execution.

## Facts, hypotheses, and decisions

### Verified local facts

- ACS has a TypeScript control plane with exported agent, engine, runner,
  provider, target, audit, workflow, worker, and tenant/Organization concepts.
- OpenClaw is already behind ACS-owned adapters and a pinned AgentsAI
  dependency.
- Core already exposes shared receipt, telemetry, capability, condition,
  registry, and execution semantics without implementing ACS runtime.

### Architectural hypotheses

- Agenta may be useful as an operational agent-management, evaluation, and
  tracing workspace.
- Eigent may be useful as a workforce-orchestration provider over CAMEL.
- BBA Agency may be an appropriate reference workload for a five-agent PoC.
- Existing ACS contracts may require only additive workforce/orchestrator
  interfaces rather than replacement.

### Decisions made by this package

- ACS v2 is an evolutionary discovery track.
- Provider adoption is not decided.
- Canonical agent/workflow/evidence ownership remains in ACS.
- Governance authority remains outside and above provider execution.

## Request traceability

This table keeps the planning request tied to observable evidence and makes the
remaining work explicit. A `gap` is not proof that a capability is absent; it
means the current discovery record does not yet establish the required
provider-neutral or cross-nucleus evidence.

| Request area | Current evidence or status | Gap / next evidence | Primary owner | Acceptance signal |
| --- | --- | --- | --- | --- |
| Current ACS and OpenClaw audit | `AgentDefinition`, revisions, engines, runners, OpenClaw adapter, durable state, and evidence services are present in the ACS repository. | Audit the pinned AgentsAI/OpenClaw surface, runtime state, scheduling, recovery, tools, and credential boundaries. | ACS | Path-level audit with version/commit and unsupported-case record. |
| Canonical agent model | Current definition/revision lifecycle exists. | Reconcile additive v2 fields, Organization/domain isolation, and provider projections without duplicate registries. | ACS, reviewed by Core | Proposed contract maps each field to an existing source or an explicit gap. |
| Workforce and workflow model | Named/versioned workflows and deterministic sequencing exist. | Establish revisioned workforce identity, DAG, handoff, retry, checkpoint, and compensation semantics. | ACS | Provider-neutral contract plus reference workload acceptance probes. |
| Evidence and provenance | Audit, receipt, telemetry, and operational-evidence services exist. | Define one canonical lineage model across workflow, task, agent, provider, artifacts, approvals, and failures. | ACS, reviewed by Core and Governance | Completeness policy and reconstruction test plan. |
| Governance and authority | Existing tenant governance and policy boundaries are present. | Confirm how mandates, approvals, budgets, and human interruption bind to v2 execution plans. | Governance, consumed by ACS | Cross-nucleus review identifies no implicit provider authority. |
| Agenta | Candidate only; no ACS integration is established. | API/export, license, self-hosting, isolation, projection, and trace portability evaluation. | ACS | Reversible spike report or `DEFER`/`REJECT` decision. |
| Eigent and CAMEL | Candidate orchestration approaches only; no ACS integration is established. | Headless/API, state, recovery, isolation, evidence, and provider-removal evaluation. | ACS | Equivalent reference-workload evidence and scored decision matrix. |
| Codex | Candidate bounded cognitive/engineering execution provider only. | Official-interface review and a scoped adapter/evidence design, if separately authorized. | ACS | No direct authority; provider adapter proposal or `DEFER`. |
| BBA reference workload | A conceptual comparison workload is documented. | BBA must confirm roles, scope, data classification, and non-production constraints. | BBA-Agency, consumed by ACS | Written workload contract; no claim of active autonomous agents or external connectors. |
- No runtime or maturity state is changed.

## Required follow-up audit

Before an implementation recommendation, the discovery cycle must produce a
traceability table from every v2 requirement to:

1. implemented ACS code;
2. existing EPIC documentation and validation evidence;
3. missing ACS contract;
4. external provider capability, exact version/commit, and license;
5. owner and acceptance test.
