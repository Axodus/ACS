# Runs and Operations

`GET /api/v1/workforces/:workforceId/runs` provides a deterministic Workforce-filtered Run list. Each row shows the admitted Workforce revision, admission timestamp, Run status, creation timestamp, and optional membership snapshot ID. The row links to the historical revision admitted by that Run and to explicit Run investigation; the application never infers historic usage from the current Workforce definition.

The Operations subsection supports investigation with explicit `runId` and `taskId`:

- `GET /api/v1/runs/:runId/workforce` renders admitted Workforce revision and immutable member snapshots;
- `GET /api/v1/tasks/:taskId/coordination?runId=:runId` renders advisory proposals, canonical decisions, current assignment, and assignment history;
- `GET /api/v1/tasks/:taskId/runtime?runId=:runId` renders explicit attempt, Agent revision, Workforce revision, slot, generation, and recovery fields.

The screen rejects a supplied Run when its admitted Workforce differs from the route Workforce.
