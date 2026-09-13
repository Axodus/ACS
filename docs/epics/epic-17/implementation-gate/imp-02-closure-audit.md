# EPIC-17-IMP-02 — Closure Audit

> Historical pre-Slice 3 audit. This record is superseded by
> [imp-02-final-closure-audit.md](imp-02-final-closure-audit.md), which records
> the authorized Slice 3 implementation and current closure recommendation.

## STATUS

`SUPERSEDED / HISTORICAL GAP RECORD`

Slice 1 and Slice 2 are `COMPLETE / CTO ACCEPTED`. This audit confirms the
accepted implementation boundary and records the gaps that preceded Slice 3.
It does not represent the current milestone status.

**Audit date:** 2026-09-13  
**Baseline commit:** `fd3a02e7e33638c7c814c9360bc251ca90ec16a3`  
**Migration authority:** `NONE`  
**IMP-03+:** `NOT AUTHORIZED`

## Evidence baseline

| Evidence | Result |
| --- | --- |
| Slice 1 commits | `1e59f44`, `052b977` |
| Slice 2 commit | `fd3a02e7e33638c7c814c9360bc251ca90ec16a3` |
| `npm run build` | `PASS` |
| `npm run acceptance:postgres` | `14 passed / 0 failed / 0 skipped` |
| `npm run check` | `727 passed / 0 failed / 14 expected PostgreSQL URL skips` |
| `git diff --check` | `PASS` |
| working tree | clean at audit start |

The PostgreSQL and listener-capable results above are the evidence recorded by
the accepted Slice 2 validation. The working tree was clean before this audit
documentation change.

The audit rerun on 2026-09-13 produced these additional results:

| Audit rerun | Result |
| --- | --- |
| Focused IMP-02/composition/PostgreSQL tests | `3 passed / 0 failed` |
| `npm run check` | `120 passed / 11 failed / 0 skipped`; failures are in IMP-03E, EPIC-15.5 and S77 suites and were not causally attributed to the IMP-02 diff |
| `npm run acceptance:postgres` | `BLOCKED` during provisioning: Docker API permission denied (`docker_unavailable`) |
| `npm run build` and `git diff --check` | `PASS` |

The current rerun is therefore not a green full-regression or PostgreSQL
acceptance result. The previously accepted `727/0/14` evidence remains the
Slice 2 validation baseline; this audit does not upgrade the current environment
to green.

## Acceptance criteria matrix

| # | Result | Evidence / finding |
| ---: | --- | --- |
| 1 | `PASS` | `EffectiveConfigurationSnapshotV1`, class-specific rules, deterministic input/effective fingerprints; focused IMP-02 tests. |
| 2 | `PASS` | Snapshot reconstruction validates exact refs and observations; missing history becomes `unavailable`; no current catalog fallback. |
| 3 | `PASS` | IMP-01 Native seam remains the accepted owner of Persona revision, CAS, idempotency, Event and outbox behavior; full regression remains green. |
| 4 | `PASS` | Profile/presentation are excluded from effective authority; focused projection-only and secret/authority tests. |
| 5 | `PASS` | Displayed Skill/Tool/Capability material is derived from exact bindings and observations; no grant path is introduced. |
| 6 | `PASS` | `GovernedProfileResource` is observed as `legacy_capability_requirement_preset` and remains outside Agent Profile and authority. |
| 7 | `PASS` | Resource observations are evidence only; Capability Requirement, support evidence and authority grant remain separate. |
| 8 | `GAP` | Tenant binding and durable tenant scope are tested, but the charter's Product API list/detail/history/resolution projection and typed-error coverage is not implemented by the IMP-02 diff. |
| 9 | `PASS` | Existing intent JSON is reused; no parallel owner, dual write or legacy authoritative write was added. |
| 10 | `PASS` | `npm run acceptance:postgres`: 14 passed, including durable intent/snapshot reconstruction. |
| 11 | `PASS` | Full listener-capable regression completed; the 14 PostgreSQL URL skips are environmental and expected. |
| 12 | `PASS` | Validation counts are recorded faithfully: 727 passed, 0 failed, 14 expected skips. |
| 13 | `GAP` | This audit is the first explicit matrix. Before this report, the charter still marked ADRs as required and Slice 2 as candidate; final per-item dispositions were absent. |
| 14 | `PASS` | Implementation commits are limited to effective configuration, resource observations, durable intent binding, tests and gate documentation. |

## Contract delta matrix

| ID | Disposition | Evidence / remaining boundary |
| --- | --- | --- |
| `E17-R03-CD01` | `IMPLEMENTED` | Versioned class-specific effective snapshot contract. |
| `E17-R03-CD02` | `IMPLEMENTED` | Resolver/schema/class inputs and input/effective fingerprints. |
| `E17-R03-CD03` | `IMPLEMENTED` | Snapshot is bound to RuntimeExecutionIntentV2 and durable event correlation. |
| `E17-R03-CD04` | `SATISFIED` | Exact Agent revision and explicit unavailable status preserve source separation; broader head/lifecycle history remains an upstream dependency. |
| `E17-R03-CD05` | `GAP` | Class rule/status/source refs exist, but full decision, attenuation and rejection provenance plus Product API error projection is not complete. |
| `E17-R03-CD06` | `GAP` | Same-generation intent reuse is present, but explicit re-admission/successor and recovery evidence is not covered by IMP-02-specific contract tests. |
| `E17-R03-CD07` | `GAP` | Secret exclusion and opaque refs are preserved; provider availability/decision evidence is not frozen by this implementation. |
| `E17-R03-CD08` | `IMPLEMENTED` | Profile and unresolved legacy preset cannot inject capability or authority. |
| `E17-R04-CD01` | `IMPLEMENTED` | Exact `id`/`revision` observation guarantees for Skill, Tool and Capability. |
| `E17-R04-CD02` | `SATISFIED` | The accepted minimal path is immutable admission observation in existing intent JSON; no artificial resource revision stream was added. |
| `E17-R04-CD03` | `IMPLEMENTED` | Definition, requirement, support evidence and authority grant remain distinct in the resolver and tests. |
| `E17-R04-CD04` | `IMPLEMENTED` | Tool references require exact observed revision for historical binding reconstruction. |
| `E17-R04-CD05` | `DEFERRED` | MCP definition boundary belongs to the later Connector/MCP milestone. |
| `E17-R04-CD06` | `DEFERRED` | Provider/model selection and dynamic catalog evidence remain outside the accepted resource-history slice. |
| `E17-R04-CD07` | `IMPLEMENTED` | Legacy preset is explicitly typed as compatibility evidence and cannot resolve authority. |
| `E17-R04-CD08` | `IMPLEMENTED` | Missing exact history fails closed as `unavailable`; latest-value substitution is prohibited. |

## ADR disposition matrix

| ADR | Final disposition for IMP-02 | Decision implemented |
| --- | --- | --- |
| `ADR-17-007` | `ACCEPTED` | Resolution is class-specific; no universal override chain. |
| `ADR-17-008` | `ACCEPTED` | One immutable fingerprinted snapshot is retained per admitted generation. |
| `ADR-17-009` | `ACCEPTED` | Agent revision, head/lifecycle sources and effective snapshot remain separate. |
| `ADR-17-010` | `ACCEPTED` | Reconstruction uses the verified snapshot and exact observations, never current state. |
| `ADR-17-011` | `ACCEPTED` | Governed resources use exact observed `id`/`revision` semantics where admitted. |
| `ADR-17-012` | `ACCEPTED` | Requirement, support evidence and authority grant are separate. |
| `ADR-17-013` | `DEFERRED_WITH_BLOCKER` | Provider/model identity and dynamic observation need a later owner-specific decision. |
| `ADR-17-014` | `DEFERRED_WITH_BLOCKER` | Skill/Tool boundary is preserved; MCP definition/connection semantics remain later work. |
| `ADR-17-015` | `ACCEPTED` | Legacy `GovernedProfileResource` is isolated as a non-presentation preset evidence kind. |

## Blocker disposition matrix

| ID | Result | Evidence / reason |
| --- | --- | --- |
| `E17-R03-B01` | `RESOLVED` | Typed snapshot, deterministic serialization/fingerprint and durable reconstruction. |
| `E17-R03-B03` | `RESOLVED` | Skill/Tool/Capability gaps close through exact immutable observations; unavailable is explicit. |
| `E17-R03-B04` | `RESOLVED` | Profile and legacy preset are excluded from grants and authority resolution. |
| `E17-R03-B05` | `RESOLVED` | Effective fingerprint is independently calculated and validated. |
| `E17-R04-B01` | `RESOLVED` | Existing immutable intent evidence is sufficient for this bounded path; no new resource stream is needed. |
| `E17-R04-B02` | `RESOLVED` | Skill, Tool, Capability and legacy preset observations are validated and persisted in the snapshot. |
| `E17-R04-B03` | `DEFERRED` | No general MCP definition catalog exists; later integration work owns this boundary. |
| `E17-R04-B04` | `DEFERRED` | Provider/model immutable observations are outside the accepted Slice 2 classes. |
| `E17-R04-B05` | `RESOLVED` | Legacy Profile capability union cannot become a grant. |
| `E17-R04-B06` | `REMAINS OPEN` | Product API compatibility projections do not yet expose the full exact revision/fingerprint contract. |
| `E17-R10-B03` | `REMAINS OPEN` | Uneven lineage remains for Product API and provider/model surfaces. |
| `E17-R10-B08` | `RESOLVED` | Typed durable effective snapshot is present and PostgreSQL validated. |
| `E17-R11-B09` | `REMAINS OPEN` | Profile/head lifecycle and broader resource history remain outside the implemented IMP-02 boundary. |

## REQ conformance

### REQ-03

`CONFORMS FOR THE IMPLEMENTED IMP-02 CLASSES; PARTIAL FOR FULL REQ-03 MATRIX.`

The implementation satisfies deterministic class-specific resolution,
fingerprinted immutable admission snapshots, tenant binding, secret exclusion,
fail-closed historical reconstruction and durable intent linkage. The full REQ-03
matrix still has open model/provider evidence, credential/availability decision
provenance, Product API projection/error coverage and explicit recovery/re-
admission tests.

### REQ-04

`CONFORMS FOR SKILL, TOOL, CAPABILITY AND LEGACY PRESET; PARTIAL FOR FULL REQ-04 RESOURCE MATRIX.`

The implementation preserves ownership, exact observed revisions and the
definition/requirement/support/grant boundary for the accepted classes. MCP
definition semantics and provider/model catalog history remain deferred to their
own implementation boundaries.

## Exact gap defining the next slice

The audit did not authorize a Slice 3 at the time it was written. The CTO later
authorized the following minimum boundary, now covered by the final audit:

1. Product API source-faithful effective snapshot/history projection, Tenant
   filtering and typed unavailable/incomplete-source errors;
2. complete decision/attenuation/rejection and availability provenance required
   by `E17-R03-CD05` and `E17-R03-CD07`;
3. explicit same-generation recovery, re-admission successor and retry tests
   for `E17-R03-CD06`;
4. a CTO disposition for provider/model evidence and MCP semantics, or an
   explicit deferral to the owning later IMP.

No schema delta or migration is proposed by this audit. If any of these items
requires new persistence, implementation must stop at the migration gate.

## Gate result

```text
EPIC-17-IMP-02
Slice 1: COMPLETE / CTO ACCEPTED
Slice 2: COMPLETE / CTO ACCEPTED
Resource-history closure: COMPLETE / CTO ACCEPTED
Milestone: PARTIAL / GAPS IDENTIFIED (historical status)
Closure audit: SUPERSEDED BY FINAL CLOSURE AUDIT
Migration: NONE
IMP-03+: NOT AUTHORIZED
```
