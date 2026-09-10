# ACS-V2-REQ-02 — Baseline Addendum: Guide, Conformance, Orchestrator, Provider, and Economics

**Date:** 2026-09-10
**Scope:** targeted read-only evidence lookup. No conformance/test command was run and no source, instruction, runtime, credential, or configuration was changed.

## 1. Preserved historical guide and conformance records

Historical records are not interchangeable with the current baseline. The June 2026 local-validation pass remains historical evidence. The September 2026 architecture-discovery baseline supersedes it for the current all-green-suite claim and leaves `ACS-BLOCKER-014` open.

| Date | Record | Status recorded | Exact evidence / failure detail | Required V2 treatment |
|---|---|---|---|---|
| 2026-06-22 | `/opt/Axodus/ACS/.instructions/reports/ACS_LOCAL_VALIDATION_REPORT.md` | `npm run build`, `npm test`, and `npm run check`: PASS; no skipped/removed tests. | The report records initial TS2322, MJS syntax, prohibited wording, live-trading classifier, blocked-state prioritization, and restricted-sandbox EPERM issues; the final check passed after work in that historical request. `/opt/Axodus/ACS/.instructions/reports/ACS_LOCAL_VALIDATION_REPORT.md:52-113` | Preserve as **HISTORICAL RECORD** only. It cannot support a current fresh-suite claim. |
| 2026-06-23 | `/opt/Axodus/ACS/.instructions/HANDOFF.md` | `L4_READINESS`, `D3+`, `LOCAL_VALIDATION_CONFIRMED`; execution gates closed, local/mock/non-production posture. | The handoff says the earlier build/test/check passed and that no tests were skipped/removed; it also explicitly keeps execution, credentials, signing, treasury and trading disabled. `/opt/Axodus/ACS/.instructions/HANDOFF.md:49-96,98-105` | Preserve maturity and authority constraints; reconcile the validation statement with the newer September result rather than deleting it. |
| 2026-09-09 | `/opt/Axodus/ACS/.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md` | `DOCUMENTATION_VALIDATED / FULL_SUITE_BLOCKED`. | TypeScript build passed; full `npm run check` outside the restricted sandbox had 680 tests: 673 passing, five failing, two skipped. Failures: `s27-operational-evidence`, `s54-observability-incident`, `s57-production-target-process`, `s62-economic-authorization-reservations`, `s63-usage-settlement`. `/opt/Axodus/ACS/.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md:75-116` | **Current ACS V2 conformance baseline.** Do not claim fresh all-green runtime validation. |
| 2026-09-09 | `/opt/Axodus/ACS/.instructions/STATUS.md` | `PLANNING / DISCOVERY`; existing maturity unchanged. | Retains `L4_READINESS`, `D3+`, governance pause, execution-gated, non-production and no-mutation-authority posture; notes five failures out of 680. `/opt/Axodus/ACS/.instructions/STATUS.md:3-31` | Binding planning/maturity qualifier for all V2 recommendations and future PoCs. |
| 2026-09-09 | `/opt/Axodus/ACS/.instructions/VALIDATION.md` | Current full check failed. | Lists the same five tests and states source/test correction requires a separately scoped implementation request. `/opt/Axodus/ACS/.instructions/VALIDATION.md:115-143` | Preserve as the exact current validation procedure/result record. |
| 2026-09-09 | `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md` | `ACS-BLOCKER-014`: HIGH, OPEN. | Full suite result and affected areas: operational-evidence HTTP, observability/rate limiting, production-target child process, missing economic public export, usage/reservation correlation. It forbids altering runtime/public exports/rate limits/production-target behavior within the documentation-only request. `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md:207-231` | Remains an open, separate workstream. It blocks fresh full-suite health and implementation-readiness evidence, not architecture discovery. |

### Adjacent Core and root coordination records

| Date | Record | Status / finding | ACS consequence |
|---|---|---|---|
| 2026-09-09 | `/opt/Axodus/Core/.instructions/reports/ACS_V2_CORE_ALIGNMENT_REPORT_2026-09-09.md` | Core checks passed: workspace check, 11 tests, 67 conformance checks, zero failures/warnings. The report explicitly says these validate Core documentation/shared contracts only; they do not accept ADR-006 or authorize ACS runtime work. `:47-64,71-98` | Core green conformance is **not** ACS runtime conformance, provider acceptance, or authority. |
| current Core status record (no explicit “Last updated” date in inspected range) | `/opt/Axodus/Core/.instructions/STATUS.md` | `PRE-RC HARDENING`; runtime `DO NOT START`; adapter/consumer status certification/onboarding only; ACS consumer pilot review incomplete. `:1-13,31-47,61-75` | ACS V2 must consume Core only as shared protocol/compatibility semantics and must not place ACS runtime/workforce/provider implementation in Core. |
| 2026-09-09 | `/opt/Axodus/.instructions/handoffs/Core/20260909-acs-v2-core-alignment-validation-CORE-ACS-V2-ALIGNMENT-VALIDATION-20260909.md` | Located as adjacent root/Core coordination handoff. The associated Core alignment report records documentation/protocol-boundary validation only. | Preserve cross-nucleus review and ADR acceptance gate; documentation success is not runtime authorization. |
| current Core integration guide (no explicit document date in inspected range) | `/opt/Axodus/Core/docs/CORE_INTEGRATION_GUIDE.md` | Core requires consumers to validate compatibility but keeps runtime, storage, policy, adapters and UI outside Core; conformance failures are integration blockers and certified adapters still do not grant authority or approve runtime behavior. `:7-20,74-88,174-205` | Any ACS V2 conformance fixture must test Core compatibility only; ACS retains runtime, storage, policy enforcement, adapters, and evidence authority. |

## 2. Exact old-orchestrator limitation

The old in-process orchestrator does **not** invoke a provider, runner, engine, tool, or model inference API.

1. `AcsOrchestrator.execute()` iterates synchronously over `workflow.steps`. `/opt/Axodus/ACS/src/orchestrator.ts:33-59`
2. For each step it requires a registered agent and evaluates policy. `/opt/Axodus/ACS/src/orchestrator.ts:59-64`
3. It optionally calls `ProviderRegistry.findAvailableByCapability()`, which returns a provider definition selected by capability only. `/opt/Axodus/ACS/src/orchestrator.ts:66-72`; `/opt/Axodus/ACS/src/providers.ts:4-29`
4. It unconditionally writes a `WorkflowStepReceipt` with `status: "completed"` and optional `providerId`; there is no provider-method invocation between resolution and receipt synthesis. `/opt/Axodus/ACS/src/orchestrator.ts:74-80`
5. It then emits workflow-completed telemetry and returns/saves the synthesized receipt. `/opt/Axodus/ACS/src/orchestrator.ts:82-116`

**Disposition:** this primitive is deterministic validation/receipt synthesis, not proof of agent execution or provider inference. Preserve it as a legacy/local workflow compatibility path and do not use it to justify a graph-job runtime, model execution, tool invocation, usage metering, or task completion semantics.

## 3. Actual model-provider boundary: catalog/control plane, not inference

The `ModelProvider` interface exposes only `health`, `listModels`, `getModel`, and `capabilities`. It has no generate/chat/completion/stream/tool-call execution method. `/opt/Axodus/ACS/src/intelligence/model-provider.ts:1-74`

`ModelProviderRegistry` only registers, retrieves, and lists providers. `/opt/Axodus/ACS/src/intelligence/model-provider-registry.ts:1-25`

The concrete OpenAI BYOK provider uses credentials and HTTP only for model discovery/health:

- its health check calls the model-list endpoint; `/opt/Axodus/ACS/src/intelligence/openai-byok-provider.ts:50-63,114-124`
- `listModels()` maps `/v1/models` output into catalog entries; `getModel()` reads `/v1/models/{id}`; `/opt/Axodus/ACS/src/intelligence/openai-byok-provider.ts:65-88,133-177`
- provider capabilities are derived from listed model metadata; `/opt/Axodus/ACS/src/intelligence/openai-byok-provider.ts:90-103`
- the BYOK EPIC document calls this “model discovery,” says it proves the BYOK **control-plane** architecture without paid live test traffic, and explicitly excludes billing/Neurons settlement. `/opt/Axodus/ACS/docs/epics/epic-10/byok-providers.md:26-49`

**Precise conclusion:** ACS has a provider catalog/discovery and credential-bound control-plane adapter. It does not have an inference method in the `ModelProvider` contract. An executor/runner/harness adapter must own provider invocation and report structured results/usage back through ACS contracts. Do not collapse catalog, connection, model invocation, and executor into one “provider.”

## 4. Economics: current price charging and BYOK compatibility constraints

### Confirmed current contract

- `EconomicAccount.mode` supports `axodus-managed`, `byok`, and `byos`; it carries optional `tenantId` and `workloadId`. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:4-5,57-70`
- `BillingPolicy` supplies a `policyId`, `revision`, and per-usage-dimension pricing map. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:66-70`
- Quotes record policy ID/revision and the account mode. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:72-84,377-410`
- `EconomicService` retains the injected `BillingPolicy` as `#policy`; quote calculations dereference `#policy.pricing[dimension]` at quote time. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:344-363,377-410`
- Settlement calculates the charge by iterating usage for the run and dereferencing the **currently held** `#policy.pricing[record.dimension]` at settlement time. It does not read a price snapshot from the quote, reservation, usage record, or settlement input. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:559-600,671-677`
- The `BillingPolicy` and pricing map are TypeScript `readonly` interfaces, but the service neither copies nor freezes the injected policy. The source therefore proves a current-policy lookup at calculation time; it does not prove price immutability/snapshot enforcement across a run. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:66-70,344-363,671-677`
- Durable economic storage uses `INSERT ... ON CONFLICT(kind, id) DO UPDATE`, including payload replacement. It is idempotent durable state, not a write-once cost-line ledger. `/opt/Axodus/ACS/src/control-plane/durable-economic-state.ts:286-314`

### BYOK mismatch to preserve

The EPIC-10 economic specification states that in BYOK the user pays the upstream provider directly, and ACS must not assume an Axodus inference charge. `/opt/Axodus/ACS/docs/epics/epic-10/economic-model.md:62-71`

But current `#calculateCharge()` does not inspect the account/quote/receipt `mode`; it charges every recorded usage dimension whose current policy has a non-zero price. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:671-677` The receipt stores mode after settlement, but mode does not control the calculation in the inspected code. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:695-709`

**Disposition:** preserve this as an economic conformance/design issue. Do not silently treat BYOK as free of all ACS charges, and do not assume current code suppresses provider-inference charges for BYOK. A V2 cost core must add explicit responsibility classification per usage dimension (for example provider inference versus ACS runtime/tool/storage), price-source snapshot/provenance, and an enforced policy mapping before it uses Product→Workforce→Workflow→Agent→Task allocation.

### Existing settlement behavior and scope boundary

`EconomicService` supports quote, reserve, usage record, settle, release, idempotency and reconciliation flows. `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:490-615,650-712` EPIC-10 states that economic authorization does not grant governance/tool permission, no final price/balance/settlement-finality claim exists without an authoritative connector response, and settlement failures do not rewrite execution evidence. `/opt/Axodus/ACS/docs/epics/epic-10/economic-model.md:7-16,77-90`

The presence of these local contracts is not authorization for financial activity. Current ACS guidance preserves no-go areas including credentials, wallet/signing, treasury movement, trading execution, settlement, and payouts. `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md:233-242`

## 5. Required baseline language for future ACS V2 artifacts

Use all of the following distinctions:

- **Historical validation:** June 2026 local suite was recorded passing after a scoped repair request.
- **Current validation:** September 9, 2026 fresh full suite is blocked by `ACS-BLOCKER-014` with five failing tests and two skips.
- **Core conformance:** validates shared metadata/compatibility; it does not certify ACS runtime behavior, authorization, provider execution, or production operation.
- **Old orchestration:** validates policy/capability resolution and synthesizes completed receipts; it does not execute providers.
- **Model provider:** catalogs/health-checks models and resolves control-plane metadata; it is not an inference executor.
- **Economic service:** is an existing tenant-scoped economic foundation with current-policy charging and upsert persistence; it is not a price-snapshot, immutable cost ledger, nor proof of BYOK inference-charge suppression.
- **Authorization:** V2 implementation, conformance repair, provider integration, runtime changes, schema changes, financial operations, and any PoC remain separately authorized work.

## Evidence index

| Ref | Path and lines |
|---|---|
| A1 | `/opt/Axodus/ACS/.instructions/reports/ACS_LOCAL_VALIDATION_REPORT.md:1-117` |
| A2 | `/opt/Axodus/ACS/.instructions/HANDOFF.md:49-105` |
| A3 | `/opt/Axodus/ACS/.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md:75-116` |
| A4 | `/opt/Axodus/ACS/.instructions/STATUS.md:3-31` |
| A5 | `/opt/Axodus/ACS/.instructions/VALIDATION.md:115-143` |
| A6 | `/opt/Axodus/ACS/.instructions/BLOCKER_REGISTER.md:207-242` |
| C1 | `/opt/Axodus/Core/.instructions/reports/ACS_V2_CORE_ALIGNMENT_REPORT_2026-09-09.md:34-64,71-98` |
| C2 | `/opt/Axodus/Core/.instructions/STATUS.md:1-13,31-47,61-75` |
| C3 | `/opt/Axodus/Core/docs/CORE_INTEGRATION_GUIDE.md:7-20,74-88,174-205` |
| O1 | `/opt/Axodus/ACS/src/orchestrator.ts:33-116` |
| O2 | `/opt/Axodus/ACS/src/providers.ts:4-29` |
| P1 | `/opt/Axodus/ACS/src/intelligence/model-provider.ts:1-74` |
| P2 | `/opt/Axodus/ACS/src/intelligence/model-provider-registry.ts:1-25` |
| P3 | `/opt/Axodus/ACS/src/intelligence/openai-byok-provider.ts:50-124,133-177` |
| P4 | `/opt/Axodus/ACS/docs/epics/epic-10/byok-providers.md:1-49` |
| E1 | `/opt/Axodus/ACS/src/control-plane/neurons-economic-contract.ts:4-5,57-84,344-410,490-615,650-712` |
| E2 | `/opt/Axodus/ACS/src/control-plane/durable-economic-state.ts:286-314` |
| E3 | `/opt/Axodus/ACS/docs/epics/epic-10/economic-model.md:1-90` |
