# Navigation and Routing

The global sidebar exposes `Workforces` as a first-class domain.

Implemented direct routes:

```text
/workforces
/workforces/new
/workforces/:workforceId
/workforces/:workforceId/members
/workforces/:workforceId/revisions
/workforces/:workforceId/revisions/:revision
/workforces/:workforceId/runs
/workforces/:workforceId/operations
```

`/workforces/new` explicitly reports unavailable creation rather than returning a route miss. The contextual navigation is entity-local. Breadcrumbs resolve `Workforces / workforceId / subsection` through the shared shell.

The Operations route accepts `runId` and `taskId` query parameters. They are explicit identifiers, not inferred context.
