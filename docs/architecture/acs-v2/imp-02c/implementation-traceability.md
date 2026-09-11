# IMP-02C Implementation Traceability

| Requirement | Frontend implementation | Existing ACS contract/API | Focused evidence |
| --- | --- | --- | --- |
| Overview identity and lifecycle | AgentDetail current-state card | Agent detail and lifecycle state | IMP-02C source test |
| Current revision | Overview current-revision card | currentRevision | IMP-02C source test |
| Readiness | Overview readiness card and Validate link | readinessSummary | IMP-02C source test |
| Safe next action | State-derived Restore, Validate, or Configuration action | lifecycle / readiness / existing routes | IMP-02C source test |
| Technical details secondary | Advanced technical cards and Overview Advanced link | Agent definition and composition | IMP-02C source test |
| Current versus historical lineage | AgentRevisionsView ordering and labels | revisions API | IMP-02C source test |
| Historical immutability | No historical edit path; read-only label | immutable AgentRevision | IMP-02C source test |
| Existing lifecycle commands | Existing archive, restore, delete, duplicate, adopt, restore-revision calls | Product API mutation endpoints | IMP-02C source test |
| Route compatibility | Existing Agent-local routes retained | Router definitions | IMP-02C source test |
| Responsive layout | Overview CSS grid and narrow breakpoint | Existing CSS system | IMP-02C source test |
| Browser/reload acceptance | Pending final local execution | Existing Product API and standalone frontend | localhost-validation.md |

No production source outside the standalone frontend is changed by this IMP.
