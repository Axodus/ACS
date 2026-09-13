# REQ-10 Global Settings Ownership

## Decision

`Global Settings` is an Administration/Product API index over independently
owned configuration classes. “Global” describes discovery/navigation or a
platform/Tenant scope; it does not create a universal owner or precedence
layer.

Each settings item must identify:

```text
configuration class
canonical owner
scope and subject
exact source revision/digest
effective applicability
override/attenuation rule
available owner actions
historical reconstruction source
```

Mutation routes to the class owner. A required class with no accepted owner or
contract is unavailable and fails closed. It is never persisted in a generic
settings bag as a workaround.

## Ownership matrix

| Configuration class | Canonical owner/source | Administration projection | Override rule |
| --- | --- | --- | --- |
| Presentation | Canonical Agent source plus derived Profile projection | Source/projection version, editable owner action when proven | Rendering may vary; source semantics and authority cannot change |
| Model preference | Provider/model registries plus Governance and Agent revision | Eligible choices, exact refs, availability Evidence and policy reason | Selection only within allowed candidates; attenuation applies |
| Capability requirements | Capability/resource owners plus Agent/Workforce/operation requirements | Requirements and support Evidence shown separately from grants | Requirements accumulate; all must be satisfied |
| Skill/tool binding | Governed resource owners plus exact Agent bindings | Exact allowed/selected refs, history maturity and invocation-policy state | Selection narrows; cannot add outside owner/governance grant |
| Credential binding | Connection, SecretStore and credential policy owners | Redacted Connection/secret-version refs, purpose and lifecycle | Opaque authorized choice only; never reveal or broaden |
| Security constraints | Platform/Tenant security and authority policy | Constraint sources, current decision and blocked reason | Strict intersection; lower scopes cannot expand |
| Governance policies | Tenant Governance and policy-kind owners | Exact snapshots, decisions, approvals and owner actions | Class-specific merge; mandatory policy cannot be suppressed |
| Runtime constraints | Runtime/engine/harness/executor/target owners plus policy | Requirements, selected exact refs, health Evidence and limits | Eligible intersection only; observations do not grant authority |
| Memory policy | Governance owns policy; Memory companion owns store semantics | Scope/operations/retention/deletion and provider status, content minimized | Agent/operation may attenuate only |
| Evidence policy | Governance and Evidence owners | Required Evidence sets, emitted refs and gaps | Requirements accumulate; operation may strengthen only |
| Cost and budget policy | Economics/Governance owners | Policy snapshots, limits, quote/reservation/attribution status | Can narrow spend/settlement authority; cannot invent pricing truth |
| Operational system configuration | Environment, readiness, persistence, secret and runtime service owners | Read-only topology/readiness view with source and freshness | No generic override; owner-specific operational procedure only |

## Existing `SystemConfigurationView`

The current view remains a valid read-only operational projection of mode,
backend signals, refresh interval and automation-disabled state. It is not a
Global Settings contract because it lacks per-class owner, scope, source
version, precedence, action and history semantics.

REQ-10 does not replace or upgrade it. A future accepted IMP may adapt it into
or place it beside the class-owned settings index without changing domain
ownership.
