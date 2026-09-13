# REQ-02 Profile Ownership and Naming Resolution

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`

## 1. Presentation Profile owner

Within EPIC-17, `Profile` means a non-authoritative presentation projection of
one canonical Agent. It has no independent identity, lifecycle, actor status or
revision stream.

```text
canonical Agent head + exact Agent revision + permitted presentation state
    -> deterministic Profile projection
    -> Product API
    -> Application / retained presentation artifact
```

The canonical Agent owner controls source state. Product API owns projection
shape and application delivery, but not Agent or presentation truth. The
Application may choose layout and local view state; it cannot mutate identity,
behavior or authority by changing presentation.

## 2. No independent Profile revision

Current evidence does not justify a Profile aggregate or independent Profile
revision stream. Historical identity and behavior remain bound to the exact
canonical Agent reference. Presentation state that later proves necessary must
remain under Agent ownership and the same canonical event/history authority;
its concrete representation is a later additive contract decision.

An independently reusable presentation template may be considered only after a
later REQ demonstrates cross-Agent reuse, ownership, Tenant scope and history.
It would be a governed presentation resource referenced by Agent state, not a
second Agent or an implicitly created Profile aggregate.

## 3. Presentation attributes

| Attribute | Proposed ownership | Operational effect |
| --- | --- | --- |
| `agent_id` | Canonical Agent identity | Identity only; never presentation-owned |
| Current name/display label | `AgentDefinitionV2.name` head state | No capability or permission |
| Role/mission summary | Derived from exact Agent revision behavior | Summary only; source semantics remain revision-owned |
| Headline, bio, description | Optional Agent-owned presentation state, contract absent | None |
| Displayed skills/tools | Derived from exact canonical resource bindings and catalog labels | Cannot add, enable or attest a binding |
| Avatar and other assets | Presentation reference boundary reserved for REQ-11 | None; storage and verification are not inferred |
| Badges | Reserved for REQ-11 decorative/verification separation | No authority, reputation or economic right |

Headline, bio and description therefore remain a demonstrated `NEW` contract
gap under Agent presentation ownership. REQ-02 fixes their semantics but does
not choose fields, storage or API payloads.

## 4. Existing `GovernedProfileResource`

The implemented `GovernedProfileResource` is not adopted as the presentation
Profile because it contains `capabilityIds` and contributes those IDs to legacy
effective composition. It is classified as:

```text
LEGACY_OPERATIONAL_COMPOSITION_PRESET
```

REQ-04 must decide its governed-resource destination. Candidate destinations
include an explicitly named capability requirement/preset resource or bounded
legacy compatibility adapter. Until then:

- current behavior remains documented and unchanged;
- it cannot be treated as a presentation source;
- it cannot grant canonical Native capability or authority;
- its integer revision cannot be represented as durable Profile history;
- Product API must not merge it silently with future presentation fields.

## 5. Displayed resource rule

Displayed skills, tools or capabilities are projections of already accepted
canonical bindings and catalog metadata. A presentation layer may sort, group
or hide them for a view, but may not add a binding or claim availability,
permission, readiness or verification not established by the owning domain and
Evidence.

```text
displayed skill -> exact bound Skill reference -> governed catalog metadata

displayed skill -X-> Skill grant
displayed skill -X-> permission
displayed skill -X-> executor availability
```
