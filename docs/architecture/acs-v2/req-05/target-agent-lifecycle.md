# Target Agent Lifecycle

The lifecycle below preserves current ACS commands and marks missing capabilities explicitly.

| Stage | Operator intent | UI action | ACS command/query | State transition | Resulting view |
| --- | --- | --- | --- | --- | --- |
| Discover | Find an Agent or confirm none exists | Open Agents; search/filter | `GET /agents` | Read current inventory | Agent list with status/readiness summaries |
| Create identity | Start a governed Agent | Create Agent; enter ID/name/status | `POST /agents` | Stable identity plus revision 1 | Agent Overview |
| Configure | Choose useful behavior and execution references | Set role/profile/capabilities/tools/model references | Agent definition catalogs plus current create/update contract | Proposed definition; authoritative validation by Product API | Configuration summary |
| Validate composition | Understand whether references resolve | Open composition/readiness | `GET /agents/:id/composition`, `/composition/capabilities`, `/readiness` | Findings and readiness are read models | Overview or Advanced detail |
| Test | Try the Agent before operating | Future Validate/Test action | **No current ACS test command/read model verified** | **NOT CURRENTLY IMPLEMENTED** | Future test surface; do not show as current |
| Save change | Preserve an authorized configuration | Edit and submit update | `PATCH /agents/:id` with expected revision | Append revision and advance head per REQ-04 | Agent Overview with new revision |
| Operate | Plan/deploy/execute governed work | Open operational action | Execution plan, deployment, runtime, and run queries/commands | Plan/deployment/runtime/run states | Agent Activity or Operations |
| Observe | Explain outcome and provenance | Open run, evidence, audit, economics | Execution run, events, logs, evidence, audit, economics queries | Immutable evidence and correlated operational state | Scoped detail with global escape hatch |
| Improve | Change configuration without mutating history | Create new revision | `POST /agents/:id/revisions` with expected revision | New immutable revision; current head changes only through authorized command | Revisions and Overview |
| Reuse/restore | Reuse an earlier known configuration | Adopt or restore revision | Current frontend exposes adopt/restore operations | New current head/reference according to ACS command semantics | Overview with provenance |
| Retire | Stop normal use | Archive/disable, subject to governance | Archive/restore/delete endpoints exist in current client; native retention semantics are governed by REQ-04 | Lifecycle state changes; historical lineage remains | Agent Overview with explicit consequence |

## Revision rule

Editing always creates a new immutable revision. The UI must show current revision, fingerprint/provenance, expected-head conflicts, who changed it, and what changed. Historical revisions must not be edited in place.

