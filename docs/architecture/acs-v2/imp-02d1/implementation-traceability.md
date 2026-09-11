# IMP-02D1 Implementation Traceability

| IMP-02D gap | Product API contract | Compatibility implementation | Focused evidence |
| --- | --- | --- | --- |
| Agent Runs unbounded | `GET /agents/:agentId/execution-runs` | `product-api-routes.ts` validates bounded `limit`/`offset`; `RuntimeLifecycleService.listAgentExecutionRuns()` applies isolation and `agentId` before retaining a bounded ordered window; `ProductApiClient` maps the result. | `imp-02d1-agent-operational-query-compatibility.test.mjs`: 55 Agent A records, Agent B exclusion, two pages, deterministic order, empty, not found, invalid bounds. |
| Agent Evidence unbounded | `GET /agents/:agentId/evidence` | Route validates the same page parameters; `ProductApiClient.listAgentEvidence()` forwards them; `OperationalEvidenceService` streams filtered events through a bounded deterministic Evidence collector. `AuditService.forEachEvent()` and the existing stores avoid an unbounded intermediate result for bounded Evidence pages. | Focused test: two Evidence pages, Agent B exclusion, ordering, provenance/entity references, empty, not found, invalid bounds. |
| Generic Evidence `agentId` silently ignored | `GET /evidence?agentId=:agentId` | `buildEvidenceQuery()` forwards the established `agentId` parameter. | Focused test requests generic Evidence for Agent A and receives exactly its 55 canonical Evidence records. |
| Agent economics summary ignores scope | `GET /agents/:agentId/economics` and `GET /economics/summary?agentId=:agentId` | `OperationalEvidenceService.getEconomicSummary()` filters existing Agent, Deployment, Runtime, and Execution Run projections by query scope. | Focused test proves Agent A projections exclude B and Agent C receives canonical zero/empty operational state. |
| Usage/reservation correlation regression risk | `GET /economics/usage?agentId=:agentId&limit=50` and s63 correlation chain | No Usage or accounting code changed. | `s63-epic-16-3-usage-settlement.test.mjs` passes; focused test confirms Agent A Usage excludes Agent B. |

No frontend source, public route, persistence schema, migration, index, read model, dependency, or accounting formula changed.
