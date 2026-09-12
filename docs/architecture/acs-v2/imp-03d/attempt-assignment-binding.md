# Attempt assignment binding

`TaskAttemptV2` carries the execution intent, assignment ID, assignment generation, member slot, Agent ID, Agent revision, and Workforce revision when created through the Workforce path.

The PostgreSQL binding table enforces one Attempt per intent and preserves the exact generation. Legacy Attempts remain valid because the new fields are optional in the existing runtime contract.
