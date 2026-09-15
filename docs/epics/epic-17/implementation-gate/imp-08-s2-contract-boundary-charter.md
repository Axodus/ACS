# EPIC-17-IMP-08 S2 — Presentation Assets / Verification Contract Boundary Charter

**Epic:** EPIC-17 — Agent Genome Foundations, Administration & Automation Platform
**Milestone:** EPIC-17-IMP-08 — Genome Traits, Assets & Verification
**Slice:** S2 — Presentation Assets / Verification
**Mapped requirement:** EPIC-17-REQ-11
**Baseline:** `425485ce2b09777a5af997a18726554acbf9236c`
**Status:** `COMPLETE / CTO ACCEPTED`
**Implementation:** `COMPLETE / CTO ACCEPTED / PUBLISHED` (`fd03ee04e0acf32af927864d5c2955cca0cc7ccb`)
**Persistence impact:** `A — NO PERSISTENCE CHANGE REQUIRED`
**Schema:** `12 / CANONICAL / UNCHANGED`; Schema 13 `NOT AUTHORIZED`

## 1. Mission and boundary

S2 defines the smallest ACS-native contract boundary through which a Genome trait assertion may describe a presentation asset reference and an associated verification reference. Genome may describe and point to canonical facts, but does not store media, become Evidence, issue verification, or acquire operational authority.

```text
exact Agent / AgentRevision subject
        -> exact Trait assertion
        -> presentation asset reference association
        -> provenance / Evidence references
        -> verification reference and descriptive status

No ownership, storage, authority, or execution is implied by any arrow.
```

This charter was authored as contract/design review. Its pre-acceptance wording remains historical context. CTO acceptance and the separately published S2 implementation are reconciled by ACS-WORKSPACE-REQ-01; this update does not create a new technical acceptance.

## 2. Success criteria and exclusions

The future S2 contract must make presentation references immutable and descriptive; keep trait assertion, provenance, Evidence and verification separate; preserve S1 current/exact subject addressing; report external unavailability explicitly without invalidating a Trait; and report historical absence as a gap without current/latest substitution.

S2 excludes bytes, blobs, files, upload/download, object storage, CDN, catalog/repository semantics, Evidence copies, verification engine or policy, trust scoring, verification authority, Product API, Runtime, Admission, providers/executors, economics, migrations and changes to Schema 12 or 13.

## 3. Canonical ownership

| Concern | Canonical owner | S2 boundary |
| --- | --- | --- |
| Current Agent | `AgentDefinitionV2` | Reuse via S1 `CurrentGenomeAgentSubjectV1`; Genome does not own an Agent. |
| Historical Agent | `AgentRevisionV2` / fingerprinted `RevisionRef` | Reuse via S1 exact subject; the canonical fingerprint is preserved. |
| Trait definition/assertion | S1 Genome contracts | Remain the descriptive vocabulary/assertion boundary. |
| Provenance | Existing `SourceReferenceV2` owner | Reuse references; never copy source content. |
| Evidence | Existing append-only `EvidenceRecordV2` owner | Reuse `EntityRef` only; Genome does not write or evaluate Evidence. |
| Immutable media identity | Existing `ArtifactReferenceV2` owner | Adapt only as immutable external-media identity; never promote it to a presentation catalog. |
| Presentation role/binding | Canonical Agent-owned presentation state, not currently proven as durable owner | S2 may define a logical association. It cannot claim a Profile, repository or durable owner exists. |
| Verification result/status | Existing verification/Governance owner when available | S2 associates external refs and descriptive status only. |
| Verification policy/authority | Governance | S2 cannot issue, refresh, revoke or interpret verification as authority. |

## 4. Requirement mapping

| Requirement | Existing primitive | Proposed representation | Owner | Failure semantics | Persistence |
| --- | --- | --- | --- | --- | --- |
| Current subject | S1 `CurrentGenomeAgentSubjectV1` / `EntityRef` | Reuse unchanged. | Canonical Agent | Invalid subject is rejected by S1. | None |
| Historical subject | S1 exact subject / `RevisionRef` | Reuse unchanged. | Canonical AgentRevision | `GENOME_EXACT_SUBJECT_UNAVAILABLE`; no head lookup. | None |
| Assertion identity | `TraitAssertionReferenceV1` | Reuse exact id/digest. | Genome assertion boundary | Explicit reconstruction gap. | None |
| Provenance | `SourceReferenceV2` | Reuse references. | Source owner | Explicit provenance-unavailable finding. | None |
| Evidence | `EntityRef` to Evidence | Reuse reference list only. | Evidence | `GENOME_EVIDENCE_REFERENCE_UNAVAILABLE`; no payload copy. | None |
| Verification | `TraitVerificationReferenceV1` | Reuse external verification ref, assertion ref, Evidence refs, decision ref and descriptive status. | Verification/Governance owner | `GENOME_VERIFICATION_REFERENCE_UNAVAILABLE`; do not infer status or authority. | None |
| Immutable media | `ArtifactReferenceV2` | Adapt exact artifact envelope/digest. | Artifact/storage owner | `PRESENTATION_REFERENCE_UNAVAILABLE`; no cache/current-binding recovery. | None |
| Presentation role relation | No primitive combines role with exact subject/assertion/artifact | Candidate bounded association contract only after S2 implementation GO. | Future accepted Agent-presentation owner | Explicit association/history gap. | None |

`ArtifactReferenceV2` cannot express presentation role or its relation to an exact Trait subject/assertion. That is the only demonstrated association gap. It may justify a bounded association contract later; it does not justify a new primitive, aggregate, store, schema, catalog or owner.

## 5. Candidate representation for a future authorized implementation

```text
PresentationAssetAssociation
  exact subject: GenomeSubjectV1
  assertion: TraitAssertionReferenceV1
  presentation role: descriptive label
  artifact: exact ArtifactReferenceV2 / digest
  provenance: SourceReferenceV2[]
  Evidence: EntityRef[]
  availability finding: descriptive only

TraitVerificationReferenceV1
  exact assertion reference
  external verification reference
  Evidence references
  optional Governance decision reference
  descriptive status
```

The association cannot contain binary content, mutable URL-as-truth, upload instructions, storage client, retention/deletion command, ownership field, permission, credential, capability, economic value or verifier decision logic. `TraitVerificationReferenceV1` remains an association: its status cannot claim that Genome issued, refreshed, revoked or authorized verification.

## 6. Failure and historical semantics

| Situation | Required result | Forbidden behavior |
| --- | --- | --- |
| Presentation reference does not resolve | `PRESENTATION_REFERENCE_UNAVAILABLE` with exact requested ref/digest. | Cache, unrelated artifact or current binding substitution. |
| External representation unavailable | `PRESENTATION_REPRESENTATION_UNAVAILABLE`; Trait remains descriptive. | Treating it as Trait invalidation or dropping the ref. |
| Evidence absent/restricted/unavailable | `GENOME_EVIDENCE_REFERENCE_UNAVAILABLE`. | Copying Evidence or reconstructing from current source. |
| Verification reference unavailable | `GENOME_VERIFICATION_REFERENCE_UNAVAILABLE`. | Coercing to verified, unverified or authority. |
| Exact historical subject unavailable | S1 `GENOME_EXACT_SUBJECT_UNAVAILABLE`. | Resolving the current Agent revision/head. |
| Historical provenance unavailable | Explicit provenance reconstruction gap. | Current/latest substitution or silent omission. |

Historical output retains exact subject, assertion id/digest, artifact id/digest when present, provenance/Evidence/verification references and the recorded finding. A current availability observation cannot rewrite historical output.

## 7. Required future tests

An S2 implementation proposal must test current subject; exact historical subject; historical gap without fallback; preserved `SourceReferenceV2`; separation between claim, Evidence and verification; unavailable asset; unavailable verification; historical provenance/asset/verification gaps; and a structural negative check for bytes, blobs, files, storage, upload/download, catalog/repository, persistence, Product API, Runtime, Admission, capability, permission, authority, credential and economic semantics.

If a role vocabulary is introduced, it must also be proved incapable of changing effective configuration or execution.

## 8. Persistence stop condition

```text
If S2 requires durable identity, durable association history, a storage catalog,
Schema 12 alteration, Schema 13, or a migration:

STOP
  -> report contradiction to Persistence impact A
  -> request CTO physical-design review
  -> do not implement persistence
```

No such need is demonstrated. S3 remains conditional and is expected to be `SKIPPED / NOT REQUIRED` unless later evidence proves otherwise.

## 9. CTO review result

- [x] Reuse-first mapping accepted.
- [x] Presentation association accepted as bounded metadata only.
- [x] `ArtifactReferenceV2` remains an immutable external reference, not a catalog or storage owner.
- [x] Verification remains an external association without policy or authority.
- [x] Unavailable and historical-gap outcomes are explicit and fail closed.
- [x] No persistence, schema, API, Runtime, Admission, provider/executor or economic scope entered S2.
- [x] S2 implementation is published at `fd03ee04e0acf32af927864d5c2955cca0cc7ccb`.

## 10. Result

```text
EPIC-17-IMP-08 S2
PRESENTATION ASSETS / VERIFICATION CONTRACT BOUNDARY CHARTER

Status: COMPLETE / CTO ACCEPTED
Implementation: COMPLETE / CTO ACCEPTED / PUBLISHED
Canonical ownership: REUSE Agent, AgentRevision, Source, Evidence, Artifact and Governance owners
Genome ownership: DESCRIPTIVE ASSOCIATIONS ONLY
New primitive/aggregate/store: NONE AUTHORIZED
Persistence impact: A — NONE
Schema 12: UNCHANGED
Schema 13: NOT AUTHORIZED
Product API / Runtime / Admission: NONE
Stop condition: PERSISTENCE OR SCHEMA REQUIREMENT -> CTO PHYSICAL-DESIGN REVIEW
Acceptance evidence: Charter commit `7ddd015a736e19f825bb356ae7c288ce5f025c56`; implementation commit `fd03ee04e0acf32af927864d5c2955cca0cc7ccb`
```
