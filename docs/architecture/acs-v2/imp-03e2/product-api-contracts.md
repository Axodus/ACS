# Product API contracts

## Shared request controls

All mutation requests require `expectedRevision`, `changeReason`, `idempotencyKey`, and a non-negative safe-integer `requestedAt`. The route authenticates the actor through the existing ACS auth context. The Workforce tenant is compared with the current request tenant; platform administrators use the existing documented bypass.

## Authorization

Revision and lifecycle writes use the existing governed action `workforce.create` through `enforceTenantGovernanceMutation`. This preserves the current Workforce governance contract instead of introducing a second authority model. Native Core receives an allowed `WorkforceMutationAuthority` decision containing the Workforce authority scope and evaluation timestamp.

## Error mapping

| Condition | HTTP | Contract |
| --- | ---: | --- |
| malformed JSON or invalid field/reference | 400 | `validation` |
| tenant or governance rejection | 403 | policy error |
| Workforce not found | 404 | `not_found` |
| stale expected revision or invalid idempotency replay | 409 | `conflict` with a specific reason such as `stale_revision` or `idempotency_conflict` |
| canonical integrity or repository failure | 500 | sanitized server error |

Correlation IDs and route metadata remain in the standard response envelope. Persistence records, secrets, provider credentials, and internal database details are not exposed.

## Event and outbox contract

The Product API supplies event and outbox metadata to the Native Core command. Native Core validates and persists the event, immutable successor, head update, idempotency record, and outbox record transactionally. The Product API does not publish directly and does not bypass the outbox.
