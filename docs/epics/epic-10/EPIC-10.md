# EPIC-10 — ACS Distributed Agent Runtime & OpenClaw Integration

Status: normative baseline
Owners: ACS Control Plane and AgentsAI/OpenClaw Engine
Engine baseline: `Axodus/AgentsAI@44e9f4d03facb9887b2fe1cab1827d221e4acaab` (`dev`)
Normative language: MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY follow RFC 2119 meanings.

## 1. Purpose and authority

This EPIC defines how ACS governs autonomous execution performed by AgentsAI/OpenClaw while remaining local-first in WSL2 and deployable as a distributed cloud system. It is the implementation baseline for S01–S23. If an implementation conflicts with this document set, the implementation MUST change or an ADR superseding this baseline MUST be accepted.

ACS is the control plane, governance authority, Product API, identity/access boundary, economic layer, and evidence authority. `Axodus/AgentsAI` is the versioned source repository for the OpenClaw-compatible autonomous execution engine. Runtime state is external, mutable, environment-specific state and MUST NOT be treated as source.

> Co-location of ACS, AgentsAI/OpenClaw, runners, and runtime state in the WSL2 development environment is a development optimization and MUST NOT become an architectural property or production requirement of the system.

The complete normative baseline is:

- [architecture.md](architecture.md): topology, domain boundaries, lifecycle, ADRs, and migration classification.
- [contracts.md](contracts.md): `acs-engine/1`, adapters, targets, providers, runners, credentials, Product API, and evidence.
- [security.md](security.md): autonomous-workload threat and isolation requirements.
- [economic-model.md](economic-model.md): `$Neurons`, metering, authorization, and settlement contracts.
- [stories.md](stories.md): S01–S23, milestones, acceptance, tests, DoD, and risks.

## 2. Scope

The EPIC specifies:

- explicit `source_root`, `runtime_root`, `state_root`, `config_root`, `artifacts_root`, and `workspace_root` boundaries;
- a language- and transport-independent ACS Engine Protocol;
- TypeScript engine, execution-target, provider, runner, credential, execution-plan, economic, and evidence contracts;
- governed materialization of ACS agent revisions into OpenClaw-compatible artifacts;
- DEV-LOCAL and PROD-CLOUD topologies;
- sandbox-first execution and infrastructure-neutral workload isolation;
- Product API integration for the frontend;
- implementation decomposition through production-readiness gates.

## 3. Non-goals

The initial EPIC implementation does not require final Kubernetes or multi-region deployment, final blockchain settlement, `$Neurons` pricing, every provider or subscription integration, migration of all state to cloud, disabled sandbox safeguards, public OpenCode exposure, browser access to OpenClaw, frontend secret handling, or live deployment. This documentation task does not implement S01 or change runtime configuration.

## 4. Verified baseline (2026-08-08)

| Area | Classification | Verified condition | Required direction |
|---|---|---|---|
| ACS orchestration, policies, telemetry, receipts | Existing | Deterministic TypeScript primitives and append-oriented JSONL stores exist. | Reuse behind Product API/application services. |
| ACS OpenClaw integration | Needs refactor | `src/openclaw.ts` reads agent directories/manifests only; `src/runtime.ts` defaults to `~/.openclaw/agents`. | Replace filesystem coupling with `AgentEngine`; retain discovery only as a compatibility adapter. |
| ACS HTTP | Existing/needs extension | `GET`-only inspection API under `/acs`; non-GET returns 405. | Add authenticated versioned command/query surfaces without weakening current response/correlation contracts. |
| ACS secrets | Existing/needs replacement | `AcsSecretStorage` and mock `secretRef` adapter exist. | Generalize to credential connections and production secret backends; never return secret values. |
| ACS provider registry | Existing/needs refactor | Capability-matching `ProviderRegistry` exists but conflates a general provider with execution concerns. | Split `ModelProvider`, `AgentRunner`, and `CredentialProvider`. |
| Frontend | Existing/mock | Vite marketing preview and standalone design contain static product/runtime data and no ACS runtime API integration. | Frontend calls Product API exclusively; server data is authoritative. |
| AgentsAI application boundary | Existing | `ACSApplicationService`, `RoleService`, `ProfileService`, `CompositionService`, capability/skill/tool registries exist. | Reuse behind an engine-protocol server; do not reimplement in TypeScript. |
| Governed agent revisions | Existing | Immutable definitions, revision fingerprints, change sets, stale-evidence invalidation, explicit role/profile adoption exist. | Map into the unified ACS model and preserve revision semantics. |
| Sandbox chain | Existing | validate → candidate → approval/ledger → preflight → isolated sandbox deployment → evidence exists. Non-sandbox deployment raises `SandboxOnlyViolationError`. | Preserve and expose through protocol; live remains gated. |
| Runtime roots | Needs refactor | `engine_bridge.py` derives repository root with `Path(__file__).resolve().parents[3]`, then infers `openclaw.json` and `.acs/state`. | Inject and validate all six roots; fail closed on missing/overlapping unsafe roots. |
| Distributed workers, execution plans, runners, billing | New | No stable cross-process contract or scheduler exists. | Add in ordered milestones; keep infrastructure neutral. |
| Cloud multi-region and proprietary models | Future | Not implemented. | Fit the contracts without claiming readiness. |

The current `~/.openclaw` checkout is simultaneously legacy AgentsAI source and DEV runtime. That overlap MAY remain read-only during this normative phase, but S01 MUST establish physically distinct source and runtime roots before integration work proceeds.

## 5. Invariants

1. ACS MUST govern every deployment and execution; engine materialization is not the product source of truth.
2. `source_root == runtime_root == state_root` MUST NOT be assumed or accepted as a production mapping.
3. No production runtime path may be inferred from Python module location or current working directory.
4. The frontend MUST NOT access runtime files, Python CLI, AgentsAI internals, OpenCode, model credentials, or providers directly.
5. Engine source revision, agent revision, composition, deployment, runtime instance, and execution run MUST be independently identifiable.
6. Runners, model providers, and credential providers MUST remain separate abstractions even when one integration implements more than one capability.
7. Autonomous execution MUST be treated as untrusted workload execution and MUST be sandbox-first.
8. Economic authorization and governance authorization are independent gates; success in one MUST NOT imply success in the other.
9. Evidence MUST be append-oriented, correlated, redacted, and attributable.
10. Transport replacement MUST NOT alter the logical `acs-engine/1` operation semantics.

## 6. Milestones and exit outcomes

| Milestone | Stories | Exit outcome |
|---|---|---|
| A — Local Integration Foundation | S01–S06 | Browser/ACS → Product API → adapter → AgentsAI → isolated `~/.openclaw` DEV runtime, with deterministic health and discovery. |
| B — Intelligence Provider Layer | S07–S12 | Managed, BYOK, account-backed, local/private, and OpenCode options represented coherently; one thin path may be implemented first. |
| C — Product Control Plane | S13–S16 | Governed resources, execution plans, and economic contracts are manageable through ACS. |
| D — Governed Execution | S17–S20 | Create → compose → validate → plan → authorize → reserve → deploy → run → observe → stop → meter → settle; sandbox only initially. |
| E — Cloud Production | S21–S23 | `local-wsl` can be replaced by `cloud-worker` without changing core agent/domain contracts; isolation/readiness gates are evidenced. |

Milestones are ordered. A later milestone MAY prototype against fakes, but MUST NOT be declared complete before its dependencies and acceptance gates are complete.

## 7. Recommended first implementation story

S01 Runtime & Environment Boundaries is first. It removes the verified path-coupling defect and supplies the configuration object required by every subsequent adapter, local target, packaging, protocol, test, and worker story. It MUST be implemented without enabling live deployment or mutating the current operational `~/.openclaw`.

## 8. Open design questions

These questions do not block this baseline; the named story MUST resolve each with an ADR or contract fixture:

- S03: submodule versus pinned package/artifact after testing CI, release, and developer ergonomics. This baseline recommends a submodule first.
- S04: canonical schema technology (JSON Schema plus generated types is preferred) and streaming/event extension shape.
- S09–S12: first supported provider/runner and the official account authorization mechanisms actually offered under provider terms.
- S16: economic ledger authority, reservation expiry/refund rules, and eventual `$Neurons` settlement connector.
- S21–S23: dispatch technology, worker identity system, isolation tiers, and production SLOs.

## 9. Naming debt

`Axodus/ACS` and Python package `Axodus/AgentsAI/src/acs` create operational ambiguity. EPIC-10 MUST record logs, packages, and evidence with explicit `control-plane` or `agentsai-engine` component identity. A broad Python rename is out of scope unless a concrete packaging blocker is proven. A future ADR SHOULD evaluate an explicit AgentsAI/OpenClaw engine namespace.
