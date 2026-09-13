# REQ-07 Chain, Lifecycle and Reconstruction

## Chain rules

Each hop references its parent and records the authority intersection produced
at that hop. The chain starts at depth `1` for a direct `Agent A -> Agent B`
grant.

- onward delegation is denied unless the parent grant explicitly permits it;
- every child has strictly narrower or equal scope, actions, purpose, expiry
  and resource bounds;
- a policy-defined maximum depth is mandatory; absence means no onward
  delegation;
- a repeated canonical `agent_id` anywhere in the active path is a cycle and is
  rejected;
- self-delegation is rejected because it adds no authority and obscures the
  authority basis;
- fan-out creates independent child paths; authority or Evidence cannot be
  merged across siblings;
- one invalid hop invalidates the path for new admission or retry.

## Lifecycle

The required semantic states are issued, active/usable, expired, revoked and
superseded. Exact vocabulary and physical representation remain contract
decisions.

- issuance verifies delegator authority, policies, Tenant and parent chain;
- activation/use requires the complete chain to be valid at admission;
- expiry is immutable and a child cannot outlive its parent;
- revocation is append-only Evidence and never erases prior valid history;
- supersession creates a new version/reference and never mutates a snapshot;
- narrowing or extending a grant requires a new governed decision; extensions
  are evaluated as new authority requests.

Revocation or expiry blocks new admission and retries that require a new
authority decision. An already admitted Run retains its immutable historical
snapshot, while enforcement against active work must use the existing
cancellation/reconciliation boundary according to the captured policy. No
silent snapshot mutation or automatic authority refresh is allowed.

## Reconstruction

The REQ-03 snapshot for delegated work must capture:

- exact grant and parent-chain refs/digests;
- canonical delegator/delegate identities and evaluated Agent revisions;
- depth, actions, resources, purpose, scope and validity interval;
- every authority/policy/approval decision and attenuation result;
- effective-authority fingerprint and selected authority basis;
- admission, Assignment, Run/Task/Attempt and Evidence correlations;
- opaque credential and bounded Memory access refs, never values/content;
- resolver/rule version and any lifecycle observation used at admission.

Historical reconstruction validates each hop and recomputes the recorded
intersection from immutable sources. It never consults current Agent heads,
grant state, policies, Connections or Memory and represents them as historical
truth. Later expiry/revocation remains visible without retroactively falsifying
a Run validly admitted under the earlier snapshot.
