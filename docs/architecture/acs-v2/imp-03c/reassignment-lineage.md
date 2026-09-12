# Reassignment lineage

Reassignment appends a new assignment. The new record increments `generation`, records `supersedes_assignment_id`, and points to the new canonical decision. The prior assignment remains immutable and readable.

`prior_assignment_id` and `expected_assignment_id` provide explicit stale-state checks. Historical reads therefore retain the original member, exact Agent revision, decision, provenance, and replacement chain.
