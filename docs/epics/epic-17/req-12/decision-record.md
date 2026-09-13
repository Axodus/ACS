# EPIC-17-REQ-12 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `727143e2c2453a98033ddf8323eb0d082ea001c6`
**Implementation authority:** none
**Migration authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R12-D01` | REQ-01 through REQ-11 form one coherent extension of the implemented ACS with no parallel canonical owner. | `CTO ACCEPTED` |
| `E17-R12-D02` | Agent identity/revision/lineage, Workforce, Workflow, Run/Task, Assignment/Attempt, Runtime, Evidence, Usage/Cost, Product API, persistence and Governance each retain exactly one accepted authority. | `CTO ACCEPTED` |
| `E17-R12-D03` | New logical domains own only the bounded semantics accepted in their REQ and cannot absorb adjacent canonical owners. | `CTO ACCEPTED` |
| `E17-R12-D04` | The original capability inventory is closed at 76/76: 23 existing-system, 15 adapted, 14 extended, 22 new/deferred and 2 rejected dispositions. | `CTO ACCEPTED` |
| `E17-R12-D05` | `REUSE` requires conformance evidence; `ADAPT`/`EXTEND` remain specified implementation inputs; `NEW` remains deferred with explicit blockers; `REJECT` remains prohibited. | `CTO ACCEPTED` |
| `E17-R12-D06` | No capability requires CEO escalation while inheritance, mutation, breeding, reputation, NFT, marketplace, royalties, ownership and Genome economics remain excluded. | `CTO ACCEPTED` |
| `E17-R12-D07` | All 84 inherited blocker IDs remain open/traced and are grouped under 12 causes without loss of source identity. | `CTO ACCEPTED` |
| `E17-R12-D08` | `E17-R12-B01` and `B02` block the first implementation until a concrete IMP-01 is accepted and the ACS validation baseline is reconciled. | `CTO ACCEPTED` |
| `E17-R12-D09` | Four optional/fail-closed paths may defer safely: cross-Tenant Delegation, unsupported Workflow Automation targets, unsupported Workflow Activation targets and performance-derived Genome views. | `CTO ACCEPTED` |
| `E17-R12-D10` | Any incompatible core-owner change triggers architecture escalation; no such escalation is active at REQ-12 closure. | `CTO ACCEPTED` |
| `E17-R12-D11` | All 111 contract deltas and 59 ADR candidates remain traceable inputs and require explicit per-IMP disposition before code. | `CTO ACCEPTED` |
| `E17-R12-D12` | The candidate implementation sequence is IMP-01, IMP-02, parallel IMP-03A/03B, IMP-04 through IMP-10 in dependency order. | `CTO ACCEPTED` |
| `E17-R12-D13` | Every candidate IMP requires a separate CTO charter/GO and its own validated commit; no REQ or this plan grants implementation authority. | `CTO ACCEPTED` |
| `E17-R12-D14` | Durable EPIC-17 state must use existing PostgreSQL/shared transaction, Event, outbox and idempotency authority. | `CTO ACCEPTED` |
| `E17-R12-D15` | Migrations follow additive expand/backfill/verify/cutover/observe/contract stages with one named authority and explicit rollback/roll-forward. | `CTO ACCEPTED` |
| `E17-R12-D16` | Immutable lineage/Evidence is corrected or reconciled append-only; rollback cannot rewrite history or resurrect legally erased content. | `CTO ACCEPTED` |
| `E17-R12-D17` | PostgreSQL acceptance requires disposable supported-database clean-install/upgrade/restart/concurrency/recovery evidence; skipped tests do not pass the gate. | `CTO ACCEPTED` |
| `E17-R12-D18` | Every IMP must prove Tenant isolation, non-disclosure, authority attenuation, secret safety, historical reconstruction and provider independence. | `CTO ACCEPTED` |
| `E17-R12-D19` | `ACS-BLOCKER-014` has conflicting status evidence and cannot be closed/reopened by EPIC-17; governing reconciliation is a first-implementation prerequisite. | `CTO ACCEPTED` |
| `E17-R12-D20` | Administration IA divergence is `BLOCKS SPECIFIC IMP`: IMP-09 must explicitly choose compatibility remediation, contract migration, implementation prerequisite or architecture escalation before UI changes. | `CTO ACCEPTED` |
| `E17-R12-D21` | REQ-12 does not introduce features or choose final entity/aggregate/schema/API/UI forms. | `CTO ACCEPTED` |
| `E17-R12-D22` | The maximum closure state is `EPIC-17 ARCHITECTURE/SPECIFICATION COMPLETE / READY FOR CTO IMPLEMENTATION GATE`. | `CTO ACCEPTED` |
| `E17-R12-D23` | `READY FOR CTO IMPLEMENTATION GATE` means ready to evaluate a concrete IMP; it is not `IMPLEMENTATION AUTHORIZED`. | `CTO ACCEPTED` |
| `E17-R12-D24` | Production, migration, provider, credential, scheduler and runtime authority remain separately gated after any implementation work. | `CTO ACCEPTED` |

Rejected: automatic IMP authorization, feature expansion, parallel core/API/
persistence, universal configuration or reputation model, migration by
implication, silent blocker/ADR/delta disappearance, skipped-test promotion,
incidental IA redesign and every previously rejected Genome economic/genetic
concept.

CTO acceptance closed the EPIC-17 normative REQ sequence. The separate
[CTO Implementation Gate](../implementation-gate/README.md) now contains the
two hard blockers and candidate IMP-01 charter. It authorizes no
implementation, migration, schema, database, API, UI, provider, runtime,
production or rollout change.
