# REQ-10 Administration and Actions

## Administration responsibility

Administration owns operator workflows, action discovery, settings navigation
and cross-domain status composition. It does not own the state those workflows
change.

```text
Administration request
  -> Product API action descriptor
  -> authenticated command
  -> canonical domain owner
  -> receipt + Event/Evidence
  -> refreshed Product API projection
```

EPIC-15 Tenant Administration remains the owner of Tenant lifecycle,
membership, administrative authority, governance, entitlements, limits and
administrative audit. REQ-10 neither wraps it in a new aggregate nor duplicates
its routes/state.

## Action model

Every surfaced action requires server-supplied metadata:

- stable action name and owning domain;
- subject and scope;
- available, unavailable or unsupported state;
- reason/blockers and required authority/policy/approval;
- concurrency/idempotency requirements;
- confirmation and asynchronous behavior where applicable;
- resulting receipt/Evidence link.

The UI may disable, hide or explain an action according to the Product API
contract. It cannot make an unavailable action available, derive permission
from role labels, infer authority from references or call a compatibility owner
when the canonical command is missing.

## Administrative workflow families

| Workflow | Owner-routed responsibility |
| --- | --- |
| Agent administration | Native Agent lifecycle/revision commands; derived Profile and Persona visibility only |
| Resource/catalog administration | Kind-specific resource owners and explicit history/availability maturity |
| Integration administration | Connector projection, Connection/Channel lifecycle and redacted credential operations |
| Memory administration | Governance-owned policy plus Memory-store retention/deletion/access operations |
| Delegation administration | issue/narrow/revoke/inspect through the accepted authority owner and chain semantics |
| Automation administration | revision/lifecycle/target/trigger/schedule configuration through Automation owner |
| Activation operations | inspect/retry/cancel only according to Activation/admission/Runtime ownership and current state |
| Settings administration | class-owned settings index and owner-specific commands; no generic settings mutation |

This inventory defines future projection needs. It does not authorize any
action, endpoint or UI.
