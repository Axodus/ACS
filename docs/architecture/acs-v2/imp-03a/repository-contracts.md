# Repository contracts

`AsyncNativeCoreRepository` now supports:

- `advanceWorkforceLineage`, with explicit ACS authority, expected head,
  idempotency, and canonical event input;
- `getWorkforceLineage`, `getWorkforceRevision`, and
  `listWorkforceRevisions`;
- `recordGovernedRoleRevision` with role-head CAS; and
- `getGovernedRoleRevision` by exact role revision and fingerprint.

`PostgresSharedAuthoritativeState` wraps canonical mutations in the existing
transaction helper and exposes reads through the native repository session.
The result includes the reconstructed definition and revisions, the durable
event, and the outbox record.

Validation rejects unsupported runtime/provider/task fields, malformed member
selectors, invalid exact Agent references, invalid role references, empty
membership, duplicate slot ids, and indistinguishable repeated Agent slots.
Agent scope and lifecycle eligibility are checked when a Workforce revision is
committed. Historical reads continue to validate exact pinned and role history
references without substituting current heads.
