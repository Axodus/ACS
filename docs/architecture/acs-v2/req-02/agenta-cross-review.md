# ACS-V2-REQ-02 — Cross-Agent Synthesis Review: Agenta Accuracy and Required Corrections

**Reviewer scope:** Sub-Agent A / Agenta Core Auditor
**Review date:** 2026-09-10
**Reviewed artifacts:**

- `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/agenta-core-audit.md`
- `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/eigent-camel-core-audit.md`
- `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/acs-current-core-audit.md`
- `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md`
- `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/decision-record.md`

**Review outcome:** The synthesis is directionally correct: Agenta is **ADAPT-only**, ACS remains the institutional owner, Eigent is not a runtime dependency, and CAMEL must not own durable state. However, it needs several wording corrections and explicit gates before its Agenta/security/provider claims can be treated as implementation requirements.

The review modified no audited source or runtime state. Its document was copied into this ACS planning package. Line references to drafts are historical review locations; the reconciled blueprint and decision record govern the final proposal.

## 1. Findings that change or constrain the Agenta recommendation

### 1.1 ACS is not merely a destination for Agenta-inspired schemas

The ACS audit establishes current ACS-owned `AgentDefinition`/fingerprinted `AgentRevision`, composition, provider/credential/runner/engine/target separation, Product API, durable jobs, worker leases/fencing/recovery, governance, evidence, and economics. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/acs-current-core-audit.md:24-28`, `:66-74`, `:86-105`, `:152-183`.

**Effect on the Agenta recommendation:** Agenta `AgentTemplate`, resource compilation, and `ModelRef -> ResolvedConnection` are not candidates for a new ACS Agent Core repository or persistence model. They are candidates only for an **additive authored-definition projection/compiler** into existing ACS `AgentRevision` and plan resolution. This is stronger than the original Agenta audit’s generic “ADAPT” recommendation and should be stated in the architecture and decision record.

**Disposition:** **CORRECTION REQUIRED.**

The unified architecture correctly preserves ACS identity at `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md:59-67,100-104,611-620`, but the reuse ledger should add: “Agenta projection must preserve the existing ACS fingerprint/revision invariants; it must not introduce an alternate stored agent schema.”

### 1.2 Eigent/CAMEL confirms the durable boundary Agenta cannot supply

Eigent provides a useful write-before-dispatch journal and action-digest approval/revalidation pattern, but it is desktop/SQLite-specific. CAMEL `0.2.91a7` is ChatAgent-centric and uses in-memory `TaskChannel`, snapshots, worker listeners, and pools. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/eigent-camel-core-audit.md:36-41`, `:45-78`, `:89-97`, `:135-145`, `:148-159`, `:193-199`.

**Effect on the Agenta recommendation:** Agenta sequenced session events and OTel data should be treated the same way as Eigent journal events and CAMEL callbacks: useful **ingress/projection evidence**, never canonical execution state. The unified architecture reaches this conclusion at `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md:93,395-448`, but should explicitly apply the same requirement to Agenta session events: ACS must create canonical sequence/causation/evidence facts before or atomically with durable dispatch; adapter events may be delayed, missing, duplicated, or incomplete.

**Disposition:** **ACCEPT WITH REQUIRED GATE.** Add an outbox/idempotency/reconciliation requirement to the Agenta adapter PoC and evidence ADR.

## 2. Contradiction and correction matrix

| ID | Synthesis claim / location | Assessment against Agenta evidence | Required correction or gate | Disposition |
|---|---|---|---|---|
| AGX-01 | “Agenta SaaS UI, workspace/org, RBAC, billing and `ee/`” are jointly **REJECT**. Unified architecture `:94`. | Correct for UI, workspace/org product model, billing, and `ee/`. Overbroad for RBAC: Agenta’s audit says OSS RBAC enforcement is implemented and its **three-layer separation** is a useful concept; only Agenta’s role catalog/API scopes must not become ACS governance truth. Agenta audit `:305-321`, `:510-524`. | Split the row: (a) **REJECT** Agenta SaaS/workspace/org/billing/EE code and RBAC role catalog/API scopes; (b) **ADAPT concept only**: control-plane authorization, execution authority, and per-action approval are separate planes. | **CORRECTION REQUIRED** |
| AGX-02 | Unified matrix calls Agenta “platform RBAC and sandbox/tool controls.” Unified `:81`; domain isolation lists “tool/MCP allowlists and network/filesystem scope.” `:365-374`. | This wording can imply verified enforcement. The audit confirms platform RBAC and handler fail-closed connection compatibility checks. It confirms tool permission configuration is translated to harness/gateway controls, but it did not establish a universal enforcement proof. Most importantly, Agenta `SandboxPermission.filesystem` is declared but “NOT enforced”; sandbox-permission plumbing is not enforcement. Agenta audit `:305-321`, `:514-524`, `:590-600`. | Change “sandbox/tool controls” to “sandbox/tool policy declarations and adapter-specific controls.” Require execution evidence of: selected policy snapshot, executor capability, applied enforcement mode, and fallback/denial outcome. Do not admit an executor on the existence of a policy field alone. | **HIGH — CORRECTION REQUIRED** |
| AGX-03 | `AgentTemplate` adaptation leaves “placement, sandbox and authorization” out of canonical definition. Unified `:88`. | Correct and aligned with Agenta. But the canonical schema later lists `harness_preferences` and `executor_preferences` without defining what can be persisted as a preference versus resolved under governance. Unified `:140-152`; Agenta audit `:245-256`, `:273-286`. | Add `ExecutionBindingPolicy` semantics: revision may declare capability requirements and approved route classes; actual provider/model/harness/executor/environment binding must be resolved per execution, policy-snapshotted, and evidence-linked. No resolved credential or actual sandbox target may enter `AgentRevision`. | **CORRECTION REQUIRED** |
| AGX-04 | “Agenta provider reference/resolved connection” is **ADAPT**. Unified `:89`, and final gate says authored provider/model route is separate from resolved credential/harness/executor/etc. `:616`. | Accurate but insufficiently constrained. Agenta compatibility checks are harness-specific and run before and after connection resolution. They do not prove generic provider neutrality or that arbitrary provider/model routes work with every executor. The inspected runner’s Codex support breadth was uncertain because protocol comments lag current SDK/manifest and the Agenta worktree was dirty. Agenta audit `:186-197`, `:258-271`, `:598-600`, `:638-640`. | Add a conformance requirement: ProviderRoute selection must validate **provider + model + credential mode + deployment/endpoint + harness + executor + target capability** before dispatch. Pin a clean Agenta revision before copying or benchmarking any resolver code. Do not infer model route availability from `ModelRef` shape. | **HIGH — MISSING SPEC/GATE** |
| AGX-05 | Agent identity is “aliased through workflow/application/evaluator artifacts.” Unified `:59`, `:87`; decision record `:15`. | Substantively correct. Precision matters: Agenta does not define three interchangeable canonical agents. The handler resolves an “agent artifact id” from workflow/application/evaluator references because they are workflow-backed artifact families; competing references are treated as ambiguous rather than silently preferred. Agenta audit `:125-132`, `:594-600`, evidence source `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/handler.py:182-227`. | Replace “aliased” with “workflow-backed artifact-family references; the runtime may resolve application/workflow/evaluator representations to an artifact, and declines competing identities.” State explicitly: no Agenta first-class durable `Agent` aggregate was found. | **CORRECTION REQUIRED** |
| AGX-06 | “Agenta artifact/variant/revision lineage” is a strong immutable lineage. Unified `:87`; final gate `:611`. | Directionally useful, but “immutable” is an ACS design requirement, not proven solely by the inspected Agenta DTO inheritance. The Agenta audit describes Git-like artifact/variant/revision/fork semantics; it does not certify every storage mutation invariant or hash/fingerprint behavior. Agenta audit `:217-239`, `:424-429`. | Phrase as “revision/variant/commit/fork vocabulary and DTO pattern,” not “proven immutable lineage implementation,” unless exact DAO/migration/write-path evidence is cited. ACS fingerprint/optimistic revision controls remain authoritative. | **CORRECTION REQUIRED** |
| AGX-07 | Agenta runner/sidecar/session is **REIMPLEMENT** because it is coupled to sandbox-agent/ACP. Unified `:92`. | Correct. The wording should also exclude importing its session persistence model as a shortcut: its session records and OTel traces are separate, and lost execution can explicitly carry incomplete history. Agenta audit `:201-213`, `:465-487`, `:594-600`. | Add adapter acceptance criterion: an interrupted/lost adapter session must generate a canonical ACS event declaring evidence completeness state; ACS must not synthesize a completed transcript from runner logs. | **ACCEPT WITH REQUIRED GATE** |
| AGX-08 | MIT/EE reuse table. Unified `:520-529`; decision record gates `:46-54`. | Correct: non-`ee/` repository content is MIT; `ee/` carries the Enterprise License. The table needs one qualification: “outside `ee/`” does not resolve third-party component terms, generated/bundled asset licensing, or proprietary harness distribution. Agenta audit `:104-119`, `:598`, `:608`. | Preserve the current exact-file SBOM/notice gate and make it apply to SDK, runner, transitive dependencies, bundled harness integrations, patches, and generated artifacts—not only copied Python files. Cite original licenses: `/home/mzfshark/agenta/LICENSE:1-31`; `/home/mzfshark/agenta/ee/LICENSE:1-29`; runner packaging `/home/mzfshark/agenta/services/runner/package.json:7-12,27-76`. | **ACCEPT WITH EXPANDED GATE** |
| AGX-09 | Final decision says “Agenta ADAPT.” Unified `:623-630`; decision record `:15`. | Correct only if “ADAPT” means contract/design adaptation and an optional isolated projection PoC. It must not be read as authorization to merge external source; the decision conditions prohibit source import until clean revisions, licensing/provenance, notices, SBOM, ADRs, evidence/cost identities, and removal/isolation/recovery proof. Decision record `:44-60`; unified `:552-557,590-607`. | Add an explicit statement under “Reuse strategy”: **No Agenta source import is approved by this decision.** The first allowed experiment is mock-backed or clean-revision projection/conformance work. | **HIGH — ABSENT GATE WORDING** |
| AGX-10 | Existing ACS components are “validated ACS-owned foundations.” Unified `:100`; decision record `:18-25`. | “Validated” risks a broad readiness claim. The ACS audit preserves `ACS-BLOCKER-014` as HIGH and OPEN; it blocks a fresh full-suite health/readiness claim, though not architecture planning. ACS audit `:263-286`; unified `:552,596-607`; decision record `:46-60`. | Replace “validated” with “existing ACS-owned foundations with documented implementation evidence; readiness remains constrained by ACS-BLOCKER-014 and listed provenance/license gaps.” | **CORRECTION REQUIRED** |

## 3. Permissions enforcement review

### What the synthesis gets right

- Agenta distinguishes platform authorization/RBAC, tool permission posture, and session-level human interactions. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/agenta-core-audit.md:305-321`.
- The proposed ACS distinction among control-plane authorization, execution authority, and per-action approval is correct. Same source `:313-321`; unified architecture `:359-391`.
- A reviewer result cannot satisfy human approval automatically. Unified architecture `:259-273`.

### What must be corrected

The synthesis must not collapse **configuration** into **enforcement**.

Agenta evidence supports these narrower statements:

1. **Platform RBAC:** implemented in the API, project-scoped, with OSS enforcement and optional EE role overlays. This is a useful conceptual boundary, but its roles/scopes are Agenta product vocabulary. Agenta audit `:305-321`; underlying source `/home/mzfshark/agenta/api/AGENTS.md:24-68`.
2. **Provider route compatibility:** the handler checks selected model/harness characteristics before and after connection resolution and fails closed on incompatible routes. Agenta audit `:186-191`, `:258-271`, `:638-640`; underlying source `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/handler.py:230-294`.
3. **Tool permissions:** the template has `allow`/`ask`/`deny`/`allow_reads` posture and maps it into harness/gateway controls. The preserved audit did not demonstrate a single universal policy decision point or prove all harness/executor paths enforce identically. Agenta audit `:305-321`, `:514-521`.
4. **Sandbox security:** `network`/`filesystem` are declarative fields; filesystem is explicitly not enforced in the inspected implementation and sandbox-permission wire plumbing is not enforcement. Agenta audit `:522-524`; underlying source `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/dtos.py:188-217,880-886`.

### Required ACS enforcement contract absent from synthesis

Add this mandatory status model to the policy/evidence specification:

```yaml
AppliedControl:
  policy_snapshot_ref: PolicySnapshotRef
  control_kind: route | tool | mcp | network | filesystem | credential | approval
  requested_effect: allow | ask | deny | limit
  executor_capability_claim: CapabilityClaimRef
  applied_effect: enforced | denied | not_supported | degraded | bypassed
  enforcement_mechanism: string
  attestation_ref: ArtifactRef?
  evaluated_at: timestamp
  reason_ref: ErrorRef?
```

**Admission rule:** `required_effect != enforced` must fail closed for controls marked mandatory by the relevant policy. `degraded` is evidence, not authorization.

This requirement is especially important because the unified architecture includes network/filesystem scope as a trust boundary at `:365-374`, while the Agenta evidence does not establish enforcement of those fields.

## 4. Workflow/application/evaluator identity review

The synthesis correctly rejects external identity ownership and preserves ACS `AgentRevision`. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md:59-61,87-88,104-171`; `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/decision-record.md:15,42`.

A precision correction is still necessary:

```text
Incorrect shorthand: “Agenta has agent aliases.”
Required wording: “Agenta’s newer runtime template has no durable first-class
Agent aggregate. Its runtime derives an agent artifact identity through
workflow-backed application/workflow/evaluator references, and it declines
competing identities.”
```

Why it matters: a simple “alias” framing could invite ACS to map `AgentRevision` to any one Agenta artifact identifier. The correct adapter shape is one-way:

```text
ACS AgentRevision (canonical)
  -> optional Agenta-compatible authored-template projection
  -> temporary Agenta artifact/revision/reference metadata
  -> resolved execution route
```

The reverse mapping is not authoritative and must never create/update an ACS AgentRevision without ACS revision/fingerprint/governance validation.

## 5. Available model-route review

The synthesis correctly separates Provider, Model, Harness, Executor, Engine, Target, and Worker. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/unified-core-architecture.md:279-321,539-546`.

It lacks a route-admission specification that reflects Agenta’s actual constraints. `ModelRef -> ResolvedConnection` is not proof that a given route is available:

- Agenta validates compatibility with a selected harness before and after resolution, not merely a provider/model string. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/agenta-core-audit.md:186-191,258-271,638-640`.
- Agenta’s runner-side Codex support was not fully verified during the audit because runner protocol comments lag SDK/manifest indicators and the inspected worktree was dirty. Same audit `:193-197,598-600,695-698`.
- Existing ACS already resolves model provider, credential, runner, engine, and target separately. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/acs-current-core-audit.md:44-60,96-105`.

### Required specification

`ProviderRouteRef` and `ExecutionBinding` need at least:

```yaml
ProviderRouteRef:
  provider_id: string
  model_id: string
  credential_connection_ref: string
  deployment_or_endpoint_class: string
  required_modalities: [string]
  data_residency_or_network_class: string?

ExecutionBinding:
  route_ref: ProviderRouteRef
  harness_ref: string?
  executor_ref: string
  engine_ref: string?
  target_ref: string?
  capability_evaluation_ref: string
  policy_snapshot_refs: [string]
  resolved_at: timestamp
```

Required gate: validate the whole tuple, including credential mode and target capability, immediately before durable dispatch. A route resolver must report unsupported combinations as structured pre-dispatch denial, not allow an executor fallback to silently change provider, model, credential mode, or security posture.

## 6. Sandbox security review

The synthesis must retain the distinction between these statements:

| Statement | Status |
|---|---|
| Agenta has sandbox-related configuration and an execution environment abstraction. | Confirmed. |
| Agenta config provides enforceable filesystem isolation. | Contradicted by audit evidence. |
| Agenta config provides a complete, uniformly enforced network boundary. | Not established by the audit; configuration/plumbing alone is insufficient. |
| ACS may declare network/filesystem policy in AgentRevision. | Safe only as an authored requirement; actual selected executor must attest enforcement. |
| ACS can execute a policy-required isolated task on an executor lacking enforcement. | Unsafe; must fail closed. |

This must be added as an explicit acceptance criterion for `V2-BL-005`, `V2-BL-011`, `V2-BL-016`, and `V2-BL-017` in unified architecture `:573-585`.

## 7. Licensing review

The decision is accurate if the wording remains conditional:

- Agenta content outside `ee/` is MIT, subject to retaining required copyright/permission notice. `/opt/Axodus/ACS/docs/architecture/acs-v2/req-02/agenta-core-audit.md:104-113`; original `/home/mzfshark/agenta/LICENSE:1-31`.
- `ee/` uses the Agenta Enterprise License and is rejected absent a separate agreement. Agenta audit `:104-113`; original `/home/mzfshark/agenta/ee/LICENSE:1-29`.
- Third-party and harness obligations remain separate. The runner manifest identifies Codex and Claude differently; copying runner integration is not licensed merely because its enclosing OSS source is MIT. Agenta audit `:110-119`; original `/home/mzfshark/agenta/services/runner/package.json:7-12,27-76`.
- ACS itself has no evidenced root license/notice, and OpenClaw/AgentsAI provenance/license remains unresolved. ACS audit `:33-40,261-279`; unified architecture `:520-529`.

**Unsafe recommendation to avoid:** “Copy the non-`ee/` Agenta runner/SDK now because it is MIT.”

That would omit the exact-file source hash, local dirty-state exclusion, third-party/SBOM and notice work, patches/bundled artifact review, proprietary harness distribution analysis, and ACS project license decision. The existing gates at decision record `:46-54` are correct; make them explicitly applicable to an Agenta projection implementation and runner-related code.

## 8. Missing specifications and required citations

| Missing or under-specified item | Required disposition | Minimum citation(s) needed |
|---|---|---|
| Agenta permission enforcement scope | Add the four-layer distinction and AppliedControl evidence requirement. | Agenta audit `:305-321,514-524`; `/home/mzfshark/agenta/api/AGENTS.md:24-68`; `/home/mzfshark/agenta/sdks/python/agenta/sdk/agents/dtos.py:188-217,841-950`. |
| Sandbox enforcement status | Add fail-closed admission/attestation gate. | Agenta audit `:522-524,594-600`; `/home/mzfshark/agenta/sdk/agents/dtos.py:188-217,880-886`. |
| Provider route availability | Add binding tuple and pre-dispatch conformance policy. | Agenta audit `:258-286,638-640`; `/home/mzfshark/agenta/sdk/agents/handler.py:230-294`; ACS audit `:96-105`. |
| Agenta identity claim | Replace “alias” shorthand with artifact-family resolution/ambiguity language. | Agenta audit `:125-132,327-335`; `/home/mzfshark/agenta/sdk/agents/handler.py:182-227`. |
| Event reliability | Specify adapter event idempotency, loss/completeness, ordering and reconciliation. | Agenta audit `:201-213,465-487,594-600`; Eigent audit `:75-78,135-145,193-199`; unified architecture `:395-448`. |
| Agenta source adoption | Make no-source-import status explicit and add clean SHA requirement to `V2-BL-013`. | Decision record `:46-54`; unified architecture `:522-529,552-557,581,590`; Agenta audit `:68-77,104-119`. |
| Existing ACS “validated” wording | Replace blanket readiness implication with evidence-backed foundation plus open blocker. | ACS audit `:263-286`; unified architecture `:596-607`; decision record `:46-60`. |
| CAMEL/Eigent adapter boundary | Preserve write-before-dispatch invariant but forbid CAMEL/Eigent ownership of state/approvals/evidence. | Eigent audit `:71-78,89-97,135-159,193-199`; unified architecture `:95-99,261-273`. |

## 9. Required edits before implementation planning is treated as complete

1. Amend unified reuse ledger row for Agenta RBAC to distinguish rejected product role catalog/API scopes from adaptable three-plane governance concepts.
2. Add policy-application/evidence schema and fail-closed enforcement admission rule.
3. Replace “aliased” with the precise workflow-backed artifact-family wording.
4. Add ProviderRoute/ExecutionBinding tuple validation and state that Agenta `ModelRef` does not promise general route availability.
5. Amend Agenta schema/projection PoC acceptance criteria: clean source pin, no source import without legal gate, ACS fingerprint preservation, policy enforcement evidence, route rejection, event loss/reconciliation, and provider removal.
6. Qualify “validated ACS foundations” with `ACS-BLOCKER-014` and the documented non-readiness/provenance constraints.
7. Add an evidence/outbox invariant informed by Eigent: canonical ACS fact persists before external dispatch or notification; external adapter telemetry is subsequently correlated, not treated as authoritative state.

## 10. Final disposition

**Synthesis accuracy:** **CONDITIONAL ACCEPTANCE.**

The target architecture, ownership boundaries, ADAPT/REIMPLEMENT/REJECT choices, rejection of permanent Eigent dependency, and ACS-first durable runtime path are supported by the three audits.

**Do not proceed from this synthesis to external source import, executor adoption, or policy-required sandbox execution until the corrections and gates above are incorporated.** The highest-risk gap is conflating Agenta’s sandbox/tool configuration with verified enforcement. The next highest is treating a model/provider reference as proof of an executable route without validating the full provider/model/credential/harness/executor/target tuple.
