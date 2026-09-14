# EPIC-17-IMP-05 — Definitive Blocker and Delta Slice Mapping

**Status:** `COMPLETE / CTO ACCEPTED`
**Scope:** documentation-only decomposition for the accepted Automation identity/history model
**Excluded:** migration, functional persistence, Product API, Activation, scheduler and OpenClaw execution

## Slice contracts

| Slice | Authorized planning scope | Must not enter |
| --- | --- | --- |
| S1 — Automation contracts | native identity/revision/lifecycle, target semantics, Trigger/Schedule definition boundary, Delegation/reference contracts | persistence, migration, Activation/admission, scheduler, Product API |
| S2 — Schema 11 durable identity/history | schema 11 migration and durable repository only after a separate GO; CAS, immutable history, lifecycle facts, Event/Evidence/outbox/idempotency | Activation, scheduler, runtime/provider execution |
| S3 — governed Automation service | creation/revision/lifecycle commands, owner validation and idempotency after S2 is complete | executing Automation, revalidating for an Activation, Product API |
| S4 — Product API/Administration projection | Tenant-bound read projections after commands are complete | mutable client authority, scheduler, Activation/runtime control |
| S5 — cross-domain conformance/closure | reconstruction, security and evidence closure | new domain scope or IMP-06 work |

## Blocker mapping

| Blocker | Final owner/gap | Slice | Closure evidence |
| --- | --- | --- | --- |
| `E17-R08-B01` | Automation identity/revision/lifecycle contract and durable history absent | S1 + S2 | native contract; PostgreSQL immutable identity/head/lifecycle reconstruction |
| `E17-R08-B02` | exact target identity/revision eligibility incomplete, especially Workflow | S1 + S3 | typed PINNED/resolved policy; unsupported target fails closed at command validation |
| `E17-R08-B03` | no Automation CAS/fingerprint/lifecycle Event/outbox | S2 + S3 | stale CAS, immutable rows, replay/conflict, atomic Event/outbox |
| `E17-R08-B04` | no authored Automation to REQ-03 snapshot seam | S1 + S5 | authored/effective separation retained; no snapshot/runtime type created; IMP-06 handoff requirement documented |
| `E17-R08-B05` | no direct/delegated revalidation at Activation | S1 + S5 | exact requirement/reference stored without materialized authority; revocation preservation test; final runtime revalidation stays IMP-06 |
| `E17-R08-B06` | no Activation identity/idempotency/Run causality | IMP-06 only | excluded from IMP-05 closure; no implementation attempt in S1–S5 |
| `E17-R08-B07` | Automation Event/Evidence subject/reference absent | S2 + S5 | subject/vocabulary implementation only after migration GO; safe Event/Evidence correlation and redaction |
| `E17-R08-B08` | Automation/Activation Usage/Cost correlation absent | IMP-06 + IMP-10 | excluded from IMP-05; Run-based Accounting/Economics remains unchanged |

`E17-R12-C06` closes only when B01–B05 implementation obligations are satisfied and B06 is explicitly handed to IMP-06 without boundary leakage. `E17-R12-C08` remains an IMP-05 evidence input for B07 and a later Economics/Activation input for B08.

## Contract-delta mapping

| Delta | Slice | Final treatment | Acceptance evidence |
| --- | --- | --- | --- |
| `E17-R08-CD01` stable identity/head | S1, S2 | implement stable Tenant ID, head CAS | exact head selects contiguous immutable revision |
| `E17-R08-CD02` immutable revision/provenance | S1, S2 | implement typed revision and durable immutability | predecessor/fingerprint/provenance reconstruction |
| `E17-R08-CD03` lifecycle/CAS | S1, S2, S3 | separate lifecycle facts and atomic commands | transition history, stale CAS and idempotency behavior |
| `E17-R08-CD04` target selector | S1, S3 | implement `PINNED`/`RESOLVED_AT_ACTIVATION`, no latest | exclusive mode validation and fail-closed unsupported ref |
| `E17-R08-CD05` authored configuration refs | S1, S3 | typed authored refs only | no effective configuration or runtime intent persisted |
| `E17-R08-CD06` authority basis | S1, S3, S5 | Delegation requirement/reference only | Grant revocation preserves history; no authority materialization |
| `E17-R08-CD07` Event/Evidence lifecycle vocabulary | S2, S5 | use shared Event/Evidence/outbox only | safe `automation` Event subject and atomic correlation |
| `E17-R08-CD08` Automation -> Activation -> Run correlation | IMP-06 | excluded | future Activation evidence only |
| `E17-R08-CD09` Usage/Cost correlation | IMP-06, IMP-10 | excluded | existing Run-based attribution remains authoritative |
| `E17-R08-CD10` Product API/Admin | S4 | read-only, Tenant-bound projection after S1–S3 | source-faithful history and no client authority |

## Mandatory slice gates

| Before | Required proof |
| --- | --- |
| S1 | Schema 11 physical design accepted; no migration/code authority inferred |
| S2 | separate CTO authorization for migration and persistence; S1 contracts accepted |
| S3 | schema 11 canonical and S2 durable acceptance complete |
| S4 | S3 command authority and source-faithful domain reads accepted |
| S5 | S1–S4 evidence complete; unresolved Activation/Economics items explicitly remain downstream |

Any need to execute, schedule, poll, claim occurrence, revalidate authority for admission, create a Run, or call OpenClaw during S1–S5 is a boundary violation and blocks the slice for architecture review.
