# REQ-04 Legacy `GovernedProfileResource` Disposition

REQ-02 established that `GovernedProfileResource` is not Agent Profile or
Persona. REQ-04 classifies its implemented behavior as a legacy operational
composition preset because `AgentService.compose` unions its `capabilityIds`
into effective capabilities.

## Proposed destination

```text
GovernedProfileResource
  -> LEGACY_CAPABILITY_REQUIREMENT_PRESET
  -> explicit governed-resource compatibility kind
  -> requirements only
  -X-> presentation Profile
  -X-> permission/capability grant
```

If retained, the preset must express a reusable set of capability requirements,
not grants. It requires an explicit non-Profile name/kind, exact governed
revision, fingerprint, provenance and Tenant/governance rules. REQ-04 does not
authorize that contract, rename or migration.

Legacy reads may preserve `profileId/profileRevision` while clearly labeling
their compatibility semantics. Canonical Native composition must not infer a
presentation Profile or authority from those fields. Migration requires a
versioned mapping and must reject silent capability elevation.

The final representation can be dropped instead if downstream evidence shows
no need beyond direct capability requirements. That choice remains a contract
candidate, not an aggregate assumption.
