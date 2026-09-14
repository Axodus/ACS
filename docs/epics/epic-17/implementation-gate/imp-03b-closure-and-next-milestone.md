# EPIC-17-IMP-03B — Closure and REQ-12 Next-Milestone Reconciliation

**IMP-03B status:** `COMPLETE / CTO ACCEPTED / PUBLISHED`  
**Schema:** `9 / CANONICAL`  
**Next functional implementation authority:** `NONE`

## Closure

The five accepted slices establish one Memory architecture:

```text
Governance -> Memory Policy immutable lineage
Memory Domain -> Governed Memory Service -> Memory Store
Memory Store -> immutable Records + encrypted active contents + content-free Tombstones
Product API -> Tenant-scoped metadata-only projection
```

The final evidence is build and focused-test pass, PostgreSQL schema 9
acceptance `20 passed / 0 failed / 0 skipped`, listener-capable regression
`752 passed / 0 failed / 20 PostgreSQL-gated skips`, and authoritative
causality `A=0 / B=0 / C=0 / D=0`.

`E17-R06-B01`, `B02`, `B04`, `B05` and `B06` are resolved for the implemented
REQ-06 boundary. `E17-R06-B03` remains `OPEN / DEFERRED`: User Context Memory
has no functional representation and no consent, privacy or identity owner is
inferred from account, session or Tenant context.

The implemented deletion guarantee is only `ACTIVE_STORE_DELETED`.
`CRYPTOGRAPHIC_ERASURE` and `BACKUP_ERASURE` remain unclaimed; a production
KMS/Transit integration is a production-readiness dependency, not an IMP-03B
reopening condition.

## REQ-12 dependency reconciliation

The accepted REQ-12 dependency plan places `IMP-03A` and `IMP-03B` in the
parallel branch after IMP-02, with `IMP-04` waiting for both. The prerequisites
are now satisfied:

| Prerequisite | State | Evidence |
| --- | --- | --- |
| IMP-02 | `COMPLETE / CTO ACCEPTED` | Effective configuration, exact immutable snapshots and historical reconstruction conventions. |
| IMP-03A | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Connection/Channel durable boundary and authenticated ingress provenance. |
| IMP-03B | `COMPLETE / CTO ACCEPTED / PUBLISHED` | Memory Policy/Store, governed access, retention and metadata-only Product API projection. |

Therefore the next canonical node is:

```text
EPIC-17-IMP-04 — Delegation Grant & Authority Boundary
STATUS: CANDIDATE / READY FOR CTO GATE PREPARATION
FUNCTIONAL IMPLEMENTATION AUTHORITY: NONE
MIGRATION AUTHORITY: NONE
```

This is gate eligibility, not a functional GO. The future IMP-04 charter must
reconcile `E17-R07-B01` through `B07`, `E17-R07-CD01` through `CD10` and
`ADR-17-025` through `ADR-17-029`. It must preserve the accepted boundaries:
Delegation is a governed attenuation artifact, never a SubAgent identity,
credential or Memory transfer, Workforce owner, Assignment, Run or Runtime
authority. Cross-Tenant Delegation remains fail-closed unless a later canonical
contract explicitly changes that rule.

## Nodes not yet eligible

| Node | State | Blocking dependency |
| --- | --- | --- |
| IMP-05 Automation | `NOT READY` | IMP-04 acceptance. |
| IMP-06 Activation/admission | `NOT READY` | IMP-05 acceptance. |
| IMP-07 Product API/Admin cross-domain work | `NOT READY` | IMP-03A through IMP-06 acceptance. |
| IMP-08 Traits/assets/verification | `NOT READY` | IMP-07 acceptance. |
| IMP-09 Control Plane IA | `NOT READY` | IMP-07, IMP-08 and explicit IA decision. |
| IMP-10 Cross-domain closure | `NOT READY` | IMP-01 through IMP-09 acceptance. |

No functional work on Delegation, Automation, Activation, Runtime Memory
integration or another adjacent domain is authorized by this reconciliation.
