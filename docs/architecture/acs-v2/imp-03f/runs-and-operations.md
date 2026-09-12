# Runs and Operations

The accepted Product API does not provide a Workforce-filtered Run list. The Runs subsection states that limitation, links to the cross-Workforce Runs domain, and does not infer historic usage from the current Workforce definition.

The Operations subsection supports investigation with explicit `runId` and `taskId`:

- `GET /api/v1/runs/:runId/workforce` renders admitted Workforce revision and immutable member snapshots;
- `GET /api/v1/tasks/:taskId/coordination?runId=:runId` renders advisory proposals, canonical decisions, current assignment, and assignment history;
- `GET /api/v1/tasks/:taskId/runtime?runId=:runId` renders explicit attempt, Agent revision, Workforce revision, slot, generation, and recovery fields.

The screen rejects a supplied Run when its admitted Workforce is different from the route Workforce.
