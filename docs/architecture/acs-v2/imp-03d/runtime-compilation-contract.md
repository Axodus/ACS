# Runtime compilation contract

`compileTaskExecution` accepts Run, Task, assignment, and idempotency identity. The repository loads the persisted assignment, verifies Run/Task ownership, verifies that the assignment is current, resolves the member from the immutable Run membership snapshot, and loads the exact Agent revision by revision and fingerprint.

Caller supplied Agent, Workforce, member, or revision values are not accepted as authority. Compilation commits the intent, Attempt binding, event, outbox row, and idempotency result in one PostgreSQL transaction.

The operation rejects a missing or superseded assignment with `ACS_NATIVE_STALE_ASSIGNMENT`. It never silently changes the request to the newer assignment.
