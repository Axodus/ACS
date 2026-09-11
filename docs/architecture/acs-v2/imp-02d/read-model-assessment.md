# IMP-02D Read-Model Assessment

## READ MODEL REQUIRED: NO

Usage & Cost can be implemented correctly with a small, deterministic set of existing Agent-scoped queries. Agent ownership is established by the route `agentId`, passed to the Product API, and enforced by its server-side query filtering. Returned records carry canonical correlation identifiers.

Runs and Evidence cannot be rendered as complete Agent operational histories because their direct Agent-scoped endpoints are unbounded and do not expose pagination or a limit. The generic Evidence route additionally accepts but does not apply its `agentId` filter. This is not a cross-domain aggregation problem. The minimal future contract consideration is pagination or an explicit bounded retrieval parameter on the existing direct Agent endpoints, plus a compatibility repair for the generic Evidence filter; no read model is proposed by this IMP.

The current implementation makes one Usage & Cost request. It contains no client joins across global collections and no authorization decision in the browser.
