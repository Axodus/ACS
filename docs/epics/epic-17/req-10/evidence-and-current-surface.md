# REQ-10 Evidence and Current Surface

## Repository evidence

| Evidence | Current coverage | Consequence |
| --- | --- | --- |
| `src/http/routes/product-api-routes.ts` | `/api/v1` exposes Agent, composition catalogs, models/providers, credentials/connections, targets, deployments, runtimes, runs, workers, Events, Evidence, diagnostics and Economics. | Existing Product API is the extension point; a second API is unnecessary and rejected. |
| `src/http/routes/admin-tenant-routes.ts` | Authenticated Tenant administration exposes lifecycle, membership, governance, entitlements, limits and audit with explicit platform/Tenant authority. | EPIC-15 Tenant Administration remains canonical and must be reused. |
| `src/http/responses.ts` | Envelopes carry version, correlation, timestamp, warnings, blocked reason and structured errors. | Future projections preserve envelope/error/correlation behavior. |
| `src/control-plane/product-api-client.ts` | Native Agent reads coexist with legacy `AgentService` mutations; Native projections lose canonical fields/references. | REQ-01 seam blockers remain mandatory inputs; UI cannot round-trip lossy DTOs. |
| `src/control-plane/product-api-client.ts` | Profile/resource summaries include synthetic or legacy fields and mostly unversioned IDs; action availability is already represented. | Future projections need source/version/fidelity metadata and explicit compatibility status. |
| `SystemConfigurationView` and `GET /api/v1/system/configuration` | Read-only operational view reports mode, disabled automation and backend/readiness signals. | This is not Global Settings ownership or a mutable settings contract. |
| `.design/app-standalone/src/api/product-api.ts` | Browser client consumes Product API and supports current domains. | Preserve the Product API-only application boundary. |
| `.design/app-standalone/src/App.tsx` | Agent, Workforce, composition, runtime, Evidence, Economics and Administration routes exist; Memory is a generic placeholder; Delegation, Automation and Activation surfaces are absent. | New UI work remains projection-driven and dependency-gated. |
| `.design/app-standalone/src/domains/administration/Administration.tsx` | Governance/System views read guardrails, readiness, configuration, policies, Tenant visibility and administration boundary from Product API. | Existing read-only projection pattern is reusable. |
| `docs/epics/epic-14` versus `.design/app-standalone/src/shared.tsx` | Accepted IA places Administration under System; current navigation exposes Administration as a primary domain. | A future UI IMP must reconcile the divergence explicitly; REQ-10 does not select a redesign. |
| REQ-03 authority matrix | Configuration ownership and override semantics differ by class. | Global Settings cannot impose a universal hierarchy. |
| REQ-05 through REQ-09 blockers | Connector/Channel, Memory, Delegation, Automation, Activation and effective snapshot contracts are logical only. | Product projections may be planned, but implementation waits for accepted domain contracts and IMP gates. |

## Coverage finding

Current Product API and Control Plane prove an application/projection boundary,
Tenant administration and several operational surfaces. They do not prove
canonical EPIC-17 projections for Profile, governed resource history,
Connector/Channel, Memory, Delegation, Automation, Activation or effective
configuration. Missing coverage remains explicit rather than synthesized by
the frontend.
