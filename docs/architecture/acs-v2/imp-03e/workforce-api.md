# Workforce API

`GET /api/v1/workforces` returns identity, display name, current revision, lifecycle, member count and update time. `GET /api/v1/workforces/:id` returns the canonical head and composition. `GET /api/v1/workforces/:id/revisions` returns immutable revisions.

Historical revision references are never replaced by current heads.
