# API Sufficiency and Gaps

## UI-only gaps

These can be addressed by reorganizing existing responses and links:

- Move Agent-local activity, evidence, economics, revisions, and advanced links into contextual navigation.
- Split the current single form into identity, configuration, and advanced sections while keeping the same commands.
- Replace raw CSV-like credential/runner inputs with catalog-backed controls where the existing list/read methods already support them.
- Improve labels, action hierarchy, destructive confirmation, stale/error recovery, and breadcrumb/context retention.
- Add cross-links from global runs/evidence/economics to Agent context when the response already contains `agentId`.

## API/read-model gaps

The current client and routes expose the necessary primitives, but the target overview would otherwise require the browser to coordinate many requests: Agent detail, revisions, lifecycle, composition, readiness, deployment plan, runtime/deployment summaries, execution runs, audit, evidence, and economics. A future ACS application read model should provide an authoritative, scoped summary with freshness and partial-availability semantics. This is a backend planning item, not a REQ-05 implementation.

The Agent-local activity surface also needs a supported query for runs/events/evidence/economics scoped by Agent with consistent pagination, ordering, and correlation semantics. Some entity-scoped routes exist (`/agents/:agentId/execution-runs`, `/events`, `/audit`, `/evidence`, `/economics`), but the current frontend client does not expose all of them as one Agent activity contract.

## Contract gaps

The following require architecture/product decisions before implementation:

1. **Test/playground:** no ACS-native command, execution admission path, input/output read model, or evidence contract was verified for an interactive pre-operation test.
2. **Instructions/purpose/variables:** `AgentDefinition` currently contains identity and composition references but no instructions, description/purpose, variable schema, or prompt parameters (`src/control-plane/unified-agent-model.ts:21-37`).
3. **Safe activation semantics:** the UI exposes status values and lifecycle actions, but the audit does not establish a complete product-level rule for when an Agent may move from draft to active based on readiness, governance, deployment, or test evidence.
4. **Revision comparison:** history and adopt/restore are exposed, but no explicit comparison read model was identified.

## Future capabilities

Defer evaluations, files/knowledge, conversational configuration, multi-variant experimentation, and provider-specific playground behavior. Those may be valuable, but they are separate product and contract work. Do not import Agenta’s concepts into ACS as frontend-only fields.

## Security and governance boundary

All target flows must continue through authenticated Product API routes, tenant/organization scope, governance enforcement, credential references rather than secret values, idempotency, revision compare-and-swap, evidence provenance, and economic boundaries. The frontend must not derive authority from provider or executor state. The current route handler invokes governance checks before create and mutation paths (`src/http/routes/product-api-routes.ts:560-577`, `688-718`, `743-887`).

