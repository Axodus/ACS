# REQ-07 Grant and Attenuation Semantics

## Logical grant

A valid logical grant must identify, without prescribing persistence topology:

- stable grant reference and immutable version/digest;
- Tenant, organization and product-domain scope;
- canonical delegator and delegate `agent_id` values;
- exact delegator revision and authority/policy source refs evaluated at issue;
- delegate revision eligibility constraint and the exact revision resolved at
  admission;
- allowed actions, resources and purpose;
- explicit credential Connection refs/purposes and Memory scopes/operations,
  when applicable;
- validity interval, issue/revocation state and onward-delegation constraint;
- parent grant/chain refs, depth and provenance;
- issuer/actor, reason, policy decision, approval and Evidence refs.

These fields describe minimum semantics. They do not authorize a
`DelegationGrant` entity, aggregate, table, service or endpoint.

## Attenuation rule

For an operation using one delegation path:

```text
effective delegated authority
  = delegator effective authority at evaluation
  ∩ grant actions/resources/purpose
  ∩ Tenant + security + governance policy
  ∩ Agent/Workforce/operation constraints
  ∩ validity, depth and chain state
```

Every dimension is attenuation-only. A missing required source, unknown action,
stale reference, broken chain, revoked/expired hop or empty intersection rejects
the operation.

Grant authority attaches to stable canonical Agent identities. Agent revisions
do not create new identities. Issuance and every new admission nevertheless
evaluate exact Agent revisions and lifecycle/policy sources; a delegator that
has lost authority cannot continue lending it, and the admitted delegate
revision is frozen in the execution snapshot.

Agent B cannot union the delegated grant with unrelated Connections, Channels,
Memory refs, Skills, Tools, capabilities or grants it already possesses. An
operation selects and records one explicit authority basis. Agent B may request
a separate operation under its own independent authority, but cannot use that
authority to enlarge the delegated path.

## Integration and Memory

```text
delegated credential use
  = allowed action + opaque Connection/credential ref + purpose
  -> runtime resolves a scoped lease
  != secret or lease-value transfer

delegated Memory use
  = bounded Memory scope + operations + exact policy decision
  != Memory content transfer
```

Channel, Connection, Credential, Memory, Skill, Tool, Workforce membership and
capability references remain non-authoritative. The grant plus Governance
decision permits only the named operation, and existing owners still enforce
their own policy and lifecycle.

## Tenant boundary

Delegator and delegate must resolve inside the grant's accepted Tenant and
scope. The implemented governance boundary rejects cross-Tenant mutation and
no cross-Tenant Agent delegation contract exists. Therefore cross-Tenant
delegation fails closed in this REQ. Any future need requires a separate
architecture decision; it cannot be inferred from sharing or references.
