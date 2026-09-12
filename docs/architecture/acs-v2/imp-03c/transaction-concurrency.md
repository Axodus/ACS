# Transactions and concurrency

Proposal recording uses the existing native transaction, idempotency, event, and outbox path.

Decision recording locks the coordination head with a PostgreSQL transaction advisory lock scoped to Run and Task. It checks expected/prior assignment state before inserting the decision and assignment. The decision, assignment, event, outbox record, and idempotency result commit atomically through `PostgresSharedAuthoritativeState.withTransaction`.

The database also enforces unique `(run_id, task_id, generation)` and `(run_id, task_id, decision_id)` assignment constraints. The implementation does not use last-write-wins semantics.
