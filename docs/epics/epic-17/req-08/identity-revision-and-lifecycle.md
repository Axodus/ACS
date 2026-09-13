# REQ-08 Identity, Revision and Lifecycle

## Why stable identity is required

Triggers and schedules will need a stable subject, lifecycle operations need a
current target, and Activation/Run/Evidence/Cost correlation must survive
configuration changes. A display name or target ref cannot supply this
identity. REQ-08 therefore requires a stable logical `automation_id` within one
Tenant scope.

Stable identity does not prove a separate aggregate. It may be represented by
an accepted governed definition/relation form later.

## Why immutable revisions are required

Automation configuration can change while prior Activations and Runs must
remain reconstructable. Mutating one current configuration blob would make it
impossible to prove which target, inputs, policies and constraints were
authored for a historical execution. Each accepted change therefore creates an
immutable, fingerprinted logical revision linked to its predecessor.

The minimum revision semantics include:

- exact Automation identity and revision/fingerprint;
- purpose and descriptive metadata;
- canonical target selector and target-owned refs;
- authored input/template and governed resource refs;
- configuration requirements and class-specific policy refs;
- required authority basis type and optional exact Delegation grant ref;
- Evidence, audit, Cost and budget policy refs;
- author, timestamp, reason and source provenance.

This list defines information requirements only. It authorizes no contract
shape, entity, table or API.

## Head and lifecycle

Current lifecycle eligibility is separate from immutable authored revision
content. The minimum semantic states are:

| State | Meaning |
| --- | --- |
| `draft` | Configuration may be authored but cannot produce an eligible Activation |
| `enabled` | Automation may be considered for Activation; authority, policy and readiness still require evaluation |
| `disabled` | New Activation is denied while identity, revisions and history remain available |
| `archived` | Removed from ordinary operation; history remains and reactivation semantics are not presumed |

Enable/disable does not create execution, authority or a schedule. Lifecycle
changes require Tenant/Governance authority, expected-head/CAS semantics,
idempotency, provenance, events and outbox participation in any future durable
contract.

Lifecycle history and revision history remain separate:

```text
revision history = what was configured
head/lifecycle history = whether it was eligible at a point in time
Activation snapshot = what was resolved and authorized for one occurrence
```
