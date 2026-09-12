# Implementation map

| Concern | Implementation |
| --- | --- |
| Runtime contract | `src/native-core/runtime-compilation.ts` |
| Attempt binding | `src/native-core/runtime.ts` (`TaskAttemptV2`) |
| Durable compilation | `src/control-plane/shared-state/native-core-durable.ts` |
| PostgreSQL transaction wrapper | `src/control-plane/shared-state/postgres-shared-state.ts` |
| Schema | `src/control-plane/shared-state/migrations.ts`, migration 7 |
| Public native export | `src/native-core/index.ts` |
| Conformance tests | `tests/acs-v2-imp-03d.test.mjs` |

Existing lease, fencing, checkpoint, event, outbox, evidence, and idempotency primitives are reused.
