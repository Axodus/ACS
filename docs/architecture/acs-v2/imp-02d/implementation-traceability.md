# IMP-02D Implementation Traceability

| Requirement | Existing ACS contract/API | Frontend implementation | Focused evidence |
| --- | --- | --- | --- |
| Agent-local Evidence | Direct Agent endpoint is unbounded; generic `agentId` filter is currently ignored | Explicit unavailable state retained | Contract inventory; integration scope test |
| Evidence provenance and Run correlation | `EvidenceRecord.source`, `entityRefs`, `correlationId` | Deferred pending safe Agent query | Contract inventory |
| Agent-local economic summary | `GET /agents/:agentId/economics` ignores the requested Agent filter | Withheld to prevent incorrect cross-Agent aggregation | Contract inventory; integration scope test removed unsafe assertion |
| Bounded Usage records | `GET /economics/usage?agentId&limit` | Usage record list | IMP-02D source test |
| Reservation / quote / settlement correlation | Usage projection correlation fields | Record correlation chips | IMP-02D source test; s63 regression test retained |
| Cross-Agent isolation | Server `agentId` Usage query | No global client filtering | IMP-02D source test; `imp-02d-agent-operational-scope.test.mjs`; localhost validation |
| Runs bound | `GET /agents/:agentId/execution-runs` has no bound | Existing unavailable view retained | Contract inventory and source test |
| Direct routes | Frozen Agent-local route paths | Usage & Cost component; explicit unavailable Runs/Evidence routes | IMP-02D source test and localhost validation |

The focused scope test demonstrates that the direct Agent Run and Evidence routes exclude a foreign Agent but remain intentionally unrendered because the routes are unbounded. It separately demonstrates that the bounded Usage query returns only the requested Agent's Usage records. The source test prohibits `getAgentEconomics`, browser filtering, and browser accounting.
