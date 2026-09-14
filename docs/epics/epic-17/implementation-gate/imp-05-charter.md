# EPIC-17-IMP-05 — Automation Identity & History Gate Preparation

**Status:** `CANDIDATE / GATE PREPARATION AUTHORIZED`
**Gate preparation:** `COMPLETE / CTO ACCEPTED`
**Source of truth:** [REQ-08 — Automation](../req-08/README.md)
**Dependency:** `IMP-04 COMPLETE / CTO ACCEPTED / PUBLISHED` (`c8c653b`; closure `619b4db`)
**Implementation authority:** none
**Migration authority:** none
**Schema 11:** `PHYSICAL DESIGN AUTHORIZED / MIGRATION HOLD`
**Product API, Activation, scheduler and OpenClaw execution integration:** hold

## Mission, scope and non-goals

Prepare the CTO decision for one governed, historically reconstructable Automation configuration boundary. The candidate domain preserves a stable Tenant-scoped identity, immutable authored revisions and independent lifecycle history. It describes what may later produce execution intent; it is neither the occurrence nor the execution.

```text
Automation -> future Activation -> execution intent
           -> existing admission boundary -> Run / Workflow target
```

No Automation contract, aggregate, schema, table, migration, API, UI, scheduler, trigger receiver, polling loop, cron runner, OpenClaw integration, Activation, admission or runtime change is authorized. Automation does not become Delegation authority, Agent identity, Workforce membership, Workflow, Run, Task, Attempt, executor or Economics owner.

## Current-state inventory and ownership map

| Repository evidence | Current meaning | IMP-05 disposition |
| --- | --- | --- |
| `src/native-core/agent.ts` (`AgentDefinitionV2`, `AgentRevisionV2`) | Canonical Agent identity/history | `REUSE`: Automation may reference an eligible exact Agent target; it never becomes Agent identity. |
| `src/native-core/runtime.ts`, `src/native-core/runtime-compilation.ts` | Admission owns `ExecutionRequestV2`, `RunV2`, `TaskV2`, `TaskAttemptV2`; `RuntimeExecutionIntentV2` is post-admission | `REJECT`: no Automation-to-Run path and no pre-admission runtime-intent type. |
| `src/native-core/delegation.ts`, `src/control-plane/delegation-authority-resolver.ts`, schema 10 | Exact grant lineage, attenuation, revocation and admission snapshot | `REUSE`: optional required authority context only; Activation revalidates it. |
| `src/control-plane/shared-state/native-core-durable.ts` | Tenant-qualified CAS/idempotency, Event and transactional outbox; no `automation` subject | `ADAPT`: sole candidate durable mechanism; no parallel persistence/event system. |
| `src/control-plane/product-api-client.ts`, `src/http/routes/acs-routes.ts` | Inspection projections report `automation: "disabled"` | `REUSE` as read-only convention, `NEW` for Automation domain; it is not identity/lifecycle. |
| `src/http/services/operational-status-service.ts`, `src/capability-registry.ts` | `manual_approval`, `automationAllowed`, automation-level policy/readiness metadata | `REUSE` as governance/readiness input, never an Automation instance. |
| `src/engines/openclaw-engine-adapter.ts`, `src/engines/openclaw-bootstrap.ts`, `src/openclaw.ts` | Replaceable OpenClaw `AgentEngine` adapter/discovery | `ADAPT`: future adapter only; provider identity/state is non-canonical. |
| `scripts/smoke-openclaw.mjs` and search for cron/schedule/trigger | No ACS scheduler, trigger receiver, cron runner, due-work evaluator or missed-work recovery implementation | `NEW`, deferred to IMP-06. |
| `src/control-plane/neurons-economic-contract.ts` | `scheduled.execution` consumption label | `REJECT` as domain evidence: it is not Automation, schedule, Usage or Cost ownership. |

The inventory proves that canonical Automation, schedule and trigger functionality do not currently exist. Legacy policy/status strings and OpenClaw integration cannot transfer ownership.

| Concern | Canonical owner | IMP-05 boundary |
| --- | --- | --- |
| Automation identity, authored revisions, lifecycle history | candidate Automation domain | configuration truth only |
| Tenant, authoring/lifecycle authority and policy | Governance | external authority |
| Agent, Workforce, Workflow definitions | existing domains | target/resource references only |
| effective configuration/history snapshot | REQ-03 resolution/admission | future Activation resolves it |
| Delegation Grant authority | REQ-07 / IMP-04 | reference plus future revalidation |
| Trigger/Schedule definition | exact Automation revision, subject to future contract | definition is not occurrence/scheduler |
| Trigger/Schedule occurrence and Activation | REQ-09 / IMP-06 | excluded |
| Run/Task/Attempt/executor | Coordination/Runtime | excluded |
| Evidence, Event/outbox, idempotency | shared authority | reuse candidate |
| Usage, Cost, budget, settlement | Accounting/Economics | correlation only |
| Product API/Administration | REQ-10 / IMP-07 | hold |

## Identity, revision and lifecycle candidate

The REQ-08 model remains adequate:

```text
stable automation_id -> immutable Automation revisions -> current head -> lifecycle history
```

`automation_id` is Tenant-scoped and stable. Every authored revision is immutable, fingerprinted and predecessor-linked. Current head selects the current authored revision. Lifecycle history records eligibility separately and never rewrites configuration or future/historical Activation facts.

| Change | Candidate operation | Rationale |
| --- | --- | --- |
| metadata/purpose, target selector/ref, template/input, Trigger/Schedule definition, governance/resource/policy refs, required authority context | new immutable revision | authored configured intention changed |
| revision author, reason or source provenance | new immutable revision | historical explanation remains exact |
| `draft` -> `enabled`, `enabled` -> `disabled`, archive | independent lifecycle transition | eligibility changed, configuration did not |
| Grant expiry/revocation or target eligibility | no Automation mutation | Activation evaluates current facts |
| trigger delivery, due instant, manual request, admission, Run result, execution retry | no Automation mutation | occurrence/runtime fact |

Candidate lifecycle states are `draft`, `enabled`, `disabled` and `archived`. `enabled` permits future evaluation only: it grants no authority, creates no Activation and schedules no work. Archive retains history and assumes no reactivation policy.

## Target, Trigger and Schedule boundaries

Automation references an admission-capable target in exactly one explicit mode:

| Mode | Automation revision records | Future Activation does |
| --- | --- | --- |
| `PINNED` | exact target identity, revision and fingerprint | verifies the exact target, without substituting latest |
| `RESOLVED_AT_ACTIVATION` | deterministic target-resolution policy and governed refs | resolves and freezes one exact target in Activation/admission snapshot |

There is no implicit `latest`. A target type lacking stable identity, revision and admission semantics is ineligible and fails closed. Workflow is the known target-lineage gap; IMP-05 must not invent Workflow history to make it eligible.

Trigger and Schedule are authored definitions of an exact Automation revision. They require a stable logical definition key and immutable representation/digest. A definition is not a delivery, due instant, scheduler, claim, Activation or Run. Scheduler evaluation, occurrence identity, missed-work recovery, cancellation, coalescing and retry remain IMP-06.

## Delegation, Agent/Workforce and OpenClaw boundaries

An Automation revision may state required direct authority type and may reference exact Delegation Grant revision/chain as authoring provenance or future required context. It never copies attenuation, expiry, revocation or admission authority. Creating, revising and enabling grant nothing. A persisted Automation survives Grant revocation as history; a later Activation must revalidate authority and can be denied.

Agent/Workforce references remain target or resource references. OpenClaw is a replaceable optional future evaluator/trigger/executor adapter. `OpenClaw automation ID != ACS automation_id`; provider state never becomes Automation history.

## REQ-12 reconciliation

### Blockers

| Blocker | Requirement/evidence | Current owner and gap | Disposition | Slice | Acceptance evidence |
| --- | --- | --- | --- | --- | --- |
| `E17-R08-B01` | Stable identity/revision/lifecycle required; no native Automation contract | candidate Automation; durable lineage absent | `NEW` | S1; S2 if separately approved | Tenant ID/revision/fingerprint/predecessor/lifecycle reconstruction |
| `E17-R08-B02` | exact target lineage required; Workflow unproven | target domains/admission; eligible matrix absent | `ADAPT` | S1 | pinned/ref-resolution validation; unsupported target denied |
| `E17-R08-B03` | CAS/fingerprint/lifecycle Event/outbox required; shared pattern exists without Automation | shared durable authority; application missing | `ADAPT` | S2 | stale head, duplicate key, immutable row, atomic Event/outbox |
| `E17-R08-B04` | authored configuration must remain separate from REQ-03 effective snapshot | admission; no Automation handoff seam | `ADAPT` | S3 | exact authored refs, no effective snapshot/runtime intent |
| `E17-R08-B05` | direct/delegated authority must revalidate at Activation | Governance/Delegation/admission; handoff absent | `REUSE` | S3 | revoked/expired Grant denies future Activation without deleting history |
| `E17-R08-B06` | Activation identity/idempotency/Run causality absent | REQ-09 / IMP-06 | `REJECT` in IMP-05 | IMP-06 | one logical occurrence, one Run correlation |
| `E17-R08-B07` | no Automation Evidence subject/ref | shared Event/Evidence authority | `EXTEND` candidate | S2 only if ADR accepted | lifecycle/revision Event and redacted Evidence correlation |
| `E17-R08-B08` | no Automation/Activation Usage/Cost correlation | Accounting/Economics | `REJECT` in IMP-05 | IMP-06/IMP-10 | Run-based attribution unchanged; later correlation explicit |

REQ-12 consolidates B01–B06 and `E17-R10-B07` as `E17-R12-C06` for IMP-05. B07/B08 remain `E17-R12-C08` cross-domain inputs; this gate retains them for a CTO decision but does not claim closure.

### Contract deltas and accepted ADRs

| Item | Gate disposition | Decision/boundary |
| --- | --- | --- |
| `E17-R08-CD01` | `NEW` candidate | Tenant-scoped stable ID/head |
| `E17-R08-CD02` | `NEW` candidate | immutable fingerprint/predecessor/provenance |
| `E17-R08-CD03` | `ADAPT` | shared CAS/idempotency/Event/outbox; separate lifecycle history |
| `E17-R08-CD04` | `ADAPT` | explicit `PINNED` / `RESOLVED_AT_ACTIVATION`; no latest |
| `E17-R08-CD05` | `ADAPT` | authored requirements only; effective state remains admission-owned |
| `E17-R08-CD06` | `REUSE` | Delegation reference without authority duplication; revalidate later |
| `E17-R08-CD07` | `EXTEND` candidate | decide Event/Evidence subject and lifecycle vocabulary |
| `E17-R08-CD08` | `REJECT` in IMP-05 | Activation/Run correlation belongs to IMP-06 |
| `E17-R08-CD09` | `REJECT` in IMP-05 | Accounting/Economics decides correlation later |
| `E17-R08-CD10` | `REJECT` in IMP-05 | Product API/Admin belongs to IMP-07 |
| `ADR-17-030` | `ACCEPTED` | stable `automation_id`, immutable revisions and CAS head; lifecycle is reconstructible history, not a revision substitute |
| `ADR-17-031` | `ACCEPTED` | `PINNED` exact ref or `RESOLVED_AT_ACTIVATION` policy; no implicit latest |
| `ADR-17-032` | `ACCEPTED` | Trigger/Schedule definition/configuration belongs to revision or exact governed refs; occurrence remains Activation |
| `ADR-17-033` | `ACCEPTED` | exact Delegation requirements/refs without materialized authority; future Activation revalidates |
| `ADR-17-034` | `ACCEPTED` | ACS owns canonical identity/history; OpenClaw/executor IDs are integration refs only |

## Schema 11, Event and idempotency recommendation

Schema 11 physical design is **authorized**; migration remains prohibited. Durable identity/history is required by the accepted model and schema 10 demonstrates compatible lineage patterns, but a separate physical aggregate is not yet proven as the sole correct representation. No migration 10 -> 11 is authorized.

If CTO accepts durable persistence, the physical candidate must cover Tenant-qualified head; immutable revisions/predecessors; lifecycle history; explicit target ref or resolution policy; Trigger/Schedule definition refs; Delegation/governance/resource refs; fingerprint, expected-head CAS and request idempotency; canonical Event/outbox; and historical reconstruction without re-resolving current state. It must reuse shared PostgreSQL authority and leave schema-10 data unchanged.

The physical-design candidate approves subject `automation` and conceptual events `automation.created`, `automation.revised`, `automation.enabled`, `automation.disabled`, `automation.archived`. Final names must follow the implemented Event convention; no Event vocabulary code change is made here.

The candidate idempotency model is Tenant-qualified and aggregate-scoped: create uses a Tenant/creation scope; revision uses `automation:<tenant_id>:<automation_id>` with expected head and request hash; lifecycle uses a distinct lifecycle command scope and expected version. Same key with a different payload fails closed. Occurrence idempotency belongs exclusively to Activation/IMP-06.

## Proposed slices after CTO decisions

| Slice | Scope after separate GO | Exclusions | Acceptance evidence |
| --- | --- | --- | --- |
| S1 native Automation contract | identity, revisions, lifecycle, target selector, authority context, boundary tests | persistence/API/Activation | exact revision/lifecycle rules; no Automation-to-Run path |
| S2 durable identity/history | only if schema 11 accepted: head/revisions/lifecycle, CAS/idempotency, Event/outbox | migration unless separately approved; Activation/Product API | PostgreSQL Tenant isolation, reconstruction, immutability, CAS/idempotency, Event/outbox atomicity |
| S3 Activation handoff reservation | typed authored-reference projection to future Activation/admission | occurrence claim, scheduler, Run creation, authority resolution | exact refs survive; unresolved/revoked requirements are never admitted |
| S4 conformance closure | documentation and focused boundary validation | UI, Usage/Cost mutation, provider integration | REQ-08/REQ-12 matrix complete; no parallel owner/runtime bypass |

S2 and every later slice require separate CTO authorization. Schema 11 and migration remain `HOLD` until physical-design and migration gates are accepted.

## Acceptance matrix and gate result

| Criterion | Result | Evidence |
| --- | --- | --- |
| current-state inventory and ownership map | `PASS` | paths/symbols above; no canonical Automation or scheduler found |
| REQ-08 traceability | `PASS` | B01–B08, CD01–CD10, ADR-17-030–034 reconciled |
| Automation/Activation separation | `PASS` | occurrence/scheduler/admission/runtime remain IMP-06 or existing owners |
| Delegation boundary | `PASS` | IMP-04 reused; reference/revalidation only |
| target semantics | `PASS` | explicit pinned/resolved modes and fail-closed no-latest rule |
| schema/Event recommendation only | `PASS` | schema 11 and Event subject remain candidates |
| documentation-only scope | `PASS` | no functional implementation, schema, migration, API or runtime change |
| required links/paths | `PASS` | REQ-08, REQ-09, REQ-12, schema-10 shared patterns cited |

```text
EPIC-17-IMP-05: GATE PREPARATION COMPLETE / CTO ACCEPTED
Functional implementation: HOLD
Schema 11 and migration 10 -> 11: HOLD
Automation Product API: HOLD
Activation, scheduler and OpenClaw execution integration: HOLD
IMP-06+: BLOCKED
```
