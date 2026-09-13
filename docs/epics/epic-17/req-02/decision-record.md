# EPIC-17-REQ-02 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

## Decisions

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R02-D01` | Agent Profile is a derived, non-authoritative presentation projection of one canonical Agent. | `PROPOSED` |
| `E17-R02-D02` | Profile has no independent identity, lifecycle, aggregate or revision stream under current evidence. | `PROPOSED` |
| `E17-R02-D03` | `GovernedProfileResource` is a legacy operational composition preset, not the Agent presentation Profile. | `PROPOSED` |
| `E17-R02-D04` | Presentation Profile cannot contribute capability, permission, credential, policy authority, readiness or verified claims. | `PROPOSED` |
| `E17-R02-D05` | Persona is a semantic view inside or exactly referenced by `AgentRevisionV2`; Persona changes advance canonical Agent lineage. | `PROPOSED` |
| `E17-R02-D06` | `AgentRevisionV2.instructions` remains the canonical custom-instructions component; provider/executor prompts are compiled outputs. | `PROPOSED` |
| `E17-R02-D07` | Headline, bio and description are optional Agent-owned presentation-state gaps with no operational effect; representation is deferred. | `PROPOSED` |
| `E17-R02-D08` | Displayed skills/tools derive from exact canonical bindings and cannot create or attest bindings. | `PROPOSED` |
| `E17-R02-D09` | Retained presentation requires explicit Agent revision, source state, projection version and source/artifact provenance. | `PROPOSED` |
| `E17-R02-D10` | REQ-03 must distinguish revision state, head state and lifecycle history and explicitly consume `E17-R01-B02`. | `PROPOSED` |
| `E17-R02-D11` | Profile assets and badges remain bounded presentation/verification topics for REQ-11 and grant no authority. | `PROPOSED` |

## Rejected approaches

- a Profile identity, principal, lifecycle or independent revision stream;
- a Persona Agent, `SubAgent` or separately executing Persona;
- presentation fields inside the capability-bearing legacy Profile resource;
- Profile, displayed skills or badges granting operational capability;
- provider/OpenClaw prompt files as canonical Persona truth;
- silently treating static Profile integer revision as durable lineage;
- current-head-only reconstruction of historical presentation;
- embedding raw credentials, secret material or private Memory in Profile.

## Acceptance effect

CTO acceptance makes `EPIC-17-REQ-03` ready for documentation execution. It
freezes ownership and semantic boundaries only. It does not authorize an IMP,
migration, schema, endpoint, API payload, UI, runtime, database or production
change.
