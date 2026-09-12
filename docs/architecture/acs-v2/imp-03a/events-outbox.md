# Events and outbox

IMP-03A emits only the frozen Workforce facts:

- `workforce.created` for the root draft revision;
- `workforce.revision.created` for a composition successor with unchanged
  lifecycle; and
- `workforce.lifecycle.changed` for an allowed lifecycle successor.

Member-level events are not added. Each event carries the Workforce identity,
revision sequence, tenant and scope context, fingerprint, lifecycle status,
authority decision reference, and command idempotency key. The existing native
event stream and retryable outbox are authoritative and are committed in the
same transaction as Workforce state.

Event stream sequencing and unique event identifiers reject conflicting
replays. Outbox delivery remains handled by the existing claim, acknowledge,
and retry primitives.
