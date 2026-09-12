# Concurrency and idempotency

Workforce mutations use the same native transaction and advisory-lock pattern
as the accepted Agent lineage. The repository locks the Workforce stream,
checks the expected current head, inserts one immutable successor, advances the
head projection, appends the canonical event, enqueues outbox delivery, and
records the idempotency result before commit.

An expected head of zero creates only draft revision 1. Successors must be the
immediate next revision and name their predecessor. Concurrent writers from
the same head yield one committed winner and one typed `RevisionConflictError`.
There is no last-write-wins or direct rewind path.

Repeated commands with the same scope, key, operation, and request hash replay
the stored result. Reuse with a different request hash or operation raises
`NativeIdempotencyConflictError`. Failure injection around head update,
revision insert, event insert, outbox insert, and idempotency write confirms
that transaction rollback leaves no partial Workforce mutation.
