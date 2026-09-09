# ACS v2 Provider Integration Analysis

**Status:** `INITIAL EVIDENCE / DISCOVERY INCOMPLETE`  
**Research date:** 2026-09-09

## Evidence rules

- External capabilities are recorded only when supported by official project
  documentation or source repositories.
- Marketing descriptions are not treated as proof of API fit, isolation,
  determinism, or production readiness.
- Exact release/tag selection, dependency security, deployment requirements,
  data egress, API stability, and integration tests remain required before PoC.
- No external provider is adopted by this document.

## Research snapshot boundary

This is a dated discovery snapshot, not a provider certification. The source
revisions recorded below identify the materials inspected for this planning
cycle. Each selected version, edition, license, deployment mode, API/export
surface, and data-handling posture must be revalidated when a separately
authorized PoC is opened. A capability described by a provider does not prove
an ACS integration, grant authority, or establish a production capability.

## Agenta

### Evidence observed

Repository documentation at commit
`204703fc24ff52993be317c7a83e2bd755051d35` describes an open-core platform.
The MIT-licensed open-source edition lists prompt management, observability and
tracing, automatic and human evaluation, agents, an agent runner, sandboxed
execution, custom workflows, API/SDK access, provider-key management,
organizations/workspaces, and built-in RBAC. The same documentation states
that enterprise audit logs, organization-managed SSO, and custom roles are
commercial features.

Self-hosting material shows a non-trivial service topology including API, web,
runner, workers, queues, tracing, evaluations, cron, PostgreSQL, Redis, and
authentication components. This supports feasibility for self-hosted
evaluation, but also indicates meaningful operational complexity.

### Potential ACS role

- operational editing/projection of agent configurations;
- prompt and configuration evaluation;
- tracing ingestion and evaluation workflows;
- team-facing experiment and review workspace.

### Must remain ACS-owned

- canonical Axodus agent ID/revision and domain ownership;
- governance mandate and authority;
- canonical workforce/workflow definitions;
- institutional audit history and evidence lineage;
- product/domain knowledge source of truth.

### Unresolved questions

- Is there a stable API/export path for every agent property ACS needs?
- Can ACS create deterministic projections without provider-side drift?
- Which audit and governance features require the commercial edition?
- Can traces be exported and linked without making Agenta the canonical store?
- What is the upgrade and schema-migration burden for self-hosting?
- Does its runner overlap unnecessarily with existing ACS engine/runner layers?
- Does the selected Agenta version and edition expose a supported Codex-harness
  integration, and can its traces be exported into ACS evidence without making
  Agenta canonical? This record treats no harness feature as an ACS integration.

### Initial disposition

`POC CANDIDATE`, limited to agent configuration/evaluation projection after API,
license, export, security, and operational-cost review.

## Eigent

### Evidence observed

Repository documentation at commit
`6bb55842f73766f7b219aa5ef5bcf5965f3acdaa` describes Eigent as an open-source,
locally deployable desktop application built on CAMEL, with multi-agent
workforces, parallel execution, model-agnostic operation, MCP/skill
integration, browser/terminal tools, automation, and single-agent operation.
The selected source's license and any distribution or usage terms must be
rechecked at the exact version chosen for a PoC. This planning package makes no
license approval or legal interpretation.

These statements support evaluation as a multi-agent/workforce provider. They
do not yet prove a stable embeddable API, deterministic DAG semantics,
server-side headless operation, ACS-compatible approvals, multi-Organization
isolation, or evidence completeness.

### Potential ACS role

- workforce planning and execution adapter;
- task decomposition and parallel coordination;
- temporary provider-side task state;
- MCP/tool invocation under an ACS execution plan.

### Must remain ACS-owned

- workflow/workforce identity and revisions;
- agent identity and selection constraints;
- authority, budget, approval, and knowledge-scope decisions;
- final institutional evidence and decision history.

### Unresolved questions

- What stable programmatic API can ACS embed without depending on desktop UI?
- How are workforce state, retries, joins, cancellations, and checkpoints
  represented?
- Can provider events be streamed with stable IDs and replay semantics?
- Can context and credentials be isolated per Organization and domain?
- Which capabilities belong to Eigent versus underlying CAMEL?
- What state remains cloud-connected in each deployment mode?
- Can an ACS adapter reconstruct a run after process or host failure?

### Initial disposition

`POC CANDIDATE`, only after a headless/API and state-ownership spike.

## CAMEL

### Evidence observed

The inspected CAMEL repository describes an open-source framework for agents,
tasks, prompts, models, simulated environments, stateful memory, dynamic
communication, and large-scale multi-agent research. Its repository license is
Apache-2.0.

### Potential ACS role

- underlying multi-agent library;
- direct alternative if Eigent adds unnecessary UI/platform coupling;
- research vehicle for workforce semantics.

### Unresolved questions

- Which workforce APIs and persistence guarantees are stable at the selected
  version?
- Which behaviors Eigent adds beyond CAMEL?
- What production hardening, isolation, and evidence adapters ACS would need?

### Initial disposition

`DISCOVERY ALTERNATIVE`. Compare direct CAMEL integration with Eigent before
selecting the orchestration path.

## Codex

### Evidence observed

Official OpenAI Codex documentation describes Codex as a coding agent that can
read, change, and run code, and documents a CLI and SDK surfaces. The current
ACS repository already models Codex as an optional runner in its EPIC-10
architecture, but a canonical ACS v2 Codex adapter was not confirmed in the
inspected exported implementation.

### Potential ACS role

- cognitive/engineering execution provider for repository analysis, coding,
  testing, architecture, and technical documentation;
- bounded task runner inside a workforce;
- provider of artifacts and execution evidence through an adapter.

### Boundaries

- Codex is not an ACS agent identity or orchestrator by implication;
- prompts, tool access, repository roots, network, approvals, and timeouts must
  come from an authorized ACS task plan;
- Codex outputs remain candidate artifacts until required validation/review;
- current OpenAI capabilities and integration modes must be reverified against
  official documentation when the PoC is opened.

### Initial disposition

`ADAPTER DISCOVERY`, not production adoption.

## OpenClaw / AgentsAI

### Local evidence observed

ACS already contains:

- a pinned `engines/agentsai` submodule at
  `7a073ed87f877df7020ba8f348eb59afe3f64a48`;
- local OpenClaw agent discovery and canonical alias normalization;
- `OpenClawEngineAdapter` behind the ACS `AgentEngine` contract;
- explicit source/runtime/state/config/artifact/workspace boundaries;
- local, cloud, and remote-worker topology documentation;
- runtime, worker, deployment, evidence, and governance services around it.

### Proposed v2 role

OpenClaw remains the incumbent persistent operational execution provider while
discovery maps what it currently owns and what should move behind generalized
ACS contracts. Working capabilities should be preserved unless a comparison
shows a concrete architectural, security, or operational benefit.

### Required audit

- scheduled/event-driven behavior actually used today;
- state and memory ownership;
- runtime recovery and multi-host evidence;
- tool, MCP, filesystem, network, and credential scope;
- overlap with Eigent orchestration;
- exact adapter operations and unsupported cases;
- historical `main`/`trinity` normalization impact.

### Initial disposition

`PRESERVE AND AUDIT`.

## Comparative conclusion

The evidence does not support choosing Agenta alone, Eigent alone, or the
hybrid stack yet. The strongest current architectural position is:

1. preserve the existing ACS control plane and OpenClaw/AgentsAI adapter;
2. formalize missing ACS-owned workforce/orchestrator contracts;
3. run narrow, reversible spikes for Agenta projection and Eigent/CAMEL
   orchestration;
4. compare those results with an ACS-native extension using the same BBA
   workload and evidence policy;
5. make the adoption decision only after provider-removal, isolation,
   recoverability, and evidence-completeness tests.
