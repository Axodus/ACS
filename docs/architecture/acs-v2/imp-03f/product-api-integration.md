# Product API Integration

IMP-03F adds typed client reads for the accepted IMP-03E surface only:

```text
GET /workforces
GET /workforces/:workforceId
GET /workforces/:workforceId/revisions
GET /runs/:runId/workforce
GET /tasks/:taskId/coordination?runId=:runId
GET /tasks/:taskId/runtime?runId=:runId
```

All dynamic path values are encoded. The application retains no canonical Workforce store and makes no direct repository, database, runtime, provider, Eigent, CAMEL, or Agenta calls.

Missing API capabilities: Workforce create, revise, lifecycle transitions, and list Runs by Workforce.
