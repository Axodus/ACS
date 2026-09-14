# EPIC-17-IMP-06 — Activation / Causal Occurrence Boundary

**Status:** `GATE PREPARATION / CTO REVIEW READY`
**Date:** September 14, 2026
**Authority:** repository investigation and documentation only
**Upstream:** IMP-05 complete, accepted and published at `c6a72dc`; Schema 11 is canonical
**Hold:** functional implementation, Schema 12, migration 11→12, scheduler, trigger processing, Run/Workflow creation and OpenClaw execution.

## Mission and non-negotiable ownership

Activation is a Tenant-scoped durable causal occurrence that evaluates one exact Automation revision for a possible admission handoff. It is not execution and it owns neither Automation configuration, a source observation, an admission decision, a Run, a Workflow, an executor, an Event or Evidence.

```text
Trigger / Schedule / External observation
                  ↓
              Activation
                  ↓
 exact Automation revision + causal inputs
                  ↓
 target/configuration/authority preparation
                  ↓
       existing admission boundary
                  ↓
       existing Run / Workflow machinery
```

The phrase `execution intent` before admission denotes a logical admission request only. Implemented `RuntimeExecutionIntentV2` remains post-admission and post-assignment. IMP-06 must not create a competing pre-admission runtime-intent owner.

| Concern | Canonical owner | IMP-06 boundary |
| --- | --- | --- |
| Automation identity, revision and lifecycle | Schema 11 Automation owner | Activation fixes one exact revision/fingerprint; it never reloads the current head as historical input. |
| Trigger/Schedule authored definition | exact Automation revision | stable definition key and immutable representation/digest; no independent aggregate is demonstrated. |
| Trigger observation/Schedule occurrence | future Activation boundary | normalized causal input, not configuration or execution. |
| Authority, policy, approval and Delegation | Governance, Delegation and admission owners | Activation prepares/revalidates current inputs; admission decides. |
| effective configuration and target resolution | canonical target/configuration/admission owners | resolution is captured before accepted admission; Activation never falls back to `latest`. |
| Run, Workflow, Task, Assignment and Attempt | existing execution domains | causal linkage only. |
| workers, leases, fencing and runtime recovery | existing Runtime owner | execution-only; not Activation state. |
| Event, Evidence, outbox and idempotency | existing shared infrastructure | facts and correlations; never substitute Activation identity. |
| Usage, Cost and settlement | Accounting/Economics | correlation only. |
| OpenClaw or another provider | optional adapter | may observe/evaluate/execute bounded ACS work; owns no canonical history. |

## Current-state inventory

| Repository evidence | Current state | Gate implication |
| --- | --- | --- |
| `src/native-core/automation.ts`, `src/control-plane/automation-service.ts`, `src/control-plane/shared-state/native-core-durable.ts` | Automation has durable identity/history, immutable revisions, CAS head and append-only lifecycle under Schema 11. | Reuse its exact revision/fingerprint; no Activation may select the later current head. |
| `src/native-core/delegation.ts`, `src/control-plane/delegation-authority-resolver.ts`, `src/control-plane/delegated-workforce-run-admission.ts` | Delegation and admission already own authority evaluation, attenuation, revocation and admitted snapshots. | Reuse; no second admission engine or materialized Automation authority. |
| `src/native-core/runtime.ts`, `src/native-core/runtime-compilation.ts` | `RuntimeExecutionIntentV2` requires admitted Run, Task, Assignment and exact membership inputs. | A pre-admission logical request must map to admission concepts without moving runtime intent upstream. |
| `src/control-plane/shared-state/native-core-durable.ts` | Shared PostgreSQL transaction patterns already combine idempotency, Event/Evidence and outbox. | Candidate transaction authority for Activation; no parallel store. |
| `src/workers/durable-runtime-state.ts`, `src/native-core/runtime.ts` | Runtime owns job claims, leases, fencing, attempts and execution recovery. | Analyze patterns for reuse, but retain distinct occurrence claims and no worker ownership in Activation. |
| `src/engines/agent-engine.ts` | `schedulingEligible` is a target health/capability observation. | It is neither schedule truth nor authorization. |
| `src/engines/openclaw-engine-adapter.ts` | OpenClaw is a replaceable engine adapter with bounded target/execution operations. | Its job/run/message IDs can be external causal references only. |
| repository search for Activation/Trigger/Schedule/watermark | No canonical Activation contract, durable occurrence identity, source observation owner, schedule watermark or Activation-to-Run link exists. | Demonstrates the logical and physical gaps; it grants no implementation authority. |

## Causal identity and immutable history candidate

Every Activation must contain a stable `activation_id` and immutable causal/decision history. Deduplication is not a single universal source formula. The canonical scope is Tenant, stable Automation identity, stable Trigger/Schedule source key where applicable, exact Automation revision/fingerprint and a source-specific logical occurrence key.

| Source class | Candidate deterministic causal material | Immutable primary evidence | Failure rule |
| --- | --- | --- | --- |
| external/internal event | trusted issuer/namespace, logical source event ID, source key, payload digest, occurred/received times | normalized observation plus authentication/Evidence refs | missing trusted identity or conflicting digest fails closed |
| Channel observation | exact Channel/Connection refs, accepted delivery/source identity, logical message/event ID, digest | authentication/authorization Evidence | delivery/Channel refs grant no authority |
| schedule occurrence | stable schedule key, exact schedule representation/digest, intended due instant, timezone/calendar basis | evaluator Evidence plus future durable watermark/range proof | unknown time semantics or missed-work policy fails closed |
| manual/system request | authenticated actor/system identity, supplied Tenant-qualified idempotency key, requested occurrence key, purpose | command provenance and policy decision | absent identity/key or semantic conflict fails closed |

The first durable occurrence claim binds the exact Automation revision and normalized cause digest. Reusing the causal key with another requested revision, source identity, intended instant or semantic digest is a typed idempotency conflict. A retry, process restart or recovery performs lookup by the same key; it never creates a new logical Activation. Intentional reprocessing requires a new occurrence identity and provenance.

One primary cause produces one canonical Activation history, at most one accepted admission lineage and at most one resulting Run correlation. This is a canonical-state guarantee, not an exactly-once claim for physical execution or external side effects.

## Candidate Activation state, claim and retry model

The physical topology remains a Schema 12 decision, but the semantic concepts must stay separate:

| Concept | Candidate meaning | Must not become |
| --- | --- | --- |
| causal identity | immutable logical occurrence identity bound to revision/fingerprint and cause digest | a worker job, provider job ID or Event ID |
| claim/lease | bounded, recoverable evaluator ownership for one occurrence | permanent occurrence ownership or a Runtime execution lease |
| processing attempt | auditable evaluation attempt, including stale/lost-claim outcomes | a second logical Activation |
| Activation decision/state | durable outcome: pending evaluation, terminal pre-admission outcome, or admission linkage | a Run/Task/Attempt lifecycle |
| admission handoff state | stable correlation/idempotency state around the existing admission call | a parallel admission engine |

Candidate semantic phases are: observed and claimed; eligibility/authority/configuration resolution; terminal rejection/cancellation/expiry/skip/coalescence without admission; or accepted admission linkage. Exact enum names, transition topology and cancellation ordering remain ADR decisions.

| Retry class | Identity reused | Owner | Prohibited result |
| --- | --- | --- | --- |
| source delivery | same causal occurrence/Activation | source adapter plus Activation | a new Activation for the same event |
| Activation evaluation | same Activation and cause digest | Activation | refreshing revision or silently changing authority basis |
| admission handoff | same Activation and downstream idempotency/correlation key | Activation plus existing admission | duplicate admitted Run after an uncertain response |
| execution | admitted Run/Task/Attempt snapshot | Runtime | a new Activation or silent re-resolution |
| re-admission | an explicit new decision with linked snapshot | existing admission | representing a material change as retry |

Runtime leases/fencing protect execution assignments and do not protect schedule scans or Activation ownership. The physical design should reuse proven lease/CAS/fencing concepts only when they fit occurrence processing and without changing Runtime contracts.

## Target, configuration and authority boundary

| Automation target mode | Activation responsibility | Historical rule |
| --- | --- | --- |
| `PINNED` | preserve the exact target already recorded in the Automation revision and verify that it is an admission-capable canonical target | retain the exact target reference; no substitution with `latest` |
| `RESOLVED_AT_ACTIVATION` | invoke the canonical resolution owner using the stored deterministic policy; capture one exact resolved reference before accepted admission | resolution failure or ambiguity fails closed; current state is never re-resolved to explain history |

Activation observes Automation lifecycle and revalidates current policy and direct/delegated authority before admission. Automation enablement, a source delivery, due time, Channel/Connection reference, credential availability or `schedulingEligible` grant neither authority nor execution permission.

Activation may prepare the exact Delegation/authority context, but the canonical admission owner alone decides admission and captures the admitted authority snapshot. Revocation or expiry before a new Activation blocks the path. A historical admitted Run remains governed by its immutable admission snapshot. Opaque credential leases remain with their existing owner; Activation never materializes credential/secret data.

The known Workflow historical/reference gap remains fail-closed: an unsupported target kind cannot be admitted merely to complete an Activation path.

## Admission handoff and historical reconstruction candidate

```text
candidate occurrence
  → normalize and durably claim cause
  → load exact Automation revision and observe lifecycle
  → validate Trigger/Schedule applicability
  → revalidate policy and direct/delegated authority
  → resolve target and effective configuration
  → freeze Activation/admission inputs
  → call existing admission with stable idempotency/correlation
  → persist accepted/rejected linkage with Event/Evidence/outbox
  → existing coordination and runtime compilation
```

The handoff is atomic when it shares the transaction authority; otherwise it must be recoverably consistent through durable outbox and idempotent admission. There must be no accepted Run whose Activation causation is irretrievably unknown. Recovery before admission resumes the same Activation. Recovery after admission reads and follows existing Run/runtime state and must not submit another admission because an evaluator lost a response.

Historical reconstruction uses the immutable cause, exact revision/fingerprint, lifecycle observation, target/configuration snapshot references, authority/policy decisions, admission correlation and downstream linkage. It never reruns a schedule, resolves current `latest`, revalidates current authority or fetches current secrets to explain a past decision.

## Schedule recovery candidate

Schedule recovery is a gate concern, not scheduler authorization. An authored schedule must carry normalized rule/schema-version, timezone/DST semantics, optional calendar/exclusion version/digest, applicability window, stable source key, missed-occurrence policy, bounded catch-up and concurrency/coalescing policy.

```text
last durable watermark/range proof = T1
process resumes at T5
  → derive eligible T2/T3/T4 using the exact schedule semantics
  → apply the authored missed-work and bound policy
  → claim every emitted occurrence by deterministic causal key
  → record skipped/coalesced/rejected outcomes
  → advance durable range only once outcomes are recoverable
```

No universal `skip`, replay or coalesce policy is accepted. Each must be explicit in authored schedule semantics; a required but unknown policy fails closed. Wall-clock process memory or OpenClaw state cannot be schedule history truth. A schedule change cannot mutate an already materialized occurrence identity. Automation disable/archive blocks future occurrence admission but retains historical Activation and Run facts.

## Provider/OpenClaw and Event/Evidence boundary

OpenClaw or a replacement adapter may surface a time/event observation, perform evaluator work assigned by ACS using a stable occurrence key, execute already-admitted work through existing engine/worker interfaces and return normalized observations/results. It may not own Automation revisions, schedule truth, Activation identity, deduplication truth, authority decisions, Agent identity, admission, Run history or Cost.

The future Event/Evidence vocabulary should add an `activation` subject and safe causal correlations. It must distinguish observed occurrence, rejected Activation, accepted admission and completed execution. Payloads remain metadata-safe: no secret, credential material, Memory content, raw provider/executor payload or live authority-provider state. Usage/Cost stays Run-based; Activation adds correlation only where admitted work is attributable.

## Schema 12 physical candidate

Schema 12 is a candidate only. No migration or persistence implementation is authorized. The physical-design review must decide whether these concerns require separate relations or can reuse existing owners without ownership leakage.

| Candidate concern | Required invariant | Referential-integrity direction |
| --- | --- | --- |
| Activation identity/head/state | Tenant-qualified stable ID; exact Automation revision/fingerprint; immutable causal/decision history | foreign keys only to internal Activation entities and Tenant where historical reconstruction permits; Automation revision reference must remain reconstructible |
| observations/occurrences | source-specific identity, digest, timestamps, Evidence refs and duplicate-delivery correlation | external source/Channel/provider refs are historical external references, not ownership FKs |
| claims and processing attempts | bounded claim, fencing/attempt history and recoverable stale-claim handling | separate from Runtime job/lease ownership |
| admission handoff | stable idempotency/correlation, admitted/rejected linkage and recovery proof | references existing admission/Run owners; no new admission aggregate |
| schedule watermarks/range proof | exact rule/time basis, covered range, emitted outcomes and bounded catch-up proof | schedule definition belongs to exact Automation revision; no independent scheduler owner by default |
| Event/Evidence/outbox | same transactional authority where applicable, redacted payload and provenance chain | reuse existing infrastructure; no second Event/Evidence store |

## REQ-12 reconciliation — blockers

| Blocker | Requirement and repository evidence | Current owner / actual gap | Gate disposition | Proposed slice | Acceptance evidence |
| --- | --- | --- | --- | --- | --- |
| `E17-R09-B01` | REQ-09 requires durable causal identity/lifecycle; repository has no Activation owner. | IMP-06 candidate domain; identity/history absent. | `NEW` | S1, S2 | stable Tenant ID, exact revision/fingerprint, reconstructible causal/decision history |
| `E17-R09-B02` | source normalization and trusted keys required; no Trigger/Schedule/Channel/Manual observation contract. | source adapters plus future Activation; normalized input absent. | `NEW` | S1, S3 | trusted source shape, Evidence refs, duplicate delivery correlation |
| `E17-R09-B03` | one occurrence key, digest conflict rule and durable claim required; Runtime claim is execution-specific. | Activation occurrence boundary; no compatible durable claim. | `ADAPT` | S1, S2 | concurrent replay yields one Activation; changed semantic key conflicts; recoverable claim |
| `E17-R09-B04` | restart-safe schedules require rule owner, watermark and reconciliation; none exists. | authored definition in Automation; evaluator/recovery absent. | `NEW` | S3 | range/watermark proof, explicit missed-work policy, bounded deterministic reconciliation |
| `E17-R09-B05` | implemented runtime intent is post-admission. | existing Runtime owner; pre-admission logical request mapping absent. | `REUSE` | S1, S4 | no competing runtime type; logical request maps only to existing admission seam |
| `E17-R09-B06` | authority/lifecycle/policy revalidation lacks Activation connection. | Governance/Delegation/admission; causal preparation/handoff absent. | `ADAPT` | S1, S4 | revoked/expired authority blocks new admission; no authority materialization |
| `E17-R09-B07` | REQ-03 snapshot and REQ-08 target modes are not tied to Activation/admission. | canonical target/configuration owners; immutable resolution capture absent. | `ADAPT` | S1, S4 | pinned preservation; resolved policy capture; ambiguity fails closed |
| `E17-R09-B08` | no recoverably idempotent Activation-to-admission-to-Run correlation. | Activation plus existing admission; handoff absent. | `EXTEND` | S2, S4 | atomic or recoverable handoff; one causal Run correlation |
| `E17-R09-B09` | retry/cancellation/recovery layers are not contractually separated. | Activation and Runtime split; Activation policy absent. | `ADAPT` | S1, S4 | retry matrix; pre/post-admission cancellation boundary; no worker mutation |
| `E17-R09-B10` | Workflow historical target reference/admission support is incomplete. | Workflow/admission owners; unsupported exact target. | `REJECT` until owner evidence exists | S4 conformance | unsupported Workflow target fails closed; no convenience FK or invented history |
| `E17-R09-B11` | Activation Event/Evidence subject/vocabulary absent. | shared Event/Evidence; subject/correlation absent. | `EXTEND` | S2, S5 | metadata-safe subject/events and complete provenance chain |
| `E17-R09-B12` | Usage/Cost lacks Automation/Activation correlation. | Accounting/Economics; correlation absent. | `ACCEPTED DEFERRED` | S5, IMP-10 | Run-based ownership preserved; correlation only after owner contract |
| `E17-R09-B13` | no provider-neutral observation adapter; OpenClaw is execution/target adapter only. | adapter boundary; observation contract absent. | `ADAPT` | S3 | adapter normalizes observations; provider IDs remain external refs |

## REQ-12 reconciliation — contract deltas

| Delta | Final owner and gate treatment | Proposed slice | Acceptance evidence |
| --- | --- | --- | --- |
| `E17-R09-CD01` Activation identity/history | `NEW`: Tenant-scoped ID and immutable causal/decision history. | S1, S2 | exact reconstruction and revision binding |
| `E17-R09-CD02` normalized cause observation | `NEW`: source-specific normalized observation, identity, digest, times and Evidence refs. | S1, S3 | trusted input and duplicate-delivery correlation |
| `E17-R09-CD03` Trigger/Schedule specification keys | `REUSE`: exact Automation revision owns stable source key/immutable digest. | S1 | definitions remain configuration, not occurrence/scheduler |
| `E17-R09-CD04` occurrence key/conflict | `ADAPT`: source-specific keys with fail-closed semantic conflict. | S1, S2 | deterministic replay and conflict tests |
| `E17-R09-CD05` claim/idempotency/Event/outbox | `ADAPT`: shared transaction authority plus distinct occurrence claim. | S2 | claim recovery and atomic Event/outbox evidence |
| `E17-R09-CD06` lifecycle outcomes | `NEW`: Activation outcomes separate from Automation and Runtime lifecycle. | S1, S2 | rejection/cancel/expiry/skip/coalesce history |
| `E17-R09-CD07` authority revalidation | `REUSE`: Governance/Delegation/admission remain owners. | S1, S4 | current checks before admission; no grant materialization |
| `E17-R09-CD08` target/config snapshot | `ADAPT`: canonical resolution captured immutably. | S1, S4 | pinned/resolved capture, no latest replay |
| `E17-R09-CD09` admission/Run handoff | `EXTEND`: stable causal correlation through existing admission. | S2, S4 | idempotent recoverable handoff, one Run correlation |
| `E17-R09-CD10` schedule watermark/reconciliation | `NEW`: durable range proof and bounded policy semantics. | S3 | recovery/deduplication tests with exact time basis |
| `E17-R09-CD11` retry/cancellation separation | `ADAPT`: source, Activation, admission and Runtime retain separate identities. | S1, S4 | no re-admission or worker recovery leak |
| `E17-R09-CD12` provider-neutral adapter | `ADAPT`: bounded observation/evaluator adapter; OpenClaw non-owner. | S3 | provider swap and fail-closed missing capability |
| `E17-R09-CD13` Event/Evidence subject | `EXTEND`: add safe Activation provenance correlation. | S2, S5 | subject vocabulary/redaction/atomicity |
| `E17-R09-CD14` Usage/Cost correlation | `ACCEPTED DEFERRED`: Accounting/Economics retains authority. | S5, IMP-10 | no new ledger; later explicit correlation contract |

## ADR-17-035–042 coverage

The titles below preserve the REQ-09 candidate records. Each final ADR must map to `ACCEPTED`, `SUPERSEDED_BY`, `REJECTED` or `DEFERRED_WITH_BLOCKER` before code.

| ADR | Existing candidate | Alternatives considered | Repository evidence | Gate recommendation |
| --- | --- | --- | --- | --- |
| `ADR-17-035` | Activation logical identity, causal history and representation topology | universal key; source-specific causal keys; provider-owned ID | no Activation owner; shared idempotency exists; REQ-09 requires source-specific facts | accept source-specific deterministic causal keys and ACS `activation_id`; defer physical topology to Schema 12 |
| `ADR-17-036` | Trigger/Schedule authored specifications versus external observations and scheduler adapters | independent Trigger/Schedule aggregate; Automation revision-owned definitions; adapter-owned definitions | Schema 11 Automation revisions exist; no scheduler/occurrence owner | accept revision-owned definitions plus normalized observations; reject adapter/independent ownership absent evidence |
| `ADR-17-037` | logical occurrence idempotency, conflict and concurrency rules | Runtime-job identity; durable occurrence claim; best-effort in-memory dedupe | Runtime has lease/fencing but only for execution; shared transaction patterns exist | accept durable Tenant-qualified occurrence identity/claim and semantic conflict; adapt lease concepts without reuse of runtime identity |
| `ADR-17-038` | Activation-to-admission handoff and post-admission `RuntimeExecutionIntentV2` ordering | Activation decides admission; pre-admission runtime intent; existing admission handoff | Runtime intent is post-admission; Delegated admission exists | accept logical admission request plus existing admission; reject second admission engine/runtime intent |
| `ADR-17-039` | schedule watermark, missed-occurrence policy and restart reconciliation | wall-clock retry; global catch-up default; exact durable range proof | no scheduler/watermark exists; REQ-09 requires exact time semantics | accept durable watermark/range proof and explicitly authored bounded policy; reject implicit replay/default |
| `ADR-17-040` | Activation cancellation/retry versus Runtime cancellation/recovery | unified retry lifecycle; separated source/Activation/admission/Runtime layers | Runtime owns attempts/leases/recovery; REQ-09 retry matrix separates layers | accept layered identities and cancellation boundary; no Activation worker manipulation |
| `ADR-17-041` | OpenClaw/provider-neutral observation and execution adapter boundary | provider canonical ownership; ACS canonical state with adapter; OpenClaw-only special case | OpenClaw adapter exists; no provider-neutral observation contract | accept ACS ownership with provider-neutral bounded adapter; reject provider IDs as canonical identity |
| `ADR-17-042` | Activation Evidence and Usage/Cost correlation | Activation ledger; Event-only history; shared Evidence/Run-based economics | Event/Evidence/outbox exist; Economics is Run-based | accept safe Activation subject/correlation; defer Economics correlation to owner contract and retain Run-based authority |

## Proposed implementation slices after separate CTO decisions

| Slice | Proposed scope | Explicit exclusions | Minimum evidence |
| --- | --- | --- | --- |
| S1 — contracts and causal state | Activation contracts, source-specific causal keys, lifecycle/outcome semantics, retry/cancellation separation, target/authority boundary | persistence, migration, scheduler, provider runtime, Run creation | stable identity, conflict rules, exact revision binding, no execution side effects |
| S2 — Schema 12 durable identity/history | only after physical design and migration GO: Activation, immutable history, claims/attempts, idempotency, Event/Evidence/outbox and handoff state | scheduler, target execution, Product API, Schema 13 | PostgreSQL Tenant isolation, CAS/claim recovery, reconstruction, atomicity |
| S3 — observations and schedule recovery boundary | normalized adapter input, source acknowledgements, schedule range/watermark policy and recovery | scheduler runtime, missed-work execution, OpenClaw execution | duplicate suppression, bounded reconciliation, provider non-ownership |
| S4 — resolution and admission handoff | current lifecycle/authority preparation, exact target/config snapshot capture, idempotent existing-admission handoff | second admission engine, Run/Workflow owner changes, Runtime intent rewrite | revoked authority rejection, no-latest capture, one admitted correlation |
| S5 — cross-domain conformance and closure | evidence/attribution mapping, Product projection decision if separately authorized, closure documentation | new execution features or economic authority | REQ-09/REQ-12 reconciliation and unresolved items explicitly deferred |

## Gate acceptance matrix

| Criterion | Result | Evidence |
| --- | --- | --- |
| required markers | `PASS` | all requested gate sections are present |
| REQ-09 traceability | `PASS` | REQ-09 model, decisions, B01–B13 and CD01–CD14 reconciled |
| REQ-12 mapping | `PASS` | IMP-06 dependency and ADR range mapped to S1–S5 |
| ADR-17-035–042 coverage | `PASS` | alternatives, repository evidence and recommendations recorded above |
| links / paths | `PASS` | repository owners and REQ-09/REQ-12 source paths named above |
| documentation-only scope | `PASS` | no functional code, schema, migration, API, scheduler or runtime change |
| Schema 12 status | `PASS` | candidate only; migration 11→12 remains unauthorized |
| git diff --check | `PASS` | tracked and untracked documentation diff is whitespace-clean |

```text
EPIC-17-IMP-06: GATE PREPARATION / CTO REVIEW READY
Functional implementation: HOLD
Schema 12 and migration 11 → 12: HOLD
Activation, scheduler, Trigger processing, Run/Workflow creation: HOLD
OpenClaw execution: HOLD
IMP-07+: BLOCKED
```
