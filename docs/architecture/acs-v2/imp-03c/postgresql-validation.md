# PostgreSQL validation

Migration 6 is named `coordination_proposals_decisions_and_assignments` and is additive to the accepted IMP-03B schema. It creates proposal, decision, and assignment tables with Run foreign keys, decision/proposal relationships, generation uniqueness, reassignment lineage, and task lookup indexes.

The required durable checks are migration, proposal persistence, atomic decision/assignment/event/outbox writes, idempotency, stale concurrency rejection, reassignment reload, and immutable snapshot reconstruction. These checks passed with `ACS_SH_DATABASE_URL` loaded from `.env.local`.

Validation result:

```text
IMP-03A: 7 passed, 0 failed, 0 skipped
IMP-03B: 4 passed, 0 failed, 0 skipped
IMP-03C: 5 passed, 0 failed, 0 skipped
VAL-01:  1 passed, 0 failed, 0 skipped
```

No PostgreSQL test was skipped. The migration upgrades the IMP-03B schema with coordination proposal, decision, assignment, lineage, and lookup structures.
