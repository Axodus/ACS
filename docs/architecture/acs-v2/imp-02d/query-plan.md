# IMP-02D Query Plan

## Agent Runs

- Route: `/agents/:agentId/runs`
- Existing request: `GET /agents/:agentId/execution-runs`
- Agent scoping: server-side `agentId`
- Pagination: none
- Decision: retain explicit unavailable state. The UI does not make an unbounded operational-history request.

## Agent Evidence

- Existing direct route: `GET /agents/:agentId/evidence`; correctly Agent-scoped but unbounded.
- Generic route: `GET /evidence?agentId=:agentId&limit=50`; currently unsafe because the accepted `agentId` parameter is not copied by `buildEvidenceQuery`.
- Decision: retain explicit unavailable state. No global Evidence collection or unsafe generic query is used by the UI.

## Agent Usage & Cost

1. `GET /economics/usage?agentId=:agentId&limit=50` for a bounded record list.
2. The UI displays canonical IDs already carried in usage records (`executionRunId`, `reservationId`, `quoteId`, `settlementId`). It computes no totals and makes no ordering claim.
3. `GET /agents/:agentId/economics` is intentionally not requested: the underlying summary ignores its requested Agent filter.

**GLOBAL COLLECTION USED FOR CLIENT AGENT FILTERING: NO.**

The one request has explicit loading, empty, and error states. The UI does not use a global collection or a client join.
