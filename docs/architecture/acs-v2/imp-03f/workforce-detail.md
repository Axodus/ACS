# Workforce Detail

`GET /api/v1/workforces/:workforceId` provides the current canonical head. The detail screen makes the Workforce ID, lifecycle, current revision, member count, purpose, and update time explicit.

The overview is intentionally concise. Member composition, historical revision contents, Run snapshots, and operations remain in dedicated contexts so a current definition is never presented as an admitted Run snapshot.

The overview offers two canonical writes:

- **Create revision** opens a complete successor form based on the current head and submits `POST /api/v1/workforces/:workforceId/revisions` with expected revision, policy references, idempotency key, timestamp, and change reason.
- **Lifecycle** exposes only accepted successor states for the current status and submits `POST /api/v1/workforces/:workforceId/lifecycle` with expected revision, idempotency key, timestamp, and change reason.

Both paths reload canonical Product API state after success and report a stale-head conflict without attempting a client-side merge.
