# EPIC-15 — Milestone C02: Governance Enforcement Boundaries

## Discovery summary

The repository already had canonical tenant governance evaluators from C01 and tenant-aware control-plane boundaries for agents and deployments. The gap was not decision production; it was a shared enforcement adapter that could consume those decisions before side effects at selected operational boundaries.

## Implemented enforcement boundaries

| Operation | Boundary/module | Tenant context | Actor context | Governed action | Entitlement | Limit | Selected |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create agent | src/http/routes/product-api-routes.ts | yes | yes | agent.create | optional | max_agents | yes |
| Configure agent | src/http/routes/product-api-routes.ts | yes | yes | agent.configure | no | no | yes |
| Create deployment | src/http/routes/product-api-routes.ts | yes | yes | deployment.create | no | no | yes |
| Execution start | dispatch/runtime boundary | partial | partial | execution.start | deferred | deferred | no |
| Tool/plugin install | tool/plugin boundaries | partial | partial | tool.install / plugin.install | deferred | deferred | no |

## Enforcement architecture

The implementation adds a single TenantGovernanceEnforcer helper that:

- resolves the tenant;
- resolves the caller authority;
- evaluates the tenant governance decision;
- optionally evaluates entitlement and limit decisions;
- returns a rich enforcement decision;
- fails closed on missing or invalid prerequisites.

The routes consume that helper before invoking side effects. Denials are mapped to semantic HTTP-style failures, but the underlying contract remains domain-centric.

## Selected mapping

- POST /api/v1/agents -> agent.create
- PATCH /api/v1/agents/:agentId -> agent.configure
- POST /api/v1/agents/:agentId/revisions -> agent.configure
- POST /api/v1/agents/:agentId/revisions/:revisionId/adopt -> agent.configure
- POST /api/v1/agents/:agentId/revisions/:revisionId/restore -> agent.configure
- POST /api/v1/agents/:agentId/archive -> agent.configure
- POST /api/v1/agents/:agentId/restore -> agent.configure
- DELETE /api/v1/agents/:agentId -> agent.configure
- POST /api/v1/agents/:agentId/deploy -> deployment.create
- POST /api/v1/agents/:agentId/duplicate -> agent.create

## Entitlement and limit use

Only the agent-creation path consumes a limit in C02, using max_agents with a deterministic current count. No fake usage subsystem was introduced. No entitlement was required for the selected boundaries because the repository did not yet define a concrete capability that justified a mandatory entitlement gate for those routes.

## Ordering

1. tenant and lifecycle validation;
2. administrative authority;
3. governance decision;
4. entitlement decision when applicable;
5. limit decision when applicable;
6. side effect.

## Backward compatibility

C01 defaults governance to deny. To keep the control plane usable, the control-plane context seeds the local development tenant with an explicit allow policy for core agent/deployment creation flows. Other tenants must be governed explicitly.

## Auditability

Denials and allows preserve the underlying decision receipt in route failure details or success metadata, keeping:

- tenant id;
- operation;
- governed action;
- denied layer when applicable;
- basis or matched decision;
- evaluated timestamp.

## Deferred scope

- execution enforcement;
- tool/plugin enforcement;
- broad runtime redesign;
- queue/worker changes;
- metering and usage storage;
- generic middleware;
- generic policy engine.

## Tests

- governance denial blocks agent creation before side effects;
- governance denial blocks deployment creation before dispatch;
- limit exhaustion blocks agent creation deterministically;
- decisions do not leak across tenants;
- allowed paths still complete normally.

## Acceptance result

Milestone C02 is complete for the selected boundaries. It proves the operational pattern without turning EPIC-15 into a generic policy engine or runtime redesign.
