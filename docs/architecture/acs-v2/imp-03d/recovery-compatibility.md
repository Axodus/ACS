# Recovery compatibility

Recovery reconstructs the intent and Attempt from durable payloads and validates that their identity agrees. A historical Attempt retains its original assignment, member slot, Agent revision, and Workforce revision after head advancement or reassignment.

If the assignment is no longer current, recovery classifies the view as `superseded_assignment`; it does not rewrite the Attempt or invent reassignment behavior. Binding disagreement is `invalid_binding`.
