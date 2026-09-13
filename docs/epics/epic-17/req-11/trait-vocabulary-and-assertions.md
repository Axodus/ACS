# REQ-11 Trait Vocabulary and Assertion Semantics

## Minimal Genome responsibility

The bounded Genome classification owner may own only:

1. the meaning and version of descriptive trait definitions;
2. provenance-bearing assertions that a typed canonical subject exhibits a
   defined trait under stated qualifiers and time semantics.

It does not own the referenced subject or fact source. Evidence owns proof;
Governance owns publication and verification policy; operational domains own
capability, authority, readiness, admission and execution truth.

## Logical trait definition

A future trait definition needs representation-neutral semantics for:

- a qualified, namespaced identifier that cannot collide by display label;
- exact definition version or immutable semantic digest;
- human label and precise description;
- value kind, cardinality and allowed qualifiers;
- allowed subject kinds and anchoring modes;
- compatibility/deprecation relationship to earlier definitions;
- definition owner and Tenant/global scope;
- provenance and lifecycle state.

This is a logical contract requirement, not a chosen entity, aggregate,
revision stream, table or serialization format. A changed meaning cannot reuse
an old immutable version/digest.

## Logical trait assertion

A future assertion needs enough information to answer:

```text
who or what is described?
which exact trait meaning applies?
what value or classification is asserted?
who or what made the assertion?
was it declared, observed or derived?
for what scope and time/window is it valid?
which sources and Evidence support it?
what is its verification/correction state?
```

The logical content therefore includes a stable reference or immutable digest,
an exact typed subject reference, exact trait-definition reference, value and
qualifiers, assertion origin, issuer/producer, observation/effective time,
source/Evidence references, visibility, verification state and
correction/supersession linkage. The concrete persistence form remains open.

## Subject anchoring

| Assertion subject | Required anchor | Meaning |
| --- | --- | --- |
| Revision-specific Agent behavior | `agent_id + revision + fingerprint` | Describes only that immutable behavioral revision. |
| Current Agent presentation | Stable Agent plus exact head/presentation source or observation | Current projection; must not claim revision immutability. |
| Governed resource | Exact revision/fingerprint or owner-defined immutable observation | Uses only the historical guarantee that resource owner can prove. |
| Run/Task/Activation outcome | Exact canonical execution reference plus Evidence | Describes a bounded historical occurrence. |
| Derived performance window | Exact subject, time/window, method and complete source set or declared gap | A view/assertion, never reputation or fitness. |

An assertion about an Agent revision does not become part of that revision and
does not change its fingerprint. An assertion about the current Agent head is
not retroactively true for earlier revisions.

## Operational prohibition

A trait cannot:

- add a Skill, Tool, model, MCP, Connection, Channel or Memory binding;
- grant a permission, credential, lease, Delegation or approval;
- satisfy capability support or resource compatibility Evidence;
- alter precedence, effective configuration, admission or runtime selection;
- create ownership, transferability, reputation or economic rights.

If an operational policy wants to consume a descriptive assertion in the
future, that policy must independently define trusted issuers, exact Evidence,
freshness, failure semantics and authority. The assertion itself remains
non-authoritative.
