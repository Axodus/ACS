# IMP-02C Overview Information Architecture

| Overview element | Source | Tier | Actionable | Implemented |
| --- | --- | --- | --- | --- |
| Agent name and ID | Agent detail | Primary | Configuration | Yes |
| Lifecycle status / archive / protection | Lifecycle state | Primary | Existing lifecycle commands | Yes |
| Current revision | Current AgentRevision | Primary | Revisions and Configuration | Yes |
| Readiness and blocker counts | Readiness summary | Primary | Validate | Yes |
| Next safe action | Lifecycle plus readiness | Primary | Restore, Validate, or Configuration | Yes |
| Deployment/runtime counts | Detail summaries | Secondary | Context only | Yes |
| Recent lineage | Revision history | Secondary | Existing adoption/restoration | Yes |
| Lifecycle management | Available actions | Secondary | Existing Product API commands | Yes |
| Provider/model/credentials/runner preferences | Agent definition | Advanced | Read-only technical context | Yes |
| Composition fingerprints/materialization | Composition/current revision | Advanced | Link to existing detail | Yes |
| Runs, Evidence, Usage and Cost | No Agent-scoped API | Explicitly unavailable | Global canonical routes only | Unchanged |

The Overview uses three existing Product API requests in parallel: Agent detail, revision history, and lifecycle state. It performs no browser join across global Runs, Evidence, economics, deployment inventory, runtime inventory, or audit feeds. Detail already contains readiness and concise deployment/runtime summaries, so Overview does not create a new read model or synthetic status.
