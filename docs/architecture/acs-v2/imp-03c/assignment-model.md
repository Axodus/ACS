# Assignment model

`TaskAssignmentV2` targets `member_slot_id` and copies only stable snapshot references: `workforce_revision_ref`, `resolved_agent_revision_ref`, and `agent_id`. It does not resolve Agent or Workforce heads during assignment.

The native repository derives the assignment from the admitted `WorkforceRunMembershipV2` snapshot for the same Run. Reads expose the current assignment by highest generation and the complete ordered history. Task lifecycle ownership remains with the existing Run/Task model.

Assignment is a coordination record. It does not create an Attempt, acquire a runtime lease, invoke an executor, or perform accounting.
