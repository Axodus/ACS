# Workforce Detail

`GET /api/v1/workforces/:workforceId` provides the current canonical head. The detail screen makes the Workforce ID, lifecycle, current revision, member count, purpose, and update time explicit.

The overview is intentionally concise. Member composition, historical revision contents, Run snapshots, and operations remain in their dedicated contexts so a current definition is never presented as an admitted Run snapshot.

No lifecycle or revision action is rendered because the accepted Product API does not expose those writes.
