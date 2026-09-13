# EPIC-17-REQ-01 Acceptance Gates

## 1. Documentation gate

| Gate | Evidence | Result |
| --- | --- | --- |
| Canonical owner | Native contracts plus shared Native Core repository identified | `PASS` |
| Stable identity | `agent_id`, scope and ownership remain ACS-owned | `PASS` |
| Revision/lineage authority | Immutable Native revision, fingerprint, CAS and PostgreSQL lineage mapped | `PASS` |
| Legacy inventory | Types, service, repositories, Product API projection and persistence discriminator mapped | `PASS` |
| Legacy destination | Every mapped surface classified as projection, adapter, compatibility or deprecation candidate | `PASS` |
| No second Agent | GenomeAgent, SubAgent, provider and executor identity explicitly rejected | `PASS` |
| Contract gaps | Mutation routing, head/lifecycle history and legacy operational callers recorded | `PASS` |
| Migration authority | Candidates documented without migration execution | `PASS` |
| Downstream reference | One Native identity and exact revision reference defined for later REQs | `PASS` |

## 2. Future IMP gates

No IMP is authorized. A future separately approved implementation must prove:

1. canonical create/update/lifecycle commands mutate only Native lineage;
2. expected-head CAS produces one winner and deterministic typed conflict;
3. state, event, outbox and idempotency remain atomic;
4. restart reconstructs identity, exact revisions and accepted lifecycle/head
   history;
5. Product API reads and writes use the same canonical owner;
6. compatibility projection declares loss and cannot grant write authority;
7. legacy ID collisions, dual writes and silent payload relabeling fail closed;
8. adopt/restore appends a new revision with source provenance;
9. ordinary archive/disable preserves historical revisions;
10. provider/executor identity substitution and cross-Tenant access fail closed;
11. deployment/readiness/Workforce/execution bind exact Native revision refs;
12. migration rollback preserves readable legacy state and canonical Native
    state without split heads.

PostgreSQL acceptance is required if a future IMP changes canonical persistence
or mutation routing. Product API and browser checks are required only if that
IMP changes those surfaces.

## 3. REQ closure

```text
Canonical Agent authority: IDENTIFIED
Native/legacy seam: MAPPED
Compatibility rules: DEFINED
Migration/deprecation candidates: DOCUMENTED, NOT AUTHORIZED
Proposed contract deltas: EXPLICIT
Implementation blockers: EXPLICIT
Downstream Agent reference: UNAMBIGUOUS

EPIC-17-REQ-01: COMPLETE / READY FOR CTO ACCEPTANCE
Implementation authority: NONE
```
