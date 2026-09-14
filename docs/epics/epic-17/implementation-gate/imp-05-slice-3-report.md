# EPIC-17-IMP-05 — Slice 3 Governed Automation Service

**Status:** COMPLETE / CTO ACCEPTED / PUBLISHED  
**Date:** September 14, 2026  
**Schema:** 11 canonical; Schema 10 superseded  
**Commit / push:** authorized by CTO

## Delivered owner boundary

GovernedAutomationService is a control-plane layer over AsyncNativeCoreRepository. It creates Automation revision commands, advances immutable revisions through exact CAS, and records lifecycle transitions through the existing durable Automation owner.

It does not own a second Automation store, resolve external references, grant authority, materialize credentials, resolve targets, create Runs, invoke executors, or interact with OpenClaw.

## Frozen activation boundary

An enabled Automation is only administratively enabled.

- enable does not make it executable;
- enable does not validate Delegation authority;
- enable does not resolve a target;
- enable does not revalidate Delegation;
- enable does not produce an Activation, trigger occurrence, schedule occurrence, Run, Workflow execution, scheduler action or executor invocation.

Those decisions remain exclusively in the future Activation and admission boundary.

## Proof map

| Required proof | Evidence |
| --- | --- |
| create | Slice 3 service test creates revision 1 and its draft lifecycle fact through GovernedAutomationService. |
| deterministic replay | Durable Slice 2 PostgreSQL test replays the identical Tenant-qualified Automation command and returns the original lineage. |
| same key plus changed semantic command | Slice 2 PostgreSQL test returns NativeIdempotencyConflictError for a changed request hash under the same key; Slice 3 rejects a hash that does not represent its effective command. |
| revision CAS success and conflict | Slice 3 revises from the exact head; Slice 2 PostgreSQL test proves stale CAS rejection with RevisionConflictError. |
| immutable revision history | Slice 2 PostgreSQL test confirms historical revision preservation and rejects direct mutation by immutable-row trigger. |
| enable | Slice 3 service test creates an enabled lifecycle fact through the durable owner. |
| disable and re-enable | Slice 1 contract test exercises enabled to disabled and disabled to enabled, and Slice 3 delegates lifecycle validity to the same immutable contract primitive. |
| archive and archived mutation rejection | Slice 1 contract test proves archive terminality; Slice 2 PostgreSQL test preserves archive history and rejects successor revision after archive. |
| lifecycle history preserved | Slice 2 PostgreSQL reconstruction validates ordered append-only lifecycle facts against the current head. |
| Tenant isolation | Slice 2 PostgreSQL test rejects a cross-Tenant head/revision/Event command shape. |
| Event/Evidence/outbox atomicity | Slice 2 PostgreSQL test persists creation evidence and outbox with the Event; a duplicate outbox rollback leaves Event, Evidence, Outbox and lifecycle counts unchanged. Slice 3 supplies these through the existing transaction authority. |
| zero execution side effects | Slice 3 service imports only Automation contracts, Evidence, primitives, Event envelope and the durable repository. It has no Runtime, admission, target resolver, scheduler, Run, Workflow, executor, credential or OpenClaw import. |

## Validation

| Command | Result |
| --- | --- |
| npm run build | PASS |
| Slice 1–3 focused | PASS — 3 / 0 |
| npm run acceptance:postgres | PASS — PostgreSQL 17.6, Schema 11, 22 / 0 / 0 |
| ACS_ENVIRONMENT=local npm run check | PASS — 774 / 0 / 23 skipped |
| git diff --check | PASS |

## Scope evidence

Functional files are limited to:

- src/control-plane/automation-service.ts;
- src/index.ts export;
- tests/epic-17-imp-05-slice-3-governed-service.test.mjs.

The remainder of this package is documentation only. There is no Schema 12, Product API, administration UI, Activation, scheduler, target resolution, occurrence processing, Run creation, Workflow execution, Delegation revalidation or OpenClaw runtime change.

**Scope violation:** NONE.
