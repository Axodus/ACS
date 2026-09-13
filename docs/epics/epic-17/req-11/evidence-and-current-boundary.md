# REQ-11 Evidence and Current Boundary

| Evidence | Implemented fact | REQ-11 consequence |
| --- | --- | --- |
| `src/native-core/agent.ts` — `AgentDefinitionV2`, `AgentRevisionV2` | Stable Agent identity and fingerprinted behavioral revision already exist; revision Evidence carries `evaluation_refs`. | Genome references Agent and source revisions; it creates no identity, lifecycle or behavior stream. |
| `src/native-core/primitives.ts` — `EntityRef`, `RevisionRef` | ACS has typed entity and exact revision reference primitives. | Trait subjects and historical sources reuse typed canonical references where their owners support them. |
| `src/native-core/evidence.ts` — `EvidenceRecordV2` | Evidence is append-only, subject/event-linked, classified and correction-aware. | Verified assertions point to Evidence; Genome cannot become proof ledger. |
| `src/native-core/evidence.ts` — `SourceReferenceV2` | Sources can record kind, locator, observation time and digest. | Declared, observed and derived trait provenance can adapt this primitive. |
| `src/native-core/evidence.ts` — `ArtifactReferenceV2` | Artifact references carry media type, storage reference, digest, size and sensitivity. | Reuse immutable media identity, but do not infer presentation ownership, lifecycle, reuse or visibility policy. |
| `docs/epics/epic-17/req-02/profile-ownership.md` | Profile is a derived Agent presentation projection without identity or independent revision stream. | Trait and asset display remains a Profile projection sourced from Agent-owned presentation state and exact external references. |
| `docs/epics/epic-17/req-02/presentation-history-and-provenance.md` | Retained presentation needs exact Agent, projection, source and artifact provenance. | REQ-11 extends these references and does not add a Profile lineage. |
| `docs/epics/epic-17/req-04/reference-and-history-rules.md` | Operational resource compatibility and exact historical bindings remain kind-specific and admission-owned. | Trait “compatibility” cannot satisfy capability/resource/model requirements or bypass admission. |
| `src/performance-record.ts` and `/acs/performance-records` | A bounded capability/trading performance record exists; supplied fixtures explicitly describe mock UI validation and no return claim. | It is neither canonical Agent reputation nor a Genome fitness owner; any view must preserve mode, warnings, source and scope. |
| `.design/app-standalone/src/shared.tsx` and Agent cards | Current badges are visual status/capability affordances and avatars are generated initials. | UI elements do not prove a domain badge, trait or asset contract. |
| `docs/epics/epic-17/req-10/product-api-contract.md` | Product API is the single application boundary with source-faithful, Tenant-safe projections. | Future trait/asset/badge views extend that boundary only after canonical contracts exist. |

## Demonstrated gaps

No current implementation proves:

- a canonical trait vocabulary, definition identity or version history;
- a trait assertion identity, lifecycle, correction or verification contract;
- a presentation-asset catalog, binding, visibility or deletion owner;
- verification authority/policy for badge claims;
- a Product API/Control Plane Genome projection;
- canonical Agent performance, reputation, fitness or ranking semantics.

These gaps justify candidate semantics and blockers only. They do not authorize
an aggregate, persistence model, API, UI or migration.
