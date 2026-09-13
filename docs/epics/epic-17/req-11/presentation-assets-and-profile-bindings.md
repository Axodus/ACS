# REQ-11 Presentation Assets and Profile Bindings

## Ownership separation

```text
Agent-owned presentation state
        │ owns binding and semantic role
        ▼
presentation asset reference
        │ identifies immutable media/digest
        ▼
storage/blob owner

Evidence may prove provenance
Product API projects an authorized view
Profile displays the projection
```

The Agent presentation owner controls whether an asset is bound as avatar,
icon, banner or another accepted presentation role. The media/storage owner
controls bytes, integrity, retention and delivery. Profile has no independent
asset ownership or revision stream.

## Artifact primitive adaptation

`ArtifactReferenceV2` is sufficient evidence for an immutable media pointer:
`artifact_id`, media type, storage reference, digest, optional size and
sensitivity. It is insufficient evidence for a presentation asset domain
because it does not define:

- presentation role or Agent binding;
- ownership and Tenant scope;
- permitted renditions/transforms and accessibility metadata;
- publication/visibility policy;
- replacement, revocation, deletion or cache invalidation;
- reusable catalog semantics;
- source license/consent or correction provenance.

A future presentation-asset reference may adapt that immutable envelope. It
must not reinterpret every Evidence artifact as an available Profile asset.

## Binding and history rules

- Agent/Profile stores a typed reference, never inline binary or media.
- The binding identifies its semantic role and exact immutable asset digest.
- Replacing media creates a new immutable asset reference and a new binding
  observation/change; it does not mutate old retained output.
- Derived renditions retain the source asset/digest and transformation
  provenance.
- Alt text and other presentation metadata do not grant operational semantics.
- Retained Profile artifacts record exact Agent revision/head source,
  presentation binding, asset digest, projection version and render time.
- Visibility cannot exceed Agent/Tenant, source, consent, license, Evidence or
  asset sensitivity constraints.

## Deletion and unavailability

Deletion authority belongs to the applicable presentation/storage/privacy
policy, not Genome. Historical reconstruction may retain a safe identifier,
digest, tombstone, policy decision and Evidence while the bytes are absent. A
deleted or inaccessible asset must be shown as unavailable/redacted; a client
must not recover it from an unrelated cache or current binding.

REQ-11 does not select an asset aggregate, catalog, repository, object store,
CDN, table, upload API or media processing pipeline.
