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

`/workforces/new` explicitly reports unavailable creation rather than returning a route miss.

The sidebar separates the collection and entity scopes:

```text
Workforces
├─ Overview / List
├─ Members (select a Workforce)
├─ Revisions (select a Workforce)
├─ Runs (select a Workforce)
└─ Operations (select a Workforce)

Workforce: <canonical display name>
├─ Overview
├─ Members
├─ Revisions
├─ Runs
└─ Operations
```

The collection always displays the conceptual Workforce tree. Before an entity is selected, Overview / List is the only navigable item and the other branches state that a Workforce must be selected. The entity group is visible only on a selected Workforce route. The display name is read from the canonical Workforce detail response; the URL-safe Workforce ID remains visible as a fallback while a direct link resolves or the API reports an error. The current subsection is the single active local link.

Breadcrumbs resolve `Workforces / workforceId / subsection` through the shared shell.

The Operations route accepts `runId` and `taskId` query parameters. They are explicit identifiers, not inferred context.
