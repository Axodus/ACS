# EPIC-17 CTO Implementation Gate

**Architecture/specification:** `COMPLETE / ACCEPTED`
**REQ-01 through REQ-12:** `COMPLETE / ACCEPTED`
**Gate status:** `EPIC-17-IMP-05 — GATE PREPARATION COMPLETE / CTO ACCEPTED`
**Current authorized work:** IMP-05 Slice 2 Schema 11 migration and durable Automation identity/history only; Product API, Activation, scheduler and runtime hold
**Implementation authority:** none
**Migration authority:** none

IMP-01 and IMP-02 are `COMPLETE / CTO ACCEPTED`. IMP-02 closed effective
configuration, immutable fingerprinted snapshots, Tenant binding,
governed-resource observations, resolution provenance, provider/model
observations, Product API historical projections and recovery conformance. MCP
endpoint/configuration, Connection and Credential semantics were deferred to
REQ-05 and were completed by IMP-03A. IMP-03B is the separate REQ-06 Memory
milestone. Its schema-9 durable boundary and final metadata-only Product API
projection are complete. Schema 10 is now canonical for Delegation; no schema
11 change is authorized.

## Decision inputs

- [IMP-01 charter](imp-01-charter.md)
- [IMP-02 charter](imp-02-charter.md)
- [IMP-03A charter](imp-03-charter.md)
- [IMP-03A persistence and migration design](imp-03-persistence-migration-design.md)
- [IMP-03A Slice 1 regression causality review](imp-03a-slice-1-regression-causality.md)
- [IMP-03B Memory charter](imp-03b-charter.md)
- [IMP-03B persistence and migration design candidate](imp-03b-persistence-design-candidate.md)
- [IMP-03B schema 9 physical design](imp-03b-schema-9-physical-design.md)
- [ADR-023 Memory protection and deletion package](imp-03b-adr-023-encryption-erasure.md)
- [IMP-03B closure and REQ-12 next-milestone reconciliation](imp-03b-closure-and-next-milestone.md)
- [IMP-04 Delegation Grant & Authority Boundary charter](imp-04-charter.md)
- [IMP-04 schema 10 physical-design candidate](imp-04-schema-10-physical-design.md)
- [IMP-04 closure and REQ-12 next-milestone reconciliation](imp-04-closure-and-next-milestone.md)
- [IMP-05 Automation Identity & History gate preparation](imp-05-charter.md)
- [IMP-05 Schema 11 physical design](imp-05-schema-11-physical-design.md)
- [IMP-05 definitive blocker and delta slice mapping](imp-05-slice-mapping.md)
- [IMP-05 Slice 1 Automation contracts report](imp-05-slice-1-report.md)

## Current disposition

| Gate | Current result | Closure needed |
| --- | --- | --- |
| `E17-R12-B01` concrete charter | `RESOLVED / CTO ACCEPTED` | Charter accepted at gate commit `efed500224b08ab7f8b62a61b547d302f63172d7`. |
| `E17-R12-B02` validation baseline | `RESOLVED / CTO ACCEPTED` | `ACS-BLOCKER-014` reconciled against later accepted evidence. |
| IMP-01 execution | `COMPLETE / CTO ACCEPTED` | Canonical Agent seam, Profile/Persona boundary and lifecycle history are completed dependencies. |
| IMP-02 Slice 1 | `COMPLETE / CTO ACCEPTED` | Effective configuration snapshot, Tenant binding and historical reconstruction foundation are accepted. |
| IMP-02 Slice 2 | `COMPLETE / CTO ACCEPTED` | Resource-history closure for Skill, Tool, Capability and legacy governed preset; no new persistence or migration. |
| IMP-02 closure | `COMPLETE / CTO ACCEPTED` | CTO disposition supplied for this gate supersedes prior `READY FOR CTO CLOSURE` wording. |
| IMP-03A gate preparation | `COMPLETE / CTO ACCEPTED` | REQ-05 assignment, ownership split, blockers and delta dispositions accepted. |
| IMP-03A persistence design | `CTO ACCEPTED` | Schema v8, Connection/Channel lineage, migration compatibility and secret safety accepted. |
| IMP-03A Slice 1 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Schema v8 foundation, immutable lineages, CAS and Event/outbox. |
| IMP-03A Slice 2 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Lifecycle, credential rotation, CAS/idempotency and historical lineage conformance. |
| IMP-03A Slice 3 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Authenticated ingress reference plus atomic Event/Evidence/outbox; it stops before admission. |
| IMP-03A Slice 4 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Read-only Product API head projections and closure validation accepted; IMP-03A is closed. |
| IMP-03B gate preparation | `COMPLETE / CTO ACCEPTED` | REQ-06 ownership, B01–B06, deltas, ADRs, persistence candidate and migration gate accepted. |
| IMP-03B Slice 1 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Native contracts and tests only; schema 9, durable Store, runtime and Product API remain prohibited. |
| IMP-03B Slice 1 report | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Focused contract, regression and causal evidence](imp-03b-slice-1-report.md). |
| IMP-03B schema 9 physical design | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Tables, constraints, transaction and deployment design were accepted and applied through schema 9. |
| IMP-03B ADR-023 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | External key-protection boundary, active-store deletion guarantee and schema-9 crypto metadata accepted. |
| IMP-03B Slice 2 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Schema 9, encrypted durable Store, immutable Policy revisions, Record successors, tombstones, canonical Events/outbox and PostgreSQL conformance. |
| IMP-03B Slice 2 report | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Durable Store validation, causal classification and B04 status](imp-03b-slice-2-report.md). |
| IMP-03B Slice 3 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Governed write and bounded retrieval through exact Policy, Tenant and scope decisions; no Runtime or Product API integration. |
| IMP-03B Slice 3 report | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Governed operation validation and boundary closure](imp-03b-slice-3-report.md). |
| IMP-03B Slice 4 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Governed retention/deletion closure package](imp-03b-slice-4-report.md); B04 is resolved for `ACTIVE_STORE_DELETED`. |
| IMP-03B Slice 5 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Read-only Product API projections and final conformance package](imp-03b-slice-5-report.md); no new domain owner, Runtime integration or User Context Memory. |
| IMP-04 Delegation gate preparation | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Delegation Grant & Authority Boundary charter](imp-04-charter.md) reconciles REQ-07 blockers, deltas, ADRs and proposed slices. |
| IMP-04 Slice 1 — Delegation Contracts & Authority Model | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Commit `e6db696` adds native contracts, attenuation, chain validation, typed failures and the approved Event subject. |
| IMP-04 schema 10 physical design | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Physical design](imp-04-schema-10-physical-design.md) is accepted; schema 10 is canonical. |
| IMP-04 Slice 2 — Durable Delegation Grant Persistence | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Schema 10 persistence, CAS, revocation and PostgreSQL evidence](imp-04-slice-2-report.md). Commit `bee28c6`. |
| IMP-04 Slice 3 — Authority Resolution & Delegation Usability | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Commit `e830edb` supplies exact-chain resolution, attenuation and current usability. |
| IMP-04 Slice 4 — Admission Integration & Authority Snapshot | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Commit `9aa37d5` resolves Delegation before admission and embeds a redacted immutable snapshot. |
| IMP-04 Slice 5 — Product API / Administration & Conformance | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [GET-only Tenant-bound Grant projections and conformance package](imp-04-slice-5-report.md); implementation commit `c8c653b`; PostgreSQL schema 10 acceptance: `22 pass / 0 fail / 0 skip`. |
| IMP-05 Automation Identity & History gate preparation | `COMPLETE / CTO ACCEPTED` | [REQ-08 reconciliation, inventory, frozen ADRs and boundaries](imp-05-charter.md); functional implementation remains hold. |
| IMP-05 Schema 11 physical design | `COMPLETE / CTO ACCEPTED` | [Approved head/revision/lifecycle shape, CAS, reference boundary, Event/outbox and migration acceptance package](imp-05-schema-11-physical-design.md); migration remains hold. |
| IMP-05 blocker and delta mapping | `COMPLETE / CTO ACCEPTED` | [Definitive B01–B08 and CD01–CD10 mapping to Slices 1–5](imp-05-slice-mapping.md). |
| IMP-05 Slice 1 — Automation contracts, lifecycle and target semantics | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Native contract, focused test and full-regression causality package](imp-05-slice-1-report.md); no schema/migration/persistence/runtime expansion. |

## Current implementation boundary

The accepted PostgreSQL schema v8 and functional IMP-03A are closed.
Development SQLite data remains disposable: no preservation, import, backfill
or compatibility path is required. Schema 9 is implemented and validated.
IMP-03B is closed. `EPIC-17-IMP-04` Slices 1 through 5 are
`COMPLETE / CTO ACCEPTED / PUBLISHED`; schema 10 is canonical and IMP-04 is
closed. Its Product API projection is read-only and Tenant-bound. IMP-05 gate
preparation and Slice 1 are CTO accepted and published. Slice 2 migration and
durable persistence are authorized; Workforce
mutation, credential or Memory execution, and any direct Grant-to-Run path
remain unauthorized.
Production Memory enablement remains blocked until a validated external
KMS/Transit integration.
