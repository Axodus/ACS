# Product API Integration

IMP-03F consumes typed Product API reads and the authorized initial creation route:

```text
GET /workforces
POST /workforces
GET /workforces/:workforceId
GET /workforces/:workforceId/revisions
GET /runs/:runId/workforce
GET /tasks/:taskId/coordination?runId=:runId
GET /tasks/:taskId/runtime?runId=:runId
```

`POST /workforces` creates only a canonical draft `r1`. It accepts identity, one existing Agent member slot, canonical membership/audit policy revision references, idempotency, and a request timestamp. Tenant scope is derived from the selected Agent; lineage, events, and outbox persistence remain native-core responsibilities.

All dynamic path values are encoded. The application retains no canonical Workforce store and makes no direct repository, database, runtime, provider, Eigent, CAMEL, or Agenta calls.

Missing API capabilities: Workforce create, revise, lifecycle transitions, and list Runs by Workforce.
