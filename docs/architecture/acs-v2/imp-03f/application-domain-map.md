# Application Domain Map

Workforce is a peer application domain between Agents and Runs.

```text
Agents -> Workforces -> Runs
```

The application owns presentation, URL state, retry, filtering, and selected-section state. The Product API owns Workforce identity, lifecycle, revisions, member references, Run admission snapshots, coordination, assignments, and runtime attempts.

## Application audit

| Existing pattern | Classification | IMP-03F use |
| --- | --- | --- |
| global `domainDefs` sidebar | EXTEND | Added `Workforces` peer entry and collection-level `All Workforces` |
| entity-local sidebar group | EXTEND | Selected Workforce exposes Overview, Members, Revisions, Runs, and Operations |
| React Router shell and breadcrumbs | EXTEND | Added Workforce routes and entity labels |
| `EntityContextNav` / `ContextTabs` | EXTEND | Mirrors the selected Workforce local navigation in the content shell |
| `DomainHeader`, panels, badges, cards | REUSE | List and detail surface |
| `useOperationalSummary` | REUSE | Workforce inventory reads |
| Agent lifecycle forms and confirmations | OUT OF SCOPE | Workforce writes are absent from Product API |
| Runs, governance, and economics pages | ADAPT | Cross-links only; no domain truth copied |
| `ReportSectionNav` | OUT OF SCOPE | No long-form report surface is needed |
