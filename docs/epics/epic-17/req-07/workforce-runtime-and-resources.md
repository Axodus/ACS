# REQ-07 Workforce, Runtime and Resource Interaction

## Workforce and coordination

Delegation and Workforce are orthogonal:

```text
Delegation = authority to request bounded action
Workforce membership = admitted composition participation
Assignment = coordination decision for a Task/member slot
Execution = existing Runtime machinery
```

A grant cannot add a member, create a slot, change a selector, replace an
admitted Agent revision, assign a Task or alter membership snapshots. If Agent B
must execute in a Workforce Run, B must already satisfy the accepted
WorkforceRevision, membership, authority and admission contracts.

`CoordinationDecisionV2.authority_ref`,
`WorkforceRunMembershipV2.authority_decision_ref` and
`ExecutionContextV2.authority_context` are compatible reference seams. They do
not prove a Delegation contract and must point to accepted decisions/snapshots
before future delegated execution.

## Runtime flow

```text
delegated request
  -> validate grant chain and effective authority
  -> existing admission decision
  -> exact Workforce/member resolution when applicable
  -> Coordination decision / TaskAssignment
  -> ExecutionBinding / ExecutionContext / ExecutionPolicy
  -> Run / Task / Attempt
```

Retries reuse the accepted immutable configuration/authority snapshot when the
existing retry contract permits it. Re-admission, reassignment or a new grant
version requires a new decision and snapshot. Delegation does not create a
worker, lease, fencing token, scheduler or recovery model.

## Resource boundaries inherited from REQ-04 through REQ-06

- capability definition, requirement, support Evidence and authority grant
  remain distinct;
- Skill/Tool/MCP availability or binding grants no delegated authority;
- Connection/Channel/Credential refs remain opaque and operation-bounded;
- no raw secret, credential, token or lease value appears in a grant;
- Memory authority names scope, operation and policy, never raw content;
- Knowledge and Evidence remain their canonical owners;
- lower layers cannot enlarge any upstream constraint.

## Hard incompatibility gate

Any required incompatible change to `WorkforceDefinitionV2`,
`WorkforceRevisionV2`, slots, memberships, admission, `CoordinationDecisionV2`,
`TaskAssignmentV2`, `RunV2`, `TaskV2` or `TaskAttemptV2` becomes:

```text
BLOCKER + ARCHITECTURE ESCALATION
```

REQ-07 authorizes no implicit change to those contracts.
