# EPIC-17-IMP-06 — Post-Slice-3 Reconciliation

**Date:** September 14, 2026  
**Type:** technical reconciliation; documentation only  
**Baseline:** `dev` at `7be46f0 feat(epic-17): prepare durable activation handoff`  
**Schema:** `12 / CANONICAL`  
**Implementation performed:** none

## Decision

The next canonical IMP-06 slice remains **S4 — Schedule occurrence and recovery
machinery**. Its entry dependency is **not satisfied**: the repository has
durable watermark storage but has not frozen a typed exact schedule-definition
semantics or a missed-work policy representation. This is a **BLOCKED**
recommendation to CTO, not authority to implement S4 or scheduler runtime.

The frozen [IMP-06 slice mapping](imp-06-slice-mapping.md) places S4 before S5
(external adapter/product projection) and S6 (closure). Repository evidence
does not contradict that order.

## Accepted baseline and inventory

| Slice | Published evidence | Current result |
| --- | --- | --- |
| S1 — contracts, causal identity and state machine | `116e248`; [Slice 1 report](imp-06-slice-1-report.md) | Stable Tenant-qualified causal identity, source classes, append-only state facts, claim/attempt/fencing and metadata-safe Event subject. |
| S2 — Schema 12 durable foundations | `390e960`; `src/control-plane/shared-state/native-core-durable.ts` | Durable Activation identity/state/claim/attempt/handoff/watermark, causal uniqueness and transaction integration. |
| S3 — target/authority preparation and recoverable handoff | `7be46f0`; [Slice 3 report](imp-06-slice-3-report.md) | Exact historical revision, target snapshot, Delegation revalidation, prepared handoff and atomic prepared-state package. |

`src/native-core/activation.ts` distinguishes `event`, `channel`,
`schedule`, `manual` and `system` causes, but no service consumes a
normalized external observation to create and claim an Activation.
`PostgresNativeCoreRepository` implements `createActivation`,
`claimActivation`, `transitionActivation`, `prepareActivationHandoff`,
and durable watermark read/write. The only Activation application coordinator
is `ActivationPreparationServiceV1`; it requires an existing `resolving`
Activation and does not create occurrences or invoke admission.

`AutomationDefinitionV1` currently stores only `kind`, `definition_key`,
an opaque `configuration` object and governed references. It has no typed
rule, timezone/DST, calendar, intended-instant, missed-work, catch-up or
coalescing semantics. There is no schedule evaluator, timer loop, trigger
receiver, restart reconciliation service or Activation Product API projection.
Existing `admitWorkforceRun` and
`DelegatedWorkforceRunAdmissionService` remain separate canonical admission
machinery and are not called from the Activation path.

## Required investigation

### Trigger and external occurrence processing

Activation contracts support deterministic source-specific keys and durable
creation/replay. The repository has no canonical Trigger/Channel observation
adapter, no external observation ingestion path, no orchestration from a source
observation to `createActivation`, and no restart processor. This is remaining
S5 adapter work for B02/CD02/B13/CD12, not a reason to create an Observation
aggregate.

### Schedule processing

Schedule definitions are revision-bound generic Automation definitions; schedule
causal identity accepts `schedule_key`, `schedule_digest`, `intended_at`,
timezone and optional calendar digest. Schema 12 persists a Tenant- and
exact-Automation-qualified recovery watermark with CAS generation and
idempotency. It does not calculate occurrences, claim ranges, apply a
missed-work policy, bound catch-up, suppress duplicate due instants, or recover
after restart. The missing layer is the bounded schedule evaluator and
reconciliation primitive mapped to S4.

### Activation lifecycle and handoff

The durable repository owns individual Activation mutations; S3 owns only
preparation from `resolving` to `prepared`. No existing service owns
occurrence-to-Activation-to-resolving orchestration. Prepared handoff is
persisted atomically but neither delivered to admission nor reconciled to an
admission decision/Run. Those downstream facts remain distinct from prepared
state.

### External adapters, OpenClaw and Product API

OpenClaw remains an engine adapter
(`src/engines/openclaw-engine-adapter.ts`) and is not an Automation,
Activation or admission owner. There is no provider-neutral Activation
observation adapter. `ProductApiClient` has Automation projections but no
Activation list/detail projection; under the frozen mapping a safe read
projection belongs to S5, after bounded S4 recovery proof. No route is proposed.

## B01–B13 reconciliation

| Blocker | Original problem | Canonical owner / mapped Slice | Current status and evidence | Remaining work | Disposition |
| --- | --- | --- | --- | --- | --- |
| B01 | No Activation identity/lifecycle/history. | Activation; S1+S2 | Contracts plus `acs_activations` and append-only facts exist. | None. | RESOLVED |
| B02 | No normalized trusted source observation. | source adapter + Activation normalization; S1+S5 | Source-class contracts exist. No adapter/ingestion exists. | S5 provider-neutral observation adapter. | PARTIALLY RESOLVED |
| B03 | No causal key/conflict/durable claim. | Activation; S1+S2 | Deterministic identity, uniqueness, claim/attempt and fencing are durable. | None. | RESOLVED |
| B04 | No schedule rule, watermark or missed-work reconciliation. | Automation definition + S4 evaluator; S1+S4 | Watermark storage and schedule source identity exist. | Freeze semantics/policy, then S4 bounded reconciliation. | PARTIALLY RESOLVED |
| B05 | Pre-admission shorthand conflicted with post-admission runtime intent. | existing admission/runtime; S1+S3 | Preparation stops at handoff; `RuntimeExecutionIntentV2` remains downstream. | None. | RESOLVED |
| B06 | Authority not connected to Activation. | Delegation/Governance; S1+S3 | S3 adapter uses canonical resolver; revoked/expired/cross-Tenant fail closed. | Admission decision remains downstream by design. | RESOLVED |
| B07 | Exact target/config not connected to Activation. | Automation/target owners; S1+S3 | PINNED preservation and resolved snapshot adapter are present; current head cannot alter history. | Unsupported target remains fail closed. | RESOLVED |
| B08 | No recoverable Activation-to-admission-to-Run correlation. | Activation handoff + admission/Run; S2+S3 | One durable prepared handoff and atomic correlation infrastructure exist. | Submission/reconciliation and admitted/Run correlation downstream. | PARTIALLY RESOLVED |
| B09 | Retry/cancellation layers not separated. | source/Activation/admission/runtime; S1+S3+S6 | Identity, claim/attempt, preparation and runtime remain separate. | End-to-end cancellation/recovery conformance in S6. | PARTIALLY RESOLVED |
| B10 | Exact Workflow admission support incomplete. | Workflow/admission; S3+S6 | No invented Workflow history/FK; missing target fails closed. | Canonical Workflow-owner proof. | REJECTED |
| B11 | Activation Event/Evidence vocabulary absent. | shared Event/Evidence; S2+S6 | `activation` Event subject and transaction integration exist. | Full admission-to-Run provenance closure in S6. | PARTIALLY RESOLVED |
| B12 | Usage/Cost lacked Activation correlation. | Economics; S6+IMP-10 | No ledger or budget mutation added. | Attribution contract by Economics owner. | ACCEPTED DEFERRED |
| B13 | No provider-neutral observation adapter. | adapter seam; S5 | OpenClaw stays replaceable; no observation adapter exists. | S5 adapter and capability-fail-closed proof. | PARTIALLY RESOLVED |

## CD01–CD14 reconciliation

| Contract Delta | Required semantic change | Owner / Slice | Implemented contract and behavior | Remaining work | Disposition |
| --- | --- | --- | --- | --- | --- |
| CD01 | Stable identity/history. | Activation; S1+S2 | Exact causal identity and durable history. | None. | RESOLVED |
| CD02 | Normalized observation with source identity/digest/Evidence. | source adapter; S1+S5 | Source types/digests validate. | Ingestion adapter and delivery correlation. | PARTIALLY RESOLVED |
| CD03 | Revision-owned Trigger/Schedule keys. | Automation; S1 | Immutable definition key/configuration under exact revision. | Typed schedule semantics are S4 prerequisite. | RESOLVED |
| CD04 | Causal key and typed replay conflict. | Activation; S1+S2 | Deterministic identity and conflict/idempotency persistence. | None. | RESOLVED |
| CD05 | Claim/idempotency/Event/outbox. | shared transaction + Activation; S2 | Fencing, idempotency and atomic durable effects. | None. | RESOLVED |
| CD06 | Lifecycle outcomes separate from Runtime. | Activation; S1+S2 | Append-only state facts and terminal vocabulary. | Runtime remains separate. | RESOLVED |
| CD07 | Current authority revalidation. | Delegation; S1+S3 | S3 uses canonical resolver and fails closed. | Admission captures admitted authority later. | RESOLVED |
| CD08 | Exact target/config snapshot. | target/config owners; S1+S3 | Exact historical revision and immutable target snapshot. | Unsupported targets fail closed. | RESOLVED |
| CD09 | Recoverable admission/Run handoff. | Activation + admission/Run; S2+S3 | Durable prepared handoff is idempotent and atomic. | Submission, reconciliation and Run correlation. | PARTIALLY RESOLVED |
| CD10 | Watermark/range proof and bounded reconciliation. | schedule evaluator; S4 | Watermark durability only. | Typed policy and S4 recovery proof. | PARTIALLY RESOLVED |
| CD11 | Separate retry/cancellation layers. | each canonical owner; S1+S3+S6 | Model separation is enforced. | Full cross-layer conformance. | PARTIALLY RESOLVED |
| CD12 | Provider-neutral observation/evaluator adapter. | adapter seam; S5 | Provider non-ownership preserved. | Adapter contract and replacement proof. | PARTIALLY RESOLVED |
| CD13 | Metadata-safe Event/Evidence subject. | shared infrastructure; S2+S6 | `activation` Event subject and atomic safe records. | Full downstream provenance closure. | PARTIALLY RESOLVED |
| CD14 | Usage/Cost correlation without economics. | Economics; S6+IMP-10 | No economic authority added. | Attribution contract by Economics owner. | ACCEPTED DEFERRED |

## ADR-17-035 through ADR-17-042 reconciliation

| ADR | Decision from frozen mapping | Implementation owner / evidence | Remaining downstream work | Conformance |
| --- | --- | --- | --- | --- |
| ADR-17-035 | Source-class causal identity and stable ACS ID. | S1/S2; `activation.ts`, causal uniqueness. | None. | CONFORMANT |
| ADR-17-036 | Definitions remain Automation-owned; observations differ from Activation. | S1 types and exact Automation revision. | S5 source adapters. | PARTIAL — EXPECTED DOWNSTREAM |
| ADR-17-037 | Activation-specific claim/fencing/idempotency reuse. | S1/S2 durable claim/attempt/fence. | None. | CONFORMANT |
| ADR-17-038 | Preserve PINNED or capture canonical resolved target. | S3 adapter and historical snapshot proof. | Unsupported targets stay fail closed. | CONFORMANT |
| ADR-17-039 | Prepare/revalidate authority; admission decides/captures admitted snapshot. | S3 authority adapter over Delegation. | Admission decision/snapshot downstream. | PARTIAL — EXPECTED DOWNSTREAM |
| ADR-17-040 | Watermark/range proof and bounded missed-work semantics. | Schema 12 watermark persistence. | Typed schedule policy and S4 proof. | PARTIAL — EXPECTED DOWNSTREAM |
| ADR-17-041 | Durable idempotent handoff to admission with recovery. | S2/S3 prepared handoff transaction. | Submit/query/reconcile admission and Run correlation. | PARTIAL — EXPECTED DOWNSTREAM |
| ADR-17-042 | ACS identity with provider-neutral/OpenClaw boundary. | S1 source identity; OpenClaw external. | S5 adapter. | PARTIAL — EXPECTED DOWNSTREAM |

No ADR violation was found.

## Dependency graph and next canonical Slice

```text
S1 contracts ──> S2 durable foundation ──> S3 preparation
                                                ↓
              schedule definition/policy freeze ──> S4 schedule occurrence/recovery
                                                        ↓
                                                   S5 adapter/projection
                                                        ↓
                                                   S6 closure
```

**Slice ID:** `S4`  
**Title:** `Schedule occurrence and recovery machinery`  
**Dependencies:** S3 preserves scheduler/Runtime ownership; exact schedule
definition semantics and missed-work policy representation are accepted.  
**Dependencies satisfied:** **NO**

The first S4 dependency is satisfied: S3 adds no scheduler, worker or Runtime
owner. The second is not: generic `AutomationDefinitionV1.configuration` has
no accepted typed representation for rule/time basis/calendar/missed-work/
bounded catch-up/coalescing. REQ-09 requires unknown or absent policy to fail
closed. CTO must freeze that contract before S4 implementation.

**Mapped blockers:** B04.  
**Mapped contract deltas:** CD10; CD03 is an upstream revision-key dependency.  
**Mapped ADRs:** ADR-17-040; ADR-17-036 is a boundary dependency.  
**Required owners:** exact Automation revision owns authored schedule semantics;
Activation repository owns occurrence identity/state and watermark durability;
a bounded evaluator may compose those owners. It must not become an Automation,
Activation, Runtime, worker or admission owner.

**Implementation scope after a separate CTO GO:** validate exact schedule
semantics, deterministically evaluate due ranges, use watermarks and Activation
causal uniqueness for bounded recovery, record skip/coalesce/reject outcomes and
advance coverage only after recoverable durable outcomes.

**Explicit exclusions:** scheduler runtime loop/timer service, Trigger/Channel
processor, admission invocation, Run/Workflow creation, Runtime intent, worker
control, OpenClaw execution, Product API routes, Schema 13 and Schema 12
changes.

**Required validation after authorization:** exact revision reconstruction;
timezone/DST/calendar vectors; missing/ambiguous policy fail-closed; bounded
missed-work outcomes; duplicate suppression across evaluator restart; watermark
CAS/fencing; Tenant isolation; no admission/Run/worker invocation;
Event/Evidence/outbox/idempotency recovery; PostgreSQL Schema 12 proof.

**Reason this is next:** the frozen mapping orders S4 immediately after S3 and
the only S4-specific missing foundation is schedule semantics/policy. S5 and S6
are later mapped work and cannot substitute for that blocked prerequisite.

## Authority decisions

| Question | Decision | Evidence |
| --- | --- | --- |
| Does the next Slice authorize scheduler runtime? | **NO** | S4 permits an evaluator boundary and durable range proof; it excludes execution/worker control and forbids scheduler-owned Automation/Activation. Watermark storage is not a loop or queue. |
| Does the next Slice authorize admission invocation? | **NO** | S4 maps schedule occurrence/recovery only. Prepared handoff remains distinct from submission; current admission is downstream. |
| Does the next Slice authorize Run/Workflow creation? | **NO** | S4 excludes execution; REQ-09 keeps Run/Workflow and `RuntimeExecutionIntentV2` downstream of admission. |
| Is Schema 13 required? | **NO** | Schema 12 already provides causal Activations, state facts, claims and exact-revision watermarks. The missing prerequisite is contract/policy definition, not persistence. `Schema 13: NOT REQUIRED`. |

## Event, Evidence and security review

Activation remains a metadata-safe closed Event subject. `activation.ts`,
`runtime.ts` and `evidence.ts` validate inputs with
`assertNoSecretMaterial`; Evidence classifications include
`secret_redacted`; the durable repository records Event/Evidence/outbox only
through the shared transaction path.

The accepted preparation snapshot contains exact references and fingerprints,
not credentials, secret values, raw provider/executor payloads, Memory content,
unrestricted delegated authority or Delegation reason material. Event and
Evidence remain correlation/provenance infrastructure and never become the
canonical Activation owner.

## Traceability and recommendation

| Required review | Result |
| --- | --- |
| REQ-09 traceability | PASS — [REQ-09](../req-09/README.md) and schedule/admission/evidence records reconciled. |
| REQ-12 traceability | PASS — [REQ-12](../req-12/README.md), blocker traceability and dependency plan reconciled. |
| B01–B13 | PASS — 13/13 reconciled exactly once. |
| CD01–CD14 | PASS — 14/14 reconciled exactly once. |
| ADR-17-035..042 | PASS — 8/8 reconciled; no violation. |
| Slice mapping / repository evidence / links | PASS |
| Dependency check | PASS — S4 is selected by the frozen mapping and its unsatisfied schedule-semantics prerequisite is explicitly detected. |
| `git diff --check` | PASS |
| Documentation-only scope | PASS |

```text
EPIC-17-IMP-06
POST-SLICE-3 RECONCILIATION
Baseline: 7be46f0
Schema: 12 / CANONICAL
REQ-09: PASS
REQ-12: PASS
B01–B13: 13/13 reconciled
CD01–CD14: 14/14 reconciled
ADR-17-035..042: 8/8 reconciled
Next canonical Slice: S4 — Schedule occurrence and recovery machinery
Dependencies: BLOCKED
Scheduler runtime authority: NO
Admission invocation authority: NO
Run/Workflow creation authority: NO
Schema change required: NO
Scope violation: NONE
Recommendation: BLOCKED — CTO must freeze exact schedule semantics and missed-work policy representation before S4 GO
Implementation performed: NONE
```
