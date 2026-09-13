# EPIC-17-REQ-01 Decision Record

**Decision state:** `PROPOSED FOR CTO ACCEPTANCE`
**Implementation authority:** none

## Decisions

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R01-D01` | `AgentDefinitionV2` and `AgentRevisionV2` define the sole canonical Agent semantic contract. | `PROPOSED` |
| `E17-R01-D02` | `AsyncNativeCoreRepository` in shared PostgreSQL is the sole durable Native Agent head/history authority. | `PROPOSED` |
| `E17-R01-D03` | Existing Product API Agent responses are compatibility projections when sourced from Native Core. | `PROPOSED` |
| `E17-R01-D04` | `AgentDefinition`, `AgentRevision`, `AgentService` and `record_kind='legacy'` are legacy compatibility surfaces, not peer canonical models. | `PROPOSED` |
| `E17-R01-D05` | Canonical writes must use one Native command path; dual write is rejected. | `PROPOSED` |
| `E17-R01-D06` | Lifecycle remains within the canonical Agent aggregate and must be historically reconstructable without a second stream. | `PROPOSED` |
| `E17-R01-D07` | Native historical references use `agent_id + revision + fingerprint`; integer revision alone is insufficient across canonical boundaries. | `PROPOSED` |
| `E17-R01-D08` | Ordinary Native lifecycle does not physically delete immutable Agent history. | `PROPOSED` |
| `E17-R01-D09` | Provider, executor, model, prompt, Profile, Persona, Genome and SubAgent representations cannot define Agent identity. | `PROPOSED` |

## Rejected approaches

- equal Native and legacy write authorities;
- a third Agent/GenomeAgent/SubAgent model;
- dual write to `legacy` and `native_v2` lineages;
- automatic round-trip from the lossy Product API projection;
- destructive or unversioned migration;
- provider/executor-owned Agent identity or history;
- mutable historical revisions or backward head movement;
- a separate lifecycle store or lineage service.

## Acceptance effect

CTO acceptance makes `EPIC-17-REQ-02` ready for documentation execution. It
does not authorize an IMP, migration, schema, API, runtime, UI, database or
production change.
