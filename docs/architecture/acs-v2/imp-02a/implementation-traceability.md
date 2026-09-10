# IMP-02A Implementation Traceability

| REQ-05 decision | Implementation | Source location | Validation |
| --- | --- | --- | --- |
| Canonical global navigation | Seven primary domains in frozen order; legacy routes grouped beneath them | `.design/app-standalone/src/App.tsx`: `PrimaryDomain`, `domainDefs`, `SidebarNavigation` | `imp-02a-navigation.test.mjs`; localhost global shell validation |
| Agents is the primary object workflow | Agents owns inventory, creation entry, and Agent-local context | `.design/app-standalone/src/App.tsx`: `domainDefs`, `EntityContextNav` | `agent-create-route-regression.test.mjs`; focused test |
| Global and Agent-scoped views coexist | Global Runs, Evidence, and Usage & Cost retain canonical pages; Agent tabs provide contextual entry points | `.design/app-standalone/src/App.tsx`: `domainByPath`, Agent-local routes, `AgentScopedUnsupportedView` | Focused route and limitation assertions |
| Agent-local navigation | Overview, Configuration, Validate, Runs, Revisions, Evidence, Usage & Cost, Advanced | `.design/app-standalone/src/App.tsx`: `EntityContextNav` | Focused label/order/target test |
| Dashboard is global attention and health routing | Dashboard remains `/` and is mapped to the global Dashboard domain | `.design/app-standalone/src/App.tsx`: `domainDefs`, `domainByPath`, root route | Source inspection; localhost Dashboard validation |
| Validate semantics | Validate reuses composition and readiness data and links to existing composition/readiness surfaces | `.design/app-standalone/src/App.tsx`: `AgentValidateView` | Focused route test; direct-open and refresh validation |
| Agent identity and current object context persist | Agent-local headers, breadcrumbs, and tabs include the route Agent ID | `.design/app-standalone/src/App.tsx`: `AgentLocalHeader`, `EntityContextNav`, route shell | Focused route test; localhost child-route validation |
| Progressive disclosure | Technical/provider/runtime/audit detail is linked from Advanced and existing governed surfaces | `.design/app-standalone/src/App.tsx`: `AgentAdvancedView`, compatibility sidebar children | Source inspection; localhost Advanced validation |
| No fabricated Agent activity aggregation | Scoped Runs, Evidence, and Usage & Cost state the client limitation and link to canonical global pages | `.design/app-standalone/src/App.tsx`: `AgentScopedUnsupportedView` | Focused explicit-unavailable-state test |
| Existing revision ownership is preserved | Revisions read existing revision summaries; adopt/restore remains on overview | `.design/app-standalone/src/App.tsx`: `useAgentSurface`, `AgentRevisionsView` | Typecheck; direct-open and refresh validation |

## Out of scope

This package does not add a test/playground, new Agent fields, a read model,
new API endpoints, persistence, provider integration, runtime redesign,
activation semantics, or production deployment.
