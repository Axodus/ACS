# ACS v2 Architecture Discovery Baseline Report - 2026-09-09

## Scope

Document the current ACS implementation baseline and create a controlled
planning package for ACS v2 across ACS, Core, Governance, Documentation,
BBA-Agency, and root portfolio coordination.

## Objective

Preserve the implemented ACS control plane while defining the evidence,
ownership, provider-independence, agent, workforce, workflow, governance,
knowledge, and provenance questions that must be resolved before any v2
implementation or migration.

## Files Created

- `docs/architecture/acs-v2/README.md`
- `docs/architecture/acs-v2/current-state-audit.md`
- `docs/architecture/acs-v2/target-architecture.md`
- `docs/architecture/acs-v2/canonical-contracts.md`
- `docs/architecture/acs-v2/provider-evaluation.md`
- `docs/architecture/acs-v2/decision-matrix.md`
- `docs/architecture/acs-v2/migration-plan.md`
- `docs/architecture/acs-v2/implementation-backlog.md`
- `.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md`

## Files Updated

- `README.md`
- `.instructions/README.md`
- `.instructions/ARCHITECTURE.md`
- `.instructions/ORCHESTRATION.md`
- `.instructions/DECISIONS.md`
- `.instructions/ROADMAP.md`
- `.instructions/TASKS.md`
- `.instructions/STATUS.md`

## Architecture Findings

- The current repository is an established control plane, not a greenfield
  OpenClaw assistant.
- Existing `AgentDefinition`, `AgentRevision`, engine, runner, provider,
  execution-target, durable-state, governance, audit, and evidence foundations
  should be reconciled and extended rather than replaced by default.
- OpenClaw/AgentsAI is already behind ACS-owned code and must be preserved and
  audited before any role change.
- A canonical workforce identity, revisioned workforce contract, provider-
  neutral DAG/handoff/retry/checkpoint model, and complete multi-agent lineage
  remain discovery gaps.
- Agenta and Eigent are PoC candidates only. CAMEL is a direct comparison
  alternative. Codex requires adapter discovery. No provider has been adopted.
- `Agent Coordination System` is the canonical expansion for new architecture
  work. Historical aliases remain documented.
- `Organization` is the user-facing label; current `tenant`, `TenantId`, and
  `tenantId` identifiers remain unchanged for compatibility.

## Cross-Nucleus Ownership

| Owner | Responsibility in this planning track |
| --- | --- |
| ACS | Canonical agents, workforce/workflow definitions, execution planning, provider adapters, operational coordination, and institutional run evidence. |
| Core | Shared typed semantics, receipts, telemetry, registry, compatibility, tenancy, capability, condition, and execution references. |
| Governance | Policy, mandates, approvals, constitutional authority, and review of execution-sensitive boundaries. |
| Documentation / product nuclei | Canonical institutional and product-domain knowledge; ACS consumes scoped, provenance-bearing references. |
| BBA-Agency | Non-production reference workload and domain contract owner for any future comparative PoC. |

## Provider Evidence Baseline

The provider evaluation records exact repository commits where inspected and
keeps marketing statements separate from ACS integration proof. Required
follow-up includes API stability, license/edition, self-hosting, data egress,
isolation, recovery, evidence export, provider removal, and security review.

## Validation Commands

- `git diff --check`
- documentation link and required-file checks
- terminology and blocked-action searches
- `npm run build`
- `npm test`
- `npm run check`
- Core checks, tests, and conformance in `/opt/Axodus/Core`
- root agent-coordination validation

## Validation Results

- `git diff --check`: PASS.
- Required-file and relative-link validation: PASS for all eight documents in
  `docs/architecture/acs-v2/`; no broken relative links were found.
- TypeScript build inside `npm run check`: PASS.
- Full `npm run check`, rerun outside the restricted sandbox so loopback and
  process tests could execute: FAIL with `680` tests, `673` passing, `5`
  failing, and `2` skipped.
- The five current failures are:
  - `tests/s27-operational-evidence.test.mjs` — expected HTTP `200`, received
    `405`;
  - `tests/s54-epic-15-5-observability-incident-acceptance.test.mjs` — expected
    HTTP `200`, received rate-limit HTTP `429`;
  - `tests/s57-epic-15-5-production-target-process-acceptance.test.mjs` — child
    process resolved `/opt/Axodus/dist/engines/production-target-server.js`,
    which does not exist at that workspace-level path;
  - `tests/s62-epic-16-2-economic-authorization-reservations.test.mjs` —
    `dist/index.js` does not export `createControlPlaneContext`;
  - `tests/s63-epic-16-3-usage-settlement.test.mjs` — the observed usage record
    did not contain the expected reservation identifier.

The first sandboxed test run produced additional environment-related failures,
including inability to create OpenClaw state under the restricted home path.
Those sandbox-only failures are not used as the final repository result. The
outside-sandbox run above is the authoritative result for this documentation
cycle.

The documentation package itself is structurally validated. The repository
cannot be described as having a fresh all-green runtime suite until the five
failures are diagnosed in a separately scoped implementation request.

## Git Status

ACS is on branch `dev`. The ACS v2 package was created as a new documentation
directory. Pre-existing unrelated worktree changes were not modified.

## Boundaries Preserved

- no production execution;
- no real funds;
- no secrets read or written;
- no provider installed or integrated;
- no OpenClaw runtime or linked subproject modified;
- no runtime behavior, schemas, APIs, or dependencies changed;
- no trading, treasury, payment, settlement, payout, wallet signing, minting,
  on-chain write, or credential authority enabled;
- no maturity, priority, or governance-track change.

## Production Status

`PRODUCTION_BLOCKED / EXECUTION_GATED / NO_MUTATION_AUTHORITY`

## Remaining Blockers

- diagnose and resolve or explicitly rebaseline the five current ACS test
  failures before claiming fresh full-suite health;
- complete current-state path and authoritative-store audit;
- Core/ACS/Governance review of the proposed coordination boundary;
- provider API, license, security, isolation, recovery, and evidence spikes;
- BBA confirmation of the reference workforce contract;
- scored decision matrix and formal decision gate;
- separately authorized implementation request after discovery.

## Next Recommended Request

`ACS-V2-REQ-01 - Complete Current-State Architecture and OpenClaw/AgentsAI Audit`

## Final Status

`PLANNING / DOCUMENTATION BASELINE VALIDATED / RUNTIME SUITE BLOCKED`
