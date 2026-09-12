# Implementation map

| Concern | Classification | Location |
| --- | --- | --- |
| Proposal/decision/assignment contracts | NEW ACS primitive | `src/native-core/coordination.ts` |
| Native repository commands and reads | EXTEND | `src/control-plane/shared-state/native-core-durable.ts` |
| PostgreSQL transaction forwarding | EXTEND | `src/control-plane/shared-state/postgres-shared-state.ts` |
| PostgreSQL schema | EXTEND | migration 6 in `src/control-plane/shared-state/migrations.ts` |
| Run/Task ownership | REUSE | `RunV2`, `TaskV2`, existing admission APIs |
| Exact member and Agent revision | REUSE | `WorkforceRunMembershipV2` snapshot |
| Events, outbox, idempotency | REUSE | existing native durable primitives |
| Scheduler/runtime/provider behavior | OUT OF SCOPE | no implementation added |

No parallel Task repository or external coordination authority was introduced.
