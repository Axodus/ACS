# Pre-implementation map

## Existing canonical primitives

Before IMP-03E2, the repository already provided the required Native Core primitive:

- `advanceWorkforceLineage` performs idempotency, PostgreSQL transaction handling, advisory locking, expected-head CAS, immutable revision checks, event validation, event persistence, and outbox persistence.
- `assertLifecycleTransition` validates the canonical Workforce state machine.
- `listWorkforceRuns` can query canonical Runs by `workforce_id` and preserve each Run's admitted Workforce revision and membership snapshot.
- `createWorkforceRevisionV2` and `createWorkforceDefinitionV2` create immutable, fingerprinted canonical objects.

The lifecycle work was therefore not stopped. No missing primitive or fallback implementation was introduced.

## Product API composition

The HTTP layer composes these primitives in three steps:

1. Authenticate the request and enforce the current tenant boundary.
2. Read the current canonical Workforce lineage and validate the request body.
3. Build one canonical successor command or one canonical read query and delegate to Native Core.

Mutation authorization continues through the existing governed action `workforce.create`, which is the repository's established Workforce governance action for this Product API surface.

## Data and failure boundaries

The route never updates PostgreSQL tables directly. It returns sanitized Product API envelopes and maps malformed requests, tenant/governance rejection, missing resources, CAS conflicts, idempotency conflicts, and repository failures at the existing HTTP boundary.

The Run query reads the existing `acs_native_runs` table and its optional membership snapshot. It does not infer historic usage from the current Workforce head.
