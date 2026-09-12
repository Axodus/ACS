# Transaction and concurrency

Compilation runs inside the existing PostgreSQL transaction wrapper. It locks the idempotency key and the Run/Task compilation key, reads the assignment with a transaction boundary, and records intent, Attempt, event, outbox, and idempotency result together.

Replays return the stored result for the same request hash. Reusing a key with a different request is a typed idempotency conflict. Concurrent compilers serialize on the same Run/Task key; a superseded generation is rejected rather than resolved with last-write-wins.
