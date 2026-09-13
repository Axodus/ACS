# EPIC-17-REQ-08 — Automation Domain Identity & Revision Boundary

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `5dc66772e07ec3a6d00170ac622ff590301672cc`
**Dependencies:** `REQ-01`, `REQ-03`, `REQ-04` and `REQ-07 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
Automation
  = Tenant-scoped durable configured execution intention
  + stable logical identity
  + immutable authored revisions
  + independently recorded lifecycle head/history
  -> may later be evaluated for Activation

Automation != Activation
Automation != RuntimeExecutionIntent
Automation != Run / Workflow / Task
Automation != Trigger / Schedule / scheduler
Automation != executor
```

The Automation domain owns configured intention identity, authored
configuration and lifecycle semantics. Governance owns authority and policies;
target domains own their definitions; Admission and Runtime own execution;
Evidence and Economics own proof, Usage and Cost.

Stable identity and immutable revision semantics are required because triggers,
history, lifecycle and eventual Activations need one durable subject while
configuration changes remain reconstructable. This conclusion does not
authorize a separate aggregate, repository, table, API or revision store.

## Capability dispositions

| Capability | Class | REQ-08 disposition |
| --- | --- | --- |
| `E17-C43` Automation domain | `NEW` | Establish Automation as the owner of durable configured execution intention, subordinate to Governance and existing execution domains. |
| `E17-C44` Automation identity and revisions | `NEW` | Require stable logical identity, immutable fingerprinted authored revisions and separate lifecycle history; physical aggregate remains unproven. |
| `E17-C45` Automation lifecycle | `NEW` | Define draft, enabled, disabled and archived eligibility semantics without copying Agent lifecycle behavior. |
| `E17-C49` Target resolution | `ADAPT` | Reference canonical target owners with explicit pinned or resolve-at-Activation selection; never embed provider/executor identity. |

## Package

- [Evidence and ownership](evidence-and-ownership.md)
- [Identity, revision and lifecycle](identity-revision-and-lifecycle.md)
- [Target, configuration and authority](target-configuration-and-authority.md)
- [Evidence, Cost and historical reconstruction](evidence-cost-and-history.md)
- [Representation analysis](representation-analysis.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

## Non-goals

- Trigger, Schedule, scheduler, Activation and due-work implementation;
- Run, Task, Workflow, Agent or Workforce replacement;
- provider/executor-owned Automation identity;
- permanent authority derived from creation or enablement;
- aggregate, repository, database, schema, table, API or UI selection;
- new pricing, budget, settlement or Automation economics.

```text
REQ-08: COMPLETE / READY FOR CTO ACCEPTANCE
REQ-09: BLOCKED_BY_REQ-08_ACCEPTANCE
Implementation authority: NONE
```
