# IMP-02D Operational Contract Inventory

| Domain | Existing Product API | Agent scope | Pagination / bound | IMP-02D decision |
| --- | --- | --- | --- | --- |
| Runs | `GET /agents/:agentId/execution-runs` | Direct server-side `agentId` | No query parameters, limit, or pagination | UNAVAILABLE — do not load unbounded history |
| Execution Run detail | `GET /execution-runs/:runId` | Run ID only | Single record | Not linked as a new detail surface |
| Tasks / Attempts | No Agent-scoped Product API route verified | Unavailable | N/A | Not rendered |
| Evidence | `GET /agents/:agentId/evidence` | Direct server-side `agentId` | No query parameters, limit, or pagination | UNAVAILABLE — do not load unbounded history |
| Generic Evidence filter | `GET /evidence?agentId=:agentId&limit=:limit` | `agentId` parameter is accepted but currently ignored by `buildEvidenceQuery` | `limit` supported but scope is unsafe | UNAVAILABLE — existing compatibility defect |
| Evidence detail | `GET /evidence/:evidenceId` | Evidence ID only | Single record | No new detail route added |
| Agent economics summary | `GET /agents/:agentId/economics` | Route accepts `agentId`, but `getEconomicSummary({ agentId })` does not apply it | No bounded Agent result | UNAVAILABLE — existing compatibility defect; do not render |
| Usage records | `GET /economics/usage?agentId=:agentId&limit=:limit` | Direct server-side `agentId` | `limit` supported; current page requests 50 | USE |
| Cost | No standalone Product API cost-record route verified | Unavailable | N/A | Not rendered; the scope-unsafe Agent economics summary cannot stand in for a canonical Agent cost total |
| Quote | `GET /economics/quotes?agentId=:agentId&limit=:limit` | Route supports `agentId` | `limit` supported | Not separately rendered; referenced by Usage when supplied |
| Reservation | `GET /economics/reservations?agentId=:agentId&limit=:limit` | Route supports `agentId` | `limit` supported | Not separately rendered; referenced by Usage when supplied |
| Settlement | `GET /economics/settlements?executionRunId=:runId&limit=:limit` | Canonical Run query supported | `limit` supported | Not separately rendered; referenced by Usage when supplied |

The API service filters Usage by canonical `agentId`. The Agent-specific Run and Evidence projections are scoped but unbounded. The generic Evidence route currently fails to forward `agentId` into its internal query, and the Agent economics summary fails to apply its requested Agent filter; neither is used. The UI does not treat route state as an authorization boundary.
