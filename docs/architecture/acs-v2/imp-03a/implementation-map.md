# Implementation map

| Concern | Classification | ACS implementation |
| --- | --- | --- |
| Native schema validation, serialization, fingerprints | EXTEND | `src/native-core/workforce.ts` reuses native primitives and strict validation. |
| Agent identity and revision lineage | REUSE | Existing `NativeCore` Agent lineage and exact `RevisionRef` lookup. |
| Workforce identity and immutable revisions | NEW ACS PRIMITIVE | `WorkforceDefinitionV2`, `WorkforceRevisionV2`, and `WorkforceMemberV2`. |
| Head CAS and lineage transaction | EXTEND | `PostgresNativeCoreRepository.advanceWorkforceLineage`. |
| Idempotency | REUSE | Existing `acs_native_idempotency` and repository helper. |
| Canonical events and retryable outbox | REUSE | Existing native event stream and outbox methods, with Workforce event validation. |
| Governed-role historical resolution | NEW ACS PRIMITIVE | `GovernedRoleRevisionV2` and `acs_governed_role_revisions`. |
| PostgreSQL schema | EXTEND | Migration 4 in `src/control-plane/shared-state/migrations.ts`. |
| Public application surface | NOT REQUIRED | No UI, route, provider, Eigent, or CAMEL change. |
| Run admission and resolved membership snapshot | NOT REQUIRED | Deferred to IMP-03B. |

The repository boundary is exposed through `AsyncNativeCoreRepository` and the
PostgreSQL shared-state facade. Persistence details remain below this boundary.
