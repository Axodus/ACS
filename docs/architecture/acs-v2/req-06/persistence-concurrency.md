# Persistence and Concurrency

## Persistence decision

Workforce durable state MUST extend the existing shared PostgreSQL
PostgresSharedAuthoritativeState and native-core repository patterns. No Eigent
SQLite journal, CAMEL memory object, external coordination database, provider
store, new broker, or second canonical persistence system is allowed.

## Conceptual additive records

| Record | Key constraints | Purpose |
| --- | --- | --- |
| acs_workforces | workforce_id primary key; current head/current status/scope | Current canonical definition head and denormalized current-status projection. |
| acs_workforce_revisions | workforce_id/revision and workforce_id/fingerprint unique | Append-only revision history. |
| acs_workforce_run_memberships | run_id/slot_id unique | Exact Agent revision resolved at Run admission. |
| acs_task_assignment_decisions | task_run_id plus monotonic decision key | Append-only accepted coordination decisions, including assigned member slot, predecessor decision, authority, rationale, and policy refs. It supplements rather than duplicates Task state. |

Creation or advancement MUST atomically write definition/head, revision history,
canonical event, outbox row, and idempotency result. Run admission MUST
atomically write Run binding, all resolved membership rows, admission
event/outbox, and idempotency result.

Role references use the existing governed-resource domain. Before Workforce
membership with a role reference is admitted, that domain MUST resolve the
exact role id/revision retained by the Workforce revision. The present registry
does not demonstrate that historical lookup; an authorized implementation MUST
extend governed-resource history or durable resolution there. It MUST NOT add a
second role store owned by Workforce Core.

## Concurrency rules

- Workforce revision uses expected-head CAS, matching Agent lineage. Conflicts
  are explicit and never auto-merged.
- Run admission rechecks active Workforce status, membership eligibility,
  sharing scope, exact Agent revision fingerprints, and authority in one
  transaction.
- A current-head Agent selector is resolved once under admission. Later Agent
  head changes do not alter the admitted Run.
- Task assignment/reassignment MUST use Task/plan state versioning plus existing
  idempotency and runtime fencing. Running, leased, and completed attempts are
  immutable.
- Runtime ownership retains lease/fencing controls; Workforce revision changes
  cannot invalidate a committed Task attempt retroactively.

## Recovery

Restart reconstruction verifies contiguous Workforce revisions, fingerprints,
predecessors, current head, and every Run membership reference. A mismatch is a
repository integrity error and blocks the affected canonical write path pending
separate repair. An adapter snapshot or Eigent TaskLock is never a recovery
source of truth.
