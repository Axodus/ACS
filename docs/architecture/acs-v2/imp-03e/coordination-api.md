# Coordination API

`GET /api/v1/tasks/:id/coordination?runId=...` exposes proposals, decisions, current assignment and assignment history. Proposals carry `canonicalStatus: advisory`; decisions carry `canonicalStatus: canonical`.
