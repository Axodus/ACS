# Events and provenance

Commands accept the repository's existing `EventEnvelopeV2` and validate Run, Task, and idempotency alignment before persistence. Proposal and decision payloads retain source, authority, reason, correlation, and stable record identifiers. Assignment provenance includes decision source, authority, reason, and selected proposal where present.

Events are appended and placed in the existing outbox within the same transaction. Payloads reference stable Run, Task, proposal, decision, assignment, and member-slot identifiers rather than embedding mutable Agent or Workforce documents.
