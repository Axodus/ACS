# EPIC-17-IMP-05 — Slice 5 Cross-Domain Conformance & Closure

**Status:** IMPLEMENTED / CTO REVIEW READY  
**Date:** September 14, 2026  
**Scope:** conformance documentation only; no functional change.

## Final boundary

Automation remains governed configuration and historical identity. It is not Activation, trigger/schedule occurrence, Run, Workflow, Agent, Delegation Grant, executor or admission.

Future-only path: Automation → Activation → target resolution where applicable → Delegation/authority revalidation → admission → existing execution machinery.

## B01–B08 reconciliation

| Item | Owner | Slice evidence | Validation | Disposition |
| --- | --- | --- | --- | --- |
| B01 identity/history | Automation durable owner | S1 contracts; S2 Schema 11 | PostgreSQL 17.6 22/0/0 | RESOLVED |
| B02 target semantics | Automation revision contract | S1 target modes; S3 commands | focused contracts/service | RESOLVED |
| B03 CAS/lifecycle/idempotency | durable owner/service | S2 CAS/history; S3 commands | PostgreSQL and focused tests | RESOLVED |
| B04 authored/effective seam | REQ-03/Activation | authored refs only | no snapshot/runtime object introduced | ACCEPTED DEFERRED |
| B05 authority revalidation | future Activation/admission | exact Delegation refs only | no authority materialization | ACCEPTED DEFERRED |
| B06 Activation/Run causality | IMP-06 | none by design | boundary review | OUT OF SCOPE |
| B07 Event/Evidence correlation | shared Event/Evidence/outbox | S2 atomic owner writes | PostgreSQL atomicity proof | RESOLVED |
| B08 Usage/Cost correlation | IMP-06/IMP-10 | existing Run accounting unchanged | no Run created | OUT OF SCOPE |

## CD01–CD10 reconciliation

| Item | Owner | Slice | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| CD01 stable head | Automation owner | S1/S2 | stable id + CAS | RESOLVED |
| CD02 immutable revision | Automation owner | S1/S2 | fingerprint/history/triggers | RESOLVED |
| CD03 lifecycle | Automation owner | S1/S2/S3 | append-only facts | RESOLVED |
| CD04 target selector | Automation revision | S1/S3 | PINNED or policy-only resolved mode | RESOLVED |
| CD05 authored refs | Automation revision | S1/S3 | typed external refs | RESOLVED |
| CD06 authority basis | Delegation/Activation | S1/S3/S5 | requirements only | ACCEPTED DEFERRED |
| CD07 Event/Evidence | shared infrastructure | S2 | automation subject + atomicity | RESOLVED |
| CD08 Activation correlation | IMP-06 | none | future Activation | OUT OF SCOPE |
| CD09 Usage/Cost | IMP-06/10 | none | existing Run owner | OUT OF SCOPE |
| CD10 Product API | ProductApiClient/routes | S4 | Tenant GET-only projections | RESOLVED |

## ADR implementation mapping

| ADR | Result |
| --- | --- |
| ADR-17-030 identity/history | S1–S3 stable ID, immutable revisions, CAS head and lifecycle facts. |
| ADR-17-031 target resolution | S1/S4 preserve PINNED exact ref or RESOLVED_AT_ACTIVATION policy only. |
| ADR-17-032 trigger/schedule | revision definitions only; no occurrence or scheduler. |
| ADR-17-033 Delegation | structural requirement refs only; no authority grant or revalidation. |
| ADR-17-034 executor boundary | safe executor refs only; no OpenClaw ownership or invocation. |

## Required markers

| Marker | Result |
| --- | --- |
| REQ-08 traceability | PASS |
| B01–B08 reconciliation | PASS |
| CD01–CD10 reconciliation | PASS |
| ADR mapping | PASS |
| links/paths | PASS |
| git diff --check | PASS |
| scope violation | NONE |
