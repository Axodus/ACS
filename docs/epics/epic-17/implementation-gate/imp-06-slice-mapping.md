# EPIC-17-IMP-06 — Definitive Blocker and Delta Slice Mapping

**Status:** `CTO REVIEW READY`
**Scope:** documentation-only decomposition after accepted ADR-17-035–042
**Excluded:** Schema 12 migration, functional persistence, Activation execution, scheduler runtime, Trigger processing, Run/Workflow creation, OpenClaw execution and IMP-07 work.

## Slice contracts

| Slice | Planned outcome after separate CTO GO | Must not enter |
| --- | --- | --- |
| S1 — Activation contracts, causal identity and state machine | native source-specific causal identity, immutable cause/revision binding, state/outcome transitions, claim/fencing contracts and resolution/admission boundary types | schema/migration, source ingestion runtime, scheduler, target/authority calls, admission, Run creation |
| S2 — Schema 12 durable Activation foundations | migration/repository only after S1 and migration GO: identity/state facts, claims/attempts, idempotency, Event/Evidence/outbox and handoff records | scheduler runtime, adapter execution, target/authority resolution, admission call, Product API |
| S3 — target/authority preparation and recoverable admission handoff | canonical target/configuration resolution and current authority preparation, then idempotent handoff to existing admission | second admission engine, authority grant, Runtime intent rewrite, Run/Workflow ownership |
| S4 — Schedule occurrence and recovery machinery | schedule evaluator boundary, durable watermark/range proof, explicit missed-work outcomes and duplicate suppression | unbounded catch-up, scheduler-owned Automation/Activation, execution/worker control |
| S5 — external adapter boundary and safe Product projection | provider-neutral observation adapter contract and, only if separately mapped/authorized, safe read projection | OpenClaw canonical state, execution, mutable Product API authority |
| S6 — cross-domain conformance and closure | REQ-09/REQ-12/ADR closure, evidence/Usage-Cost correlation disposition and boundary validation | new functionality, economic authority or IMP-07 implementation |

## Blocker mapping

| Blocker | Final owner and disposition | Slice | Closure evidence |
| --- | --- | --- | --- |
| `E17-R09-B01` | `NEW`: Activation boundary owns stable identity, state and causal history. | S1 + S2 | exact Tenant/revision/fingerprint history and restart reconstruction |
| `E17-R09-B02` | `NEW`: source adapters provide normalized source shape; Activation owns causal normalization/identity. | S1 + S5 | trusted source key/digest/Evidence, no provider-owned identity |
| `E17-R09-B03` | `ADAPT`: shared idempotency and lease patterns; Activation owns occurrence uniqueness and claim. | S1 + S2 | concurrent replay one Activation; changed semantic input typed conflict; fencing recovery |
| `E17-R09-B04` | `NEW`: schedule recovery boundary owns durable range proof, while definition remains Automation-owned. | S1 + S4 | exact time basis, watermark, bounded policy and restart reconciliation |
| `E17-R09-B05` | `REUSE`: existing admission remains the pre-admission logical-request destination; runtime intent stays downstream. | S1 + S3 | no competing runtime intent or admission owner |
| `E17-R09-B06` | `ADAPT`: Governance/Delegation/admission retain authority ownership; Activation prepares/revalidates current refs only. | S1 + S3 | revocation/expiry rejects new path; no authority materialization |
| `E17-R09-B07` | `ADAPT`: target/configuration owners resolve exact snapshots; Activation freezes result. | S1 + S3 | PINNED preservation; RESOLVED_AT_ACTIVATION capture; no latest fallback |
| `E17-R09-B08` | `EXTEND`: Activation adds one recoverable causal handoff to existing admission/Run owners. | S2 + S3 | uncertain handoff reconciliation; at most one admitted correlation |
| `E17-R09-B09` | `ADAPT`: source, Activation, admission and Runtime retries/cancellations remain separate. | S1 + S3 + S6 | pre/post-admission cancellation and recovery proof without worker mutation |
| `E17-R09-B10` | `REJECT` pending canonical Workflow historical/admission support. | S3 + S6 | unsupported target fails closed; no invented FK/history |
| `E17-R09-B11` | `EXTEND`: shared Event/Evidence gains safe Activation subject/correlation. | S2 + S6 | atomic redacted provenance chain |
| `E17-R09-B12` | `ACCEPTED DEFERRED`: Accounting/Economics remains Run-based authority. | S6 + IMP-10 | correlation need recorded; no ledger/budget/settlement addition |
| `E17-R09-B13` | `ADAPT`: provider-neutral observation contract; OpenClaw is one replaceable adapter. | S5 | external IDs are provenance only; provider swap preserves ACS identity |

## Contract delta mapping

| Contract delta | Final treatment | Slice | Acceptance evidence |
| --- | --- | --- | --- |
| `E17-R09-CD01` Activation identity/history | `NEW`: stable Tenant Activation identity and immutable causal/decision history. | S1 + S2 | identity, revision binding, reconstruction |
| `E17-R09-CD02` normalized observation | `NEW`: source-specific normalized primary cause with digest/time/Evidence. | S1 + S5 | source validation and duplicate delivery correlation |
| `E17-R09-CD03` Trigger/Schedule keys | `REUSE`: exact Automation revision owns authored stable source key/digest. | S1 | definition is not occurrence or scheduler |
| `E17-R09-CD04` occurrence key/conflict | `ADAPT`: deterministic source-specific causal key and fail-closed conflict. | S1 + S2 | replay and semantic conflict proof |
| `E17-R09-CD05` claim/idempotency/Event/outbox | `ADAPT`: shared transaction primitives with Activation-specific claim/fencing. | S2 | concurrent claim, lease expiry and atomicity |
| `E17-R09-CD06` lifecycle outcomes | `NEW`: Activation state/outcome facts separate from Automation and Runtime. | S1 + S2 | append-only outcomes and terminal transition validation |
| `E17-R09-CD07` authority revalidation | `REUSE`: canonical owners make authority/admission decisions. | S1 + S3 | current context preparation and revocation failure |
| `E17-R09-CD08` target/config snapshot | `ADAPT`: canonical resolution capture is immutable before accepted admission. | S1 + S3 | exact ref/fingerprint snapshot with no latest fallback |
| `E17-R09-CD09` admission/Run handoff | `EXTEND`: recoverable idempotent correlation to current admission. | S2 + S3 | crash recovery and one causal Run linkage |
| `E17-R09-CD10` schedule watermark/reconciliation | `NEW`: durable range proof and explicit bounded policy. | S4 | downtime/DST/restart and duplicate suppression |
| `E17-R09-CD11` retry/cancellation separation | `ADAPT`: each layer keeps its identity and owner. | S1 + S3 + S6 | no re-admission or Runtime leakage |
| `E17-R09-CD12` provider-neutral adapter | `ADAPT`: bounded observation/evaluator adapter without canonical ownership. | S5 | capability absence fail-closed and provider replacement |
| `E17-R09-CD13` Event/Evidence subject | `EXTEND`: metadata-safe Activation subject/correlation. | S2 + S6 | safe Event/Evidence/outbox proof |
| `E17-R09-CD14` Usage/Cost correlation | `ACCEPTED DEFERRED`: attribution only through existing Economics owner. | S6 + IMP-10 | no economic mutation; explicit future owner contract |

## ADR implementation mapping

| ADR | Accepted decision | First enforcing slice | Durable/closure evidence |
| --- | --- | --- | --- |
| `ADR-17-035` | source-class causal identity and stable ACS `activation_id` | S1 | causal key/fingerprint tests; Schema 12 uniqueness/reconstruction |
| `ADR-17-036` | authored definitions remain Automation-owned; observations and Activation are distinct | S1 | definition/observation/Activation separation and source typing |
| `ADR-17-037` | reuse compatible lease/fencing/idempotency patterns with Activation-specific claim state | S1 + S2 | bounded claim, stale-fencing rejection and recovery |
| `ADR-17-038` | PINNED preserved; resolved target captured via canonical owner or fails closed | S1 + S3 | exact target snapshot and historical no-latest proof |
| `ADR-17-039` | current authority context is prepared/revalidated; existing admission decides/captures snapshot | S1 + S3 | revoked/expired rejection and no second admission owner |
| `ADR-17-040` | durable watermark/range proof and explicit bounded missed-work semantics | S4 | recovery/catch-up/coalesce/skip conformance |
| `ADR-17-041` | durable idempotent handoff to existing admission with recovery | S2 + S3 | crash scenarios and one causal admission/Run correlation |
| `ADR-17-042` | ACS canonical identity with provider-neutral/OpenClaw adapter boundary | S5 | external IDs are non-canonical and replacement-safe |

## Mandatory gates

| Before | Required proof |
| --- | --- |
| S1 | Schema 12 physical design accepted; every ADR above marked accepted; no migration/code authority inferred. |
| S2 | S1 contracts accepted plus explicit migration/persistence authorization; PostgreSQL acceptance plan approved. |
| S3 | Schema 12 canonical and S2 durable identity/claim/handoff state accepted; existing admission contract remains compatible. |
| S4 | S3 has not altered scheduler/Runtime ownership; exact schedule definition semantics and policy representation are accepted. |
| S5 | S4 recovery proof is bounded; adapter design has no provider ownership or execution authority. |
| S6 | S1–S5 evidence complete; Workflow and Economics deferred/rejected items remain explicit. |

Any requirement to execute a target, create a Run, bypass/reimplement admission, let a scheduler own occurrence identity, use an OpenClaw ID as `activation_id`, or extend Schema 12 during these slices is a boundary violation and requires architecture review.

## Final mapping result

All `E17-R09-B01`–`E17-R09-B13` and `E17-R09-CD01`–`E17-R09-CD14` have one owner, disposition, implementation slice and acceptance evidence. `B10` remains fail-closed pending Workflow-owner proof, and `B12`/`CD14` remain accepted deferred to the Accounting/Economics owner; neither is presented as resolved by IMP-06 merely because it is documented.
