# Workforce List

`GET /api/v1/workforces` drives the Workforce inventory. The page shows identity, current revision, lifecycle, member count, and update time supplied by Product API.

The list supports loading, retryable error, intentional empty state, search, lifecycle filter, and sorting. It does not create health scores or operational quality signals.

When no Workforces are returned, the page explains that a Workforce composes Agents into a reusable execution unit. It also states that creation is unavailable from the current Product API.
