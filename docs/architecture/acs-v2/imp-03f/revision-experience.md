# Revision Experience

`GET /api/v1/workforces/:workforceId/revisions` provides immutable history. Each revision is directly addressable at `/workforces/:workforceId/revisions/:revision`.

The selected revision presents its own reference, lifecycle, purpose, supersession relationship, and member slots. Historical member Agent references are rendered from that revision payload. The UI does not substitute current Agent heads and exposes no editing controls.

Canonical creation of a new Workforce revision is unavailable and remains blocked by a Product API write contract.
