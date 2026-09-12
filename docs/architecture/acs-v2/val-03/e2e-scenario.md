# Primary E2E scenario

`tests/acs-v2-val-03-postgres.test.mjs` creates an isolated PostgreSQL schema and uses a canonical shared control-plane context plus real HTTP server.

The scenario proved through its failing checkpoint:

1. Agent A r1 → r2 and Agent B r1 are created by canonical Agent lineage commands.
2. `POST /api/v1/workforces` creates draft Workforce r1; same-key replay returns the same result and a changed payload returns HTTP 409.
3. Draft Run admission is rejected with no persisted Run.
4. HTTP lifecycle creates active r2; HTTP revision creates r3 with two distinct Agent A slots pinned to r1 and one Agent B `current_head_at_admission` slot.
5. A stale workforce expected head returns HTTP 409.
6. Run A admission resolves Agent A to r1 and Agent B to r1.
7. Proposal A remains advisory; Decision A creates canonical assignment generation 1.
8. Runtime compilation of Assignment A fails before Attempt A.

The failure is not caused by an alternate writer or direct SQL setup. The scenario uses direct SQL only for `CREATE SCHEMA`/`DROP SCHEMA`; all domain state is created through the accepted Core or Product API boundary.
