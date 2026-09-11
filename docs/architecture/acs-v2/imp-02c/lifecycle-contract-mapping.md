# IMP-02C Lifecycle Contract Mapping

## Source inventory

| Concern | Existing source/API | Contract status | Used in IMP-02C |
| --- | --- | --- | --- |
| Agent identity | GET /agents/:agentId | Canonical Agent detail | Yes |
| Lifecycle state | GET /agents/:agentId/lifecycle and AgentDetail.lifecycleState | Canonical | Yes |
| Current revision | AgentDetail.currentRevision | Canonical immutable head | Yes |
| Revision history | GET /agents/:agentId/revisions | Canonical lineage | Yes |
| Readiness | AgentDetail.readinessSummary | Product API projection | Yes |
| Composition | AgentDetail.composition and existing composition route | Canonical composition detail | Link and Advanced context |
| Runtime relation | AgentDetail.runtimeSummary | Related Product API projection | Concise Overview context |
| Deployment relation | AgentDetail.deploymentSummary | Related Product API projection | Concise Overview context |
| Existing lifecycle actions | AgentDetail.availableActions and existing mutation endpoints | Canonical mutations | Yes |
| Audit/history | AgentDetail.auditSummary | Existing secondary projection | Not promoted into synthetic timeline |

## Lifecycle matrix

| State / action | Exists? | Contract/API | Mutable? | User action | Classification |
| --- | --- | --- | --- | --- | --- |
| draft, active, disabled, archived | Yes | AgentDefinition.status and lifecycle state | Status is revisioned | Presented | CANONICAL |
| Current revision | Yes | Agent revision repository and detail API | New revisions only | Edit current Configuration | CANONICAL |
| Historical revision | Yes | revisions API | Immutable | Read-only presentation | READ-ONLY |
| Create revision | Yes | POST /agents/:id/revisions | Appends immutable head | Existing edit route | MUTATION SUPPORTED |
| Adopt revision | Yes | revision adopt endpoint | Appends new current revision | Overview historical context | MUTATION SUPPORTED |
| Restore revision | Yes | revision restore endpoint | Appends new current revision | Overview historical context | MUTATION SUPPORTED |
| Duplicate Agent | Yes | duplicate endpoint | Creates another Agent identity | Overview | MUTATION SUPPORTED |
| Archive Agent | Yes | archive endpoint | Appends archived revision | Overview, confirmation required | MUTATION SUPPORTED |
| Restore Agent | Yes | restore endpoint | Appends restored revision | Overview | MUTATION SUPPORTED |
| Delete Agent | Yes | delete endpoint | Removes archived, unprotected Agent without dependencies | Overview, confirmation required | MUTATION SUPPORTED |
| Deploy / undeploy | Existing operations are outside this view | No lifecycle command used here | N/A | Not added | DEFERRED |
| Publish / activate / retire semantics | No independent command verified | N/A | N/A | Not added | CONTRACT GAP |

Archive prevents edits and new revisions. Delete remains backend-guarded: the Agent must be archived, unprotected, and free of dependencies. No client-side authorization or governance decision was introduced.
