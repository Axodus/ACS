# Schema and migrations

Migration 4, `workforce_durable_lineage_and_governed_role_history`, is
additive over the accepted schema version 3. It creates:

- `acs_workforces`, the current identity and head projection;
- `acs_workforce_revisions`, append-only revision payloads with predecessor,
  fingerprint, lifecycle, event, and commit metadata;
- `acs_governed_role_revisions`, append-only exact role versions; and
- the Workforce reference/index on `acs_native_events`.

The Workforce head is protected by a deferred composite foreign key to the
matching latest revision, fingerprint, and lifecycle status. Revision rows
also enforce contiguous predecessor semantics at the database boundary.

The repository inserts the revision and advances the head inside the existing
transaction. The canonical event and outbox row are created before commit, so
failure rolls back the whole mutation. Existing v1-v3 tables and rows are
preserved; clean initialization applies all migrations in order.
