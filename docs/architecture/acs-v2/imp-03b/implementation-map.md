# Implementation map

| Concern | Implementation |
| --- | --- |
| Contract | `src/native-core/workforce-run-membership.ts` |
| Repository | `PostgresNativeCoreRepository.admitWorkforceRun` |
| Transaction wrapper | `PostgresSharedAuthoritativeState.nativeCore` |
| Persistence | migration 5 in `shared-state/migrations.ts` |
| Events/outbox | existing native event and retryable outbox primitives |
| Idempotency | existing `acs_native_idempotency` transaction primitive |
| Historical roles | exact role revision references from IMP-03A |

Operational admission binds the active current Workforce head. The optional explicit revision is accepted only when it equals that head; historical replay remains a separate authorization path.
