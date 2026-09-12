# Revision Experience

`GET /api/v1/workforces/:workforceId/revisions` provides immutable history. Each revision is directly addressable at `/workforces/:workforceId/revisions/:revision`.

The selected revision presents its own reference, lifecycle, purpose, supersession relationship, and member slots. Historical member Agent references are rendered from that revision payload. Historical revision views are read-only and never substitute current Agent heads.

`/workforces/:workforceId/revisions/new` seeds a draft from the current canonical head. The successor form preserves canonical composition constraints and authority references, exposes member slots and canonical policy references for review, and submits `POST /api/v1/workforces/:workforceId/revisions` with expected head, complete successor composition, policy references, change reason, idempotency key, and request timestamp.

The application reports a `409` as a stale-head conflict and sends the operator back to the current head; it never edits an existing revision in place.
