# ACS v2 IMP-03D

Runtime compilation consumes an accepted `TaskAssignmentV2` and durably binds it to an immutable runtime execution intent and `TaskAttemptV2`.

The boundary is:

`Coordination → TaskAssignmentV2 → execution intent → Attempt → existing lease/fencing → executor`

Coordination remains responsible for membership and assignment. Runtime validates and records canonical identity, rejects stale pre-execution assignments, and reconstructs historical bindings after restart.

## Scope

IMP-03D adds PostgreSQL migration 7, native compilation interfaces, assignment-bound Attempt persistence, event/outbox atomicity, typed stale/corruption errors, and recovery binding validation. Scheduler policy, reassignment policy, provider integration, and Cost remain out of scope.

See the companion documents for the contract, persistence map, concurrency rules, and validation record.
