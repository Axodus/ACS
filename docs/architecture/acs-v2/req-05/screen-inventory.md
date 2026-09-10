# Target Screen Inventory

| Screen | Purpose / primary question | Actions | Data and ACS contracts | Scope | Priority |
| --- | --- | --- | --- | --- | --- |
| Dashboard | What needs attention across ACS? | Open affected object; refresh | Dashboard/readiness/activity summaries | Global | P1 |
| Agent list | Which Agents exist and what is their state? | Search, filter, create, open | Agent list, lifecycle/readiness summaries | Global Agent | P1 |
| Create Agent | What is the smallest valid first Agent? | Enter identity, choose purpose/configuration, continue | Agent create contract plus catalogs | Agent | P1 |
| Configuration | What definition will the next revision contain? | Edit grouped configuration; save revision | AgentDefinition, composition catalogs, expected revision | Agent | P1 |
| Validate / Test | Can I validate behavior before operating? | Future test/inspect action | Missing current ACS test contract | Agent | P2, contract gated |
| Agent Overview | What is this Agent’s current state and what should I do next? | Edit, new revision, operate, inspect attention | Agent detail, revision, composition, readiness, deployment/runtime summaries | Agent | P1 |
| Agent Activity / Runs | What work has this Agent performed? | Open run, filter, inspect outcome | Agent execution-run summaries and run detail | Agent | P1 |
| Agent Revisions | What changed and which revision is current? | View, compare later, adopt/restore if authorized | Revision list and lineage | Agent | P1 |
| Agent Evidence | What proves what happened? | Filter/open evidence and audit | Agent evidence/events/audit | Agent | P1 |
| Agent Usage / Cost | What usage and cost correlate to this Agent? | Inspect summary and records | Agent economics, usage, cost | Agent | P1 |
| Agent Advanced | What technical state explains a blocker? | Inspect composition, plans, runtime, diagnostics | Composition, readiness, deployment, runtime, diagnostics | Agent | P2 |
| Global Runs | What is happening across Agents? | Filter by Agent/status; open run | Execution runs/events/logs | Global | P1 |
| Global Evidence | What evidence requires review? | Filter/open record | Evidence/event/audit read models | Global | P1 |
| Global Usage / Cost | What is the economic state across scope? | Filter and inspect | Economics/usage/cost contracts | Global | P1 |
| Operations | Is execution support healthy? | Inspect runtime/jobs/workers/deployments | Runtime, worker, deployment, diagnostics | Global operations | P2 |
| Administration | Which access, governance, catalog, and environment controls apply? | Manage governed settings | Auth, governance, credentials, catalogs, readiness | Global administration | P2 |

The P1 set is sufficient for the first coherent Agent workflow. Test/playground remains P2 and cannot be implemented from the current contract inventory alone.

