# Workforce lifecycle API

## Endpoint

```text
POST /api/v1/workforces/:workforceId/lifecycle
```

## Request body

```json
{
  "expectedRevision": 3,
  "targetStatus": "disabled",
  "changeReason": "Pause operations",
  "idempotencyKey": "workforce-lifecycle-4",
  "requestedAt": 3000
}
```

`targetStatus` must be one of `draft`, `active`, `disabled`, or `archived`.

## Canonical transition rules

The route delegates transition validation to Native Core. The accepted changed-status transitions are:

```text
draft    -> active | archived
active   -> disabled | archived
disabled -> active | archived
```

The same status is only accepted for the canonical `workforce.revision.created` event path. An archived Workforce cannot receive successors. Lifecycle changes use `workforce.lifecycle.changed` and create an immutable successor revision, so the prior status and revision remain queryable.

## Semantics and errors

The request uses the same tenant, governance, idempotency, CAS, event, and outbox path as revision creation. A stale expected revision returns HTTP `409`; an invalid transition is rejected by the canonical contract and is not reimplemented in the route. Malformed status or timestamp data returns HTTP `400`. Tenant or governance rejection returns HTTP `403`; an unknown Workforce returns HTTP `404`.

Successful transition returns HTTP `200` with the updated Workforce detail view.
