# Application Domain Map

Workforce is a peer application domain between Agents and Runs.

```text
Agents -> Workforces -> Runs
```

The application owns presentation, URL state, retry, filtering, selection, and mutation drafts. The Product API owns Workforce identity, lifecycle, immutable revisions, member references, Run admission snapshots, coordination, assignments, and runtime attempts.

## Application audit

| Existing pattern | Classification | IMP-03F use |
| --- | --- | --- |
| global `domainDefs` sidebar | EXTEND | Workforces peer entry and collection-level Overview / List |
| entity-local sidebar group | EXTEND | Selected Workforce exposes Overview, Members, Revisions, Runs, and Operations |
| React Router shell and breadcrumbs | EXTEND | Workforce routes, entity labels, and successor-revision route |
| `EntityContextNav` / `ContextTabs` | EXTEND | Mirrors selected Workforce navigation in the content shell |
| `DomainHeader`, panels, badges, cards | REUSE | Collection, detail, history, lifecycle, and admitted-Run surfaces |
| `useOperationalSummary` | REUSE | Workforce inventory and scoped Run reads |
| Agent lifecycle forms and confirmations | ADAPT | Workforce successor form, expected-head conflict handling, canonical lifecycle form |
| Runs, governance, and economics pages | ADAPT | Links to canonical admitted history and explicit operations investigation |
| `ReportSectionNav` | OUT OF SCOPE | No long-form report surface is required |
