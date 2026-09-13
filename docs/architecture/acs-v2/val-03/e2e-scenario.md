# Primary E2E scenario

`tests/acs-v2-val-03-postgres.test.mjs` uses an isolated PostgreSQL schema and only accepted Core or Product API writes.

1. Create Agent A r1 → r2 and Agent B r1.
2. Create Workforce r1 draft through HTTP; replay succeeds with the same idempotency key and conflicting replay returns 409.
3. Reject draft Run admission atomically.
4. Activate r2, create composition r3, and reject stale expected head with 409.
5. Admit Run A: two pinned Agent A r1 slots and Agent B r1 resolved from current head.
6. Record advisory Proposal A, canonical Decision A, Assignment generation 1, runtime intent, and Attempt A.
7. Advance Agent heads and Workforce to r4; Run A and Attempt A retain their original bindings.
8. Admit Run B on r4; Agent B resolves to r2.
9. Reassign Run A Task to generation 2; stale generation compilation is rejected; compile and create Attempt B.
10. Archive Workforce to r5 and reject archived → active with accepted HTTP 400 typed validation error.
11. Recompose the shared host and verify all Product API projections plus recovery views.
12. The prior Application proof created another draft Workforce and validated contextual routes, reload, lifecycle controls, and Run history. The current Agent selector fails before creation because its Product API inventory omits the canonical Agent.

Direct SQL is limited to schema lifecycle (`CREATE SCHEMA` / `DROP SCHEMA`).
