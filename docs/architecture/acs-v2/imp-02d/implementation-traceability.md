# IMP-02D Implementation Traceability

| Requirement | ACS contract/API | Frontend implementation | Focused evidence |
| --- | --- | --- | --- |
| Bounded Agent Runs | `GET /agents/:agentId/execution-runs?limit&offset` | `AgentRunsView`, URL-backed offset controls | Standalone IMP-02D test; IMP-02D1 compatibility test; localhost validation |
| Run state, timestamps, duration | `ExecutionRunSummary` | Canonical status, timestamps, direct duration rendering | Standalone IMP-02D test |
| Historical revision correctness | `revisionId: 0` is not canonical provenance | Explicitly withheld | Standalone IMP-02D test |
| Bounded Agent Evidence | `GET /agents/:agentId/evidence?limit&offset` | `AgentEvidenceView`, URL-backed offset controls | Standalone IMP-02D test; IMP-02D1 compatibility test; localhost validation |
| Evidence provenance | `title`, `summary`, `source`, `entityRefs`, `correlationId` | Render supplied metadata only | Standalone IMP-02D test |
| Bounded Agent Usage | `GET /economics/usage?agentId&limit=50` | Existing Usage record list retained | Standalone IMP-02D test; IMP-02D scope test |
| Scoped economics projection | `GET /agents/:agentId/economics` | Secondary request; zero-valued totals withheld | Standalone IMP-02D test; IMP-02D1 compatibility test |
| Economic correlation | Usage `executionRunId`, `reservationId`, `quoteId`, `settlementId` | Canonical identifier chips only | Standalone IMP-02D test; s63 regression |
| Cross-Agent isolation | Product API query scope | No global browser filtering | IMP-02D scope and IMP-02D1 tests; localhost validation |
| Frozen navigation and routes | Existing Agent-local paths | Routes unchanged; route elements updated | IMP-02A and IMP-02D frontend tests |
