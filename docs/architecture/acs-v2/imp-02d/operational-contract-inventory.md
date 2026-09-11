# IMP-02D Operational Contract Inventory

| Domain | Existing Product API | Agent scope | Pagination / bound | R1 decision |
| --- | --- | --- | --- | --- |
| Runs | `GET /agents/:agentId/execution-runs?limit=&offset=` | Direct route `agentId`; server filters before returning | Default 50, maximum 100, offset 0–10,000 | USE |
| Run detail | `GET /execution-runs/:runId` | Run ID only | Single record | Not added as an Agent-local detail route |
| Tasks / Attempts | No Agent-local Product API query verified | Unavailable | N/A | Not rendered |
| Evidence | `GET /agents/:agentId/evidence?limit=&offset=` | Direct route `agentId`; server filters before returning | Default 50, maximum 100, offset 0–10,000 | USE |
| Generic Evidence | `GET /evidence?agentId=:agentId&limit=:limit` | `agentId` forwarding repaired in IMP-02D1 | Existing generic limit behavior | Not used by Agent-local frontend |
| Evidence detail | `GET /evidence/:evidenceId` | Evidence ID only | Single record | No new Agent-local detail route |
| Usage | `GET /economics/usage?agentId=:agentId&limit=50` | Query `agentId`; server-scoped | Bounded to 50 by this view; no paging contract consumed | USE |
| Agent economics projection | `GET /agents/:agentId/economics` | Direct route `agentId`; scope repaired in IMP-02D1 | Single scoped projection | Secondary semantics check; zero-valued projections are not shown as totals |
| Cost | No standalone Agent cost-record route verified | Unavailable | N/A | No cost total or derived accounting shown |
| Quote | Usage carries `quoteId`; Product API has quote queries | Canonical identifiers | N/A in Agent-local view | Identifier shown when supplied |
| Reservation | Usage carries `reservationId` | Canonical identifiers | N/A in Agent-local view | Identifier shown when supplied |
| Settlement | Usage carries `settlementId` | Canonical identifiers | N/A in Agent-local view | Identifier shown when supplied |

Run ordering is `startedAt DESC, runId DESC`. Evidence ordering is `createdAt DESC, evidenceId DESC`. The frontend preserves both orders without re-sorting.
