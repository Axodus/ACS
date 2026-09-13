# REQ-12 Contract Delta and ADR Resolution Plan

## Inventory result

| Source | Candidate deltas | Candidate ADRs |
| --- | ---: | ---: |
| REQ-01 | 6 | 3 |
| REQ-02 | 8 | 3 |
| REQ-03 | 8 | 4 |
| REQ-04 | 8 | 5 |
| REQ-05 | 7 | 4 |
| REQ-06 | 8 | 5 |
| REQ-07 | 10 | 5 |
| REQ-08 | 10 | 5 |
| REQ-09 | 14 | 8 |
| REQ-10 | 17 | 9 |
| REQ-11 | 15 | 8 |
| **Total** | **111** | **59** |

Acceptance of a REQ accepted these as candidates and accepted their boundary
direction. It did not freeze a final DTO, aggregate, schema or implementation.

## Resolution by candidate IMP

| Candidate IMP | Delta sources | ADR candidates | Required disposition before code |
| --- | --- | --- | --- |
| `IMP-01` | REQ-01, REQ-02 | `ADR-17-001` through `ADR-17-006` | Accept, merge, supersede or reject every relevant item; freeze canonical mutation and historical Profile/head semantics. |
| `IMP-02` | REQ-03, REQ-04 | `ADR-17-007` through `ADR-17-015` | Freeze snapshot serialization/fingerprint and owner-specific resource-history rules. |
| `IMP-03A` | REQ-05 | `ADR-17-016` through `ADR-17-019` | Freeze integration definition/instance/secret/Channel contracts. |
| `IMP-03B` | REQ-06 | `ADR-17-020` through `ADR-17-024` | Freeze Memory policy/store/reference, consent, deletion and provider adapter contracts. |
| `IMP-04` | REQ-07 | `ADR-17-025` through `ADR-17-029` | Freeze grant representation, attenuation, chain and revocation behavior. |
| `IMP-05` | REQ-08 | `ADR-17-030` through `ADR-17-034` | Freeze Automation representation, revisions, lifecycle and target/authority references. |
| `IMP-06` | REQ-09 | `ADR-17-035` through `ADR-17-042` | Freeze Activation occurrence, schedule recovery, admission handoff and attribution. |
| `IMP-07` / `IMP-09` | REQ-10 | `ADR-17-043` through `ADR-17-051` | Split API/Admin contracts from UI/IA work and explicitly decide Administration placement before UI code. |
| `IMP-08` | REQ-11 | `ADR-17-052` through `ADR-17-059` | Freeze minimum trait/assertion/asset/verification contracts; retain all economic/genetic rejections. |

## ADR consolidation rule

An IMP may merge closely coupled ADR candidates, but its decision record must
map every original ADR number to `ACCEPTED`, `SUPERSEDED_BY`, `REJECTED` or
`DEFERRED_WITH_BLOCKER`. No ADR disappears, and commit/PR text cannot promote a
candidate through implication.

Contract deltas follow the same rule. The IMP charter lists every consumed
`E17-RNN-CDNN` ID, its final owner, interface, compatibility/migration impact,
tests and rollback behavior. Unconsumed deltas remain deferred and unavailable.
