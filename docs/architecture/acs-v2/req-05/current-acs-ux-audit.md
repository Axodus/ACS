# Current ACS UX Audit

**Evidence status:** current repository inspection on 2026-09-10.

## Exact route and navigation map

The shell defines these top-level domains in `.design/app-standalone/src/App.tsx:189-198`:

```text
ACS
├── Dashboard                         /
├── Agents                            /agents
│   ├── Inventory                      /agents
│   ├── Create                         /agents/new
│   └── Secret references              /credentials
├── Executions                        /executions
│   └── Plan execution                /operational-execution
├── Workers                           /workers
├── Financial Operations               /economics
│   └── boundary / settlement / audit / acceptance pages under /system/*
├── Customers                         external tenant administration URL
├── Operations                        /operations
│   ├── Runtime                        /runtime
│   ├── Deployments                    /operational-execution
│   ├── Telemetry & logs               /logs
│   ├── Incidents & evidence           /operational-evidence
│   └── Audit                          /audit
└── Administration                    /administration
    ├── Readiness                      /readiness
    ├── Identity & access              /credentials
    ├── Governance                     /system
    ├── Providers                      /engines
    ├── Capabilities                   /composition
    ├── System reliability             /system/operational-reliability
    └── Settings                       /settings
```

Implemented routes include `/agents`, `/agents/new`, `/agents/:agentId`, `/agents/:agentId/edit`, `/agents/:agentId/composition`, `/executions`, `/executions/:jobId`, `/workers`, `/workers/:workerId`, `/runtime`, `/logs`, `/operational-evidence`, `/audit`, `/economics`, readiness, governance, composition catalogs, credentials, settings, and multiple financial-boundary paths (`App.tsx:5363-5410`). Unknown paths redirect to `/`.

## Current Agent workflow

```text
Dashboard or Agents
→ /agents inventory
→ Create agent
→ one definition form
→ POST /agents
→ navigate to /agents/:agentId
→ Overview / Composition / Manage context tabs
→ edit or create revision
→ PATCH /agents/:agentId or POST /agents/:agentId/revisions
```

The inventory provides search, status filtering, sorting, refresh, stale-data messaging, loading/error/empty states, and a first-Agent link (`App.tsx:1135-1187`). Agent detail loads detail, revisions, and lifecycle in parallel, exposes refresh/stale/error states, and provides edit, revision, adopt/restore, duplicate, archive, restore, and delete operations (`App.tsx:1191-1208`, `1441-1535`).

## Creation and configuration fields

The current form is a single progressive-in-name-only surface. It loads role, profile, capability, skill, tool, provider, and model catalogs before submission (`App.tsx:1793-1799`). Client validation requires Agent ID and Name, while the Product API performs authoritative validation (`App.tsx:1857-1870`). Provider and model defaults are selected from available catalog data (`App.tsx:1801-1814`).

| Field | Current location | Required in UI | Current owner/contract | Audit classification |
| --- | --- | ---: | --- | --- |
| Agent ID | Create/Edit form | Yes | `AgentDefinition.agentId`; stable ACS identity | `PRIMARY` at creation, `SYSTEM-MANAGED` after creation |
| Name | Create/Edit form | Yes | `AgentDefinition.name` | `PRIMARY` |
| Status | Create/Edit form | No default `draft` | `GovernedAgentStatus` | `PRIMARY`, but activation semantics need clearer explanation |
| Role | Catalog selector | No | `roleId` reference | `ADVANCED` unless role is required by a future product workflow |
| Profile | Catalog selector | No | `profileId` reference | `ADVANCED` |
| Capabilities | Checkbox catalog | No | `capabilityIds` and composition | `PRIMARY` concept, but should be grouped as purpose/capability rather than raw IDs |
| Skills | Checkbox catalog | No | `skillIds` and composition | `ADVANCED` until the operator meaning is explained |
| Tools | Checkbox catalog | No | `toolIds` and composition | `ADVANCED` with permission and risk explanation |
| Model provider | Catalog selector | No, but auto-selected when possible | `modelStrategy.primary.providerId` | `ADVANCED`; provider-neutral presentation required |
| Model | Catalog selector | No, but auto-selected when possible | `modelStrategy.primary.modelId` | `ADVANCED` |
| Model credential reference | Text input | No | `credentialConnectionId` reference | `SYSTEM-MANAGED` or advanced; should not look like a secret entry |
| Credential connections | Text/CSV input | No | `credentialConnectionIds` | `ADVANCED`; catalog-backed selection should replace raw CSV |
| Runner preferences | Text/CSV input | No | `runnerPreferences` | `DIAGNOSTIC`/`ADVANCED` |
| Instructions, purpose, variables, test input | Absent | N/A | No current UI/contract evidence | `MISSING` |

The backend model confirms the current definition shape is identity, status, role/profile references, capability/skill/tool references, model strategy, credential references, runner preferences, execution policy, and metadata (`src/control-plane/unified-agent-model.ts:21-37`). It does not include a current instructions, description, variable schema, or playground input contract.

## Information hierarchy and duplication findings

- The same operational concepts appear at multiple levels: `Operational Execution` is both a top-level route and a compatibility child under Executions and Operations; credentials are exposed under Agents and Administration.
- The shell promotes financial boundary and settlement pages to a peer of Agents even though the REQ-05 primary question is the Agent operating workflow.
- Agent-local context is only three tabs: Overview, Composition, and Manage (`App.tsx:595-604`). Runs, evidence, economics, and audit are global routes with no corresponding Agent-local route in the current shell.
- `AgentDetail` contains readiness, deployment, runtime, operations, economics, related activity, audit, and revision information in one long surface. This is useful evidence, but it creates a dense overview and makes object context compete with diagnostics.
- Catalogs expose implementation vocabulary such as role IDs, profile IDs, capability IDs, provider IDs, and runner preferences. The current form does not establish which decisions are required for a safe first Agent.
- The UI explicitly preserves missing data boundaries: `economicSummary` can be unavailable, composition can be unavailable, and agent-specific filtering is not invented without Product API support. That restraint should remain.

## State handling

The frontend has a strong baseline of loading, refreshing, stale, error, empty, no-filter-match, retry, and operation-result states (`App.tsx:1163-1187`, `1441-1481`). The main structural gap is not absence of states; it is that state meaning is distributed across a dense page and global routes. Future screens should retain the same explicit states and associate errors with the action or object that caused them.

## Reusable components

`DomainHeader`, `ContextTabs`, `Panel`, `Status`, `Link`, `useOperationalSummary`, `staleBanner`, `OperationResultBox`, catalog selectors, and the existing Product API request/error boundary are reusable. `AgentDetail` as one composite page should be adapted into sections or contextual views; the global domain list and compatibility labels should be adapted rather than copied into the target hierarchy.

## Responsive and accessibility observations

The shell has mobile open/close controls and an overlay (`App.tsx:5345-5353`), but the single-column form contains many selectors and raw CSV-like inputs, creating density and overflow risk at narrow widths. Existing labels and fieldsets are a useful baseline. Subsequent implementation must preserve semantic navigation, visible labels, fieldset legends, keyboard order, focus after route changes, inline error association, and action semantics for destructive operations. This is an architectural baseline, not WCAG certification.

