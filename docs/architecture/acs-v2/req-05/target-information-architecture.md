# Target Information Architecture

## Target operator mental model

The primary mental model is:

```text
Agent
→ Configure
→ Validate / Test
→ Operate
→ Observe
→ Improve
```

The internal graph remains available through contextual detail, but operators should not need to understand `Agent → Revision → Composition → Plan → Deployment → Runtime → Run → Event/Evidence/Usage` before they can create or inspect an Agent.

## Navigation tree

```text
ACS
├── Dashboard
│   ├── Attention and readiness
│   ├── Recent activity
│   └── Cross-Agent operational summary
├── Agents
│   ├── All Agents
│   ├── Create Agent
│   └── Agent
│       ├── Overview
│       ├── Configuration
│       ├── Validate / Test       [future capability if no ACS test contract]
│       ├── Activity / Runs
│       ├── Revisions
│       ├── Evidence
│       ├── Usage / Cost
│       └── Advanced
│           ├── Composition detail
│           ├── Readiness detail
│           ├── Deployment / Runtime
│           ├── Audit
│           └── Diagnostics
├── Runs / Activity              global cross-Agent view
├── Evidence                     global cross-Agent view
├── Usage / Cost                 global cross-Agent view
├── Workers and Runtime          operational support view
└── Administration
    ├── Organization / access
    ├── Governance
    ├── Providers and catalogs
    ├── Readiness
    └── Settings / system
```

## Placement rules

- `Agents` is the primary object workflow and owns creation, configuration, revisions, lifecycle, and Agent-local links.
- Dashboard answers “what needs attention across the environment?” It should link to the responsible Agent, run, evidence, or governance record.
- Runs, Evidence, and Usage/Cost remain global for cross-Agent work and filtering. Each must also be reachable from the relevant Agent context.
- Workers, Runtime, Deployments, and Diagnostics describe execution support and belong under Operations or Agent Advanced. They should not define Agent identity.
- Governance, credentials, provider catalogs, and settings remain Administration concerns, with contextual entry points from Agent configuration.

## Progressive disclosure

**Primary:** Agent name/ID, purpose when a contract exists, lifecycle status, current revision, composition/readiness summary, primary configuration, safe validate/use action, and recent activity.

**Secondary:** revisions, deployment/readiness detail, runs, evidence, usage/cost, permissions, and audit summary.

**Advanced/diagnostic:** raw composition findings, provider/model IDs, credential references, runner preferences, execution plans, runtime jobs, event envelopes, checkpoints, fencing, reconciliation, and financial boundary pages.

The boundary is contextual: advanced information stays accessible, but it should appear after the operator knows which Agent, revision, run, or evidence record it describes.

