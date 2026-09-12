# Transaction and concurrency

Admission uses the existing transaction, advisory lock, idempotency, event, and outbox primitives. The Workforce lineage lock prevents an admission from silently switching heads. A repeated idempotency key returns the original serialized result, so it does not re-resolve newer Agent heads.
