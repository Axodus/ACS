# REQ-07 Evidence and Owner Boundary

## Implemented evidence

| Evidence | Current owner/meaning | REQ-07 consequence |
| --- | --- | --- |
| `AgentDefinitionV2` and `AgentRevisionV2` in `src/native-core/agent.ts` | Stable canonical Agent identity plus exact behavioral/governance revision refs | Both endpoints are canonical `agent_id`; exact revisions/policies participate in grant evaluation and admission |
| `authority_refs`, `permission_policy_ref` and `approval_policy_ref` in `AgentRevisionV2` | Agent declares authority and policy references but does not own policy truth | Delegation evaluates these refs; possession of a ref is not a grant |
| `Scope.authority_scope_ref` and Tenant fields in `src/native-core/primitives.ts` | Execution/domain scope already carries authority and isolation references | A grant cannot widen Tenant, organization, product-domain or authority scope |
| `evaluateTenantGovernanceAuthority` in `src/control-plane/tenant-governance.ts` | Governance evaluates principal, Tenant membership and mutation authority and rejects cross-Tenant mutation | Governance remains authority owner; cross-Tenant delegation fails closed absent an explicit accepted authority contract |
| `DecisionReferenceV2`, `ApprovalRecordV2` and `EvidenceRecordV2` in `src/native-core/evidence.ts` | Accepted decision, approval, revocation/expiry and append-only Evidence primitives | Adapt these primitives for grant decisions and history; none alone is a complete grant contract |
| `WorkforceRevisionV2` and `WorkforceRunMembershipV2` in `src/native-core/workforce.ts` and `workforce-run-membership.ts` | Workforce owns slots/constraints; admission freezes exact member Agent revisions and authority decisions | Delegation cannot rewrite membership or substitute Agent identity/revision after admission |
| `CoordinationDecisionV2` and `TaskAssignmentV2` in `src/native-core/coordination.ts` | Existing coordination selects a member slot and records authority/provenance | Delegation may authorize a request but never becomes Assignment or coordination truth |
| `ExecutionBindingV2`, `ExecutionContextV2`, `ExecutionPolicyV2`, `RunV2`, `TaskV2` and `TaskAttemptV2` in `src/native-core/runtime.ts` | Existing admission and runtime contracts own execution | Delegated execution enters through these contracts and carries an exact authority context/snapshot reference |
| `canSpawnSubAgents` and `subAgentScope` in `src/types.ts` and `src/openclaw.ts` | Legacy descriptive runtime/profile metadata with no canonical grant, lineage or policy evaluation | Compatibility-only input; cannot authorize delegation or define a second identity |
| No canonical Delegation contract under `src/native-core/` or `src/control-plane/` | No durable grant, attenuation resolver or chain history exists | `NEW` is a demonstrated contract gap and authorizes planning only |

## Owner map

| Concern | Canonical owner |
| --- | --- |
| Agent identity and revisions | Agent Core from REQ-01 |
| Authority and policy decisions | Governance |
| Delegation grant semantics and chain record | New Delegation boundary subordinate to Governance |
| Capabilities/resources | Governed owners from REQ-04 |
| Connection/Channel/Credential access | REQ-05 owners and policy boundary |
| Memory access | Governance policy plus Memory companion domain from REQ-06 |
| Workforce membership/admission | Workforce Core |
| Assignment and execution | Coordination and Runtime |
| Historical proof | Events, Decision, Approval and Evidence |

The Delegation boundary records an authorization relationship. It owns neither
the delegated resources nor the underlying authority, Agent, Workforce, data or
execution.
