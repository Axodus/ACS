# IMP-02D Query Plan

## Agent Runs

- Route: `/agents/:agentId/runs` and optional `?offset=:offset` URL state.
- Request: `GET /agents/:agentId/execution-runs?limit=50&offset=:offset`.
- Scope: route `agentId` is encoded into the direct Product API path; Product API applies ownership and organization scope.
- Pagination: Previous and Next move in increments of 50; max displayed request offset is 10,000.
- Ordering: Product API `startedAt DESC, runId DESC`; browser does not re-sort.
- Failure: request error is ERROR; valid `[]` at offset 0 is EMPTY; a tail page is a coherent empty page with Previous available.

## Agent Evidence

- Route: `/agents/:agentId/evidence` and optional `?offset=:offset` URL state.
- Request: `GET /agents/:agentId/evidence?limit=50&offset=:offset`.
- Scope: route `agentId` is encoded into the direct Product API path; Product API applies canonical Evidence ownership filtering.
- Pagination: Previous and Next move in increments of 50; max displayed request offset is 10,000.
- Ordering: Product API `createdAt DESC, evidenceId DESC`; browser does not re-sort.
- Failure: request error is ERROR; valid `[]` at offset 0 is EMPTY; a tail page is a coherent empty page with Previous available.

## Agent Usage & Cost

1. `GET /economics/usage?agentId=:agentId&limit=50` returns the bounded record list.
2. `GET /agents/:agentId/economics` independently confirms the scoped operational projection. Its zero-valued totals are withheld because they do not define canonical cost.
3. A failure of the secondary projection leaves valid Usage records visible and marks only the projection section unavailable.

**GLOBAL COLLECTION USED FOR CLIENT AGENT FILTERING: NO.**

No page joins global collections or calculates a financial total in the browser.
