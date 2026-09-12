# Coordination Decision contract

`CoordinationDecisionV2` is the canonical coordination outcome. It records decision identity, Run, Task, status, optional selected proposal, optional selected slot, reason, authority reference, source, prior/expected assignment references, timestamp, correlation, and idempotency context.

Accepted decisions require a valid admitted member slot. A referenced proposal must already be durably recorded and must belong to the same Run and Task. Proposal-free decisions remain structurally possible for frozen ACS-native semantics; no fake proposal is created by this implementation.

Decision and resulting assignment are written in one repository transaction. Rejected and approval-required decisions persist the decision without creating an assignment.
