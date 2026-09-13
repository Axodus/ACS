# REQ-09 Idempotency, Retry and Concurrency

## Logical occurrence key

The canonical deduplication scope must include Tenant, stable Automation
identity, stable trigger/schedule source key and a source-specific logical
occurrence key:

- event: trusted issuer/namespace plus immutable source event ID;
- Channel: accepted delivery/source identity plus logical message/event ID;
- schedule: exact schedule digest plus intended due instant and time basis;
- manual: authenticated requester scope plus supplied idempotency key.

The first durable claim binds the exact Automation revision and normalized cause
digest. A later head change cannot change the occurrence key or cause replay to
select a newer revision. Reusing the same key while requesting a different
Automation revision, source identity, intended instant or payload digest is an
idempotency conflict and fails closed. Intentional reprocessing requires an
explicit new occurrence identity and provenance.

## Guarantees

For one logical occurrence, concurrent delivery and replay must yield:

```text
one canonical Activation identity/history
at most one accepted admission lineage
at most one resulting Run correlation
```

This is a canonical-state guarantee. It does not claim exactly-once physical
execution or external side effects. Existing runtime documentation already
recognizes an at-least-once physical crash window; workload-specific external
effects retain their own idempotency requirement.

Source acknowledgement occurs only after the occurrence claim/observation is
durable enough for recovery. An uncertain acknowledgement or transport result
causes lookup/replay with the same key, never generation of a new key.

## Retry separation

| Retry class | Identity reused | Owner | Prohibited behavior |
| --- | --- | --- | --- |
| Source-delivery retry | logical occurrence/Activation | ingress adapter plus Activation | creating a new Activation for the same logical event |
| Activation evaluation retry | same Activation and cause digest | Activation | refreshing Automation revision or silently changing authority basis |
| Admission handoff retry | same Activation and downstream idempotency/correlation key | Activation plus existing admission | admitting a second Run after an uncertain response |
| Execution retry | admitted Run/Task/Attempt policy and snapshot | Runtime | creating another Activation or re-resolving configuration silently |
| Re-admission | explicit new decision and linked snapshot | existing admission | masquerading material change as a retry |

## Concurrency and transaction boundary

A future implementation must claim one occurrence before evaluation and use
shared PostgreSQL idempotency/Event/outbox authority. The Activation-to-admission
handoff must be atomic when owners share a transaction, or recoverably
consistent through durable outbox plus idempotent admission when they do not.
There must be no state where a Run is accepted but its Activation causation is
irretrievably unknown.

Runtime leases and fencing protect execution assignments. They do not protect
schedule scanning or Activation ownership. Activation evaluators need bounded
claim/lease/fencing semantics appropriate to occurrence processing, derived
from shared patterns without changing Runtime contracts.
