# EPIC-17-REQ-02 — Profile, Persona & Presentation Ownership

**Status:** `COMPLETE / ACCEPTED`
**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `0c8234a5f52d56a09da8c7b7f1e0f0b03cb8ba41`
**Baseline:** `9696bfb37ddbaef0f59e188a1520f2016d080548`
**Dependency:** `EPIC-17-REQ-01 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## 1. Mission result

REQ-02 separates four meanings that the current and proposed vocabularies had
combined:

```text
identity
  = canonical AgentDefinitionV2

behavioral semantics
  = canonical AgentRevisionV2
    (role_ref + instructions + constraints + policies + exact resources)

presentation Profile
  = derived, non-authoritative Agent presentation projection

operational composition profile
  = legacy GovernedProfileResource capability preset
    pending governed-resource disposition in REQ-04
```

No independent Profile aggregate or revision stream is justified by current
repository evidence. Persona is a semantic view over revision-bearing Agent
behavior, not an identity, actor, principal or separately executing object.

## 2. Required invariants

```text
Profile presentation != operational capability.
Persona != second Agent.
Display metadata != permission.
Display metadata != skill.

Profile projection cannot grant, widen or attest authority.
Persona changes require a new canonical Agent revision.
Displayed skills derive from canonical Skill bindings.
```

## 3. Disposition summary

| Capability | Review result | Proposed disposition |
| --- | --- | --- |
| `E17-C16` Canonical name, role and mission | Name is Agent head state; role and instructions are revision state; no separate mission owner exists | `EXTEND` through an optional structured behavioral view under Agent revision ownership; no new identity |
| `E17-C17` Profile | Current Profile is an operational capability preset, while Product API presents a synthetic summary | `ADAPT` by separating legacy composition preset from a derived presentation Profile |
| `E17-C19` Headline, bio and description | No typed owner or history exists | `NEW` presentation attributes under canonical Agent ownership; representation remains a later contract choice |
| `E17-C20` Persona | Role, instructions, constraints and policies already carry behavior | `EXTEND` as a subordinate structured view in `AgentRevisionV2`; no separate aggregate |
| `E17-C21` Custom instructions | `AgentRevisionV2.instructions` is canonical and fingerprinted | `REUSE` without provider-owned prompt truth |
| `E17-C27` Displayed skills | Native Agent binds exact Skill revisions; current profile capability list is not a Skill list | `ADAPT` as a projection of accepted bindings and catalog metadata |

## 4. Deliverables

| Deliverable | Document |
| --- | --- |
| Evidence and semantic separation | [Evidence and boundary analysis](evidence-and-boundary-analysis.md) |
| Profile owner and naming-conflict resolution | [Profile ownership](profile-ownership.md) |
| Persona and behavioral ownership | [Persona and behavior](persona-and-behavior.md) |
| Presentation history and provenance | [Presentation history](presentation-history-and-provenance.md) |
| Proposed contract deltas and candidate ADRs | [Contract deltas and ADRs](contract-deltas-and-adrs.md) |
| Decision record | [Decision record](decision-record.md) |
| REQ and future IMP gates | [Acceptance gates](acceptance-gates.md) |

## 5. Findings carried forward

1. `GovernedProfileResource.capabilityIds` currently contributes to effective
   legacy Agent capabilities. That behavior is incompatible with a
   presentation Profile and remains a future compatibility blocker.
2. No durable Profile or presentation lineage is implemented. An integer
   `revision` on the static resource is not proof of historical reconstruction.
3. Product API synthesizes `openClawCompatible`, `legacyProfileVisible` and
   section names rather than projecting a provenance-bearing presentation
   contract.
4. REQ-01 finding `E17-R01-B02` remains open: Agent head fields, including
   `name`, are outside the current `AgentRevisionV2` fingerprint/history. REQ-03
   must distinguish revision state, head state and lifecycle history before it
   can claim historically reproducible presentation or configuration.

## 6. Closure result

The owner of every Profile/Persona concern is explicit without presuming a new
entity or persistence model. Existing operational Profile semantics remain
visible and bounded as legacy compatibility behavior rather than being silently
reinterpreted as presentation.

```text
EPIC-17-REQ-01
COMPLETE / ACCEPTED

EPIC-17-REQ-02
COMPLETE / ACCEPTED

EPIC-17-REQ-03
DEPENDENCY GATE SATISFIED / DOCUMENTATION EXECUTION AUTHORIZED

Implementation authority: NONE
```
