# EPIC-17 CTO Implementation Gate

**Architecture/specification:** `COMPLETE / ACCEPTED`
**REQ-01 through REQ-12:** `COMPLETE / ACCEPTED`
**Gate status:** `EPIC-17-IMP-03B — SLICE 5 / AUTHORIZED / GO`
**Authorized implementation:** Slice 5 Product API, Administration projection and cross-domain conformance only
**Implementation authority:** Slice 5 only
**Migration authority:** schema 9 is applied; no further schema change is authorized

IMP-01 and IMP-02 are `COMPLETE / CTO ACCEPTED`. IMP-02 closed effective
configuration, immutable fingerprinted snapshots, Tenant binding,
governed-resource observations, resolution provenance, provider/model
observations, Product API historical projections and recovery conformance. MCP
endpoint/configuration, Connection and Credential semantics were deferred to
REQ-05 and were completed by IMP-03A. IMP-03B is the separate REQ-06 Memory
candidate; its gate package authorizes documentation only. Migration authority
remains none.

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
| IMP-03B schema 9 physical design | `COMPLETE / CTO ACCEPTED / PUBLICATION AUTHORIZED` | Tables, constraints, transaction and deployment design accepted; schema 9 remains held on ADR-023. |
| IMP-03B ADR-023 | `COMPLETE / CTO ACCEPTED / PUBLICATION AUTHORIZED` | External key-protection boundary, active-store deletion guarantee and schema-9 crypto metadata accepted. |
| IMP-03B Slice 2 | `COMPLETE / CTO ACCEPTED` | Schema 9, encrypted durable Store, immutable Policy revisions, Record successors, tombstones, canonical Events/outbox and PostgreSQL conformance. |
| IMP-03B Slice 2 report | `COMPLETE / CTO ACCEPTED` | [Durable Store validation, causal classification and B04 status](imp-03b-slice-2-report.md). |
| IMP-03B Slice 3 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Governed write and bounded retrieval through exact Policy, Tenant and scope decisions; no Runtime or Product API integration. |
| IMP-03B Slice 3 report | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Governed operation validation and boundary closure](imp-03b-slice-3-report.md). |
| IMP-03B Slice 4 | `COMPLETE / CTO ACCEPTED / PUBLISHED` | [Governed retention/deletion closure package](imp-03b-slice-4-report.md); B04 is resolved for `ACTIVE_STORE_DELETED`. |
| IMP-03B Slice 5 | `AUTHORIZED / GO` | Product API/Admin projections and cross-domain conformance only; no new domain owner, Runtime integration or User Context Memory. |

## Current implementation boundary

The accepted PostgreSQL schema v8 and functional IMP-03A are closed.
Development SQLite data remains disposable: no preservation, import, backfill
or compatibility path is required. Schema 9 is implemented and validated.
IMP-03B Slice 5 may expose safe projections through the existing Product API
and Administration boundary. IMP-04+, Runtime integration and User Context
Memory remain unauthorized. Production Memory enablement remains blocked until
a validated external KMS/Transit integration.
