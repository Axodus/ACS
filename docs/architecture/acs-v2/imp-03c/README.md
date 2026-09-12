# ACS-V2-IMP-03C

IMP-03C adds the durable ACS-native coordination record layer on top of an admitted Workforce Run.

The boundary is:

```text
proposal (advisory) -> decision (canonical) -> assignment (exact admitted member slot)
                                                     -> runtime later
```

The implementation preserves Run/Task ownership, immutable Workforce Run membership, exact Agent revision references, append-only reassignment history, and the existing PostgreSQL event/outbox/idempotency patterns.

The implementation is validated against the configured PostgreSQL database as well as the in-memory/shared-state conformance paths. The final repository result is 710 passed, 0 failed, and 0 skipped.

The PostgreSQL connection is loaded from `.env.local` during validation with `ACS_SH_DATABASE_URL` exported for the test process.

## Scope

Included: proposal, decision, assignment, reassignment lineage, typed coordination conflicts, idempotency, transaction locking, events/outbox, migration 6, reload reads, and focused conformance coverage.

Excluded: scheduling policy, supervisor strategy, delegation, runtime compilation/execution, provider routing, CAMEL, Eigent, UI, Task creation, Attempt creation, and Usage/Cost changes.
