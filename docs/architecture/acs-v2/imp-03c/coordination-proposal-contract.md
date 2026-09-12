# Coordination Proposal contract

`CoordinationProposalV2` is advisory. It records `proposal_id`, Run, Task, proposal kind, target member slot, source, optional source reference, reason, metadata, timestamp, correlation, and idempotency context.

`recordCoordinationProposal` validates the supplied `TaskV2`, requires Run/Task ownership alignment, requires the Run to exist, and requires the target slot to be present in the admitted membership snapshot. It persists the proposal and its event/outbox transaction. It never changes canonical assignment.

Supported sources are ACS, human, adapter, policy, and other. Source identifies provenance and does not grant canonical authority.
