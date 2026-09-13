# REQ-02 Presentation History and Provenance

## 1. Reconstruction classes

Presentation and behavior have different historical requirements:

| Class | Required historical source | Rule |
| --- | --- | --- |
| Behavior used for execution | Exact `agent_id + revision + fingerprint` | Always reconstructed from canonical Agent lineage. |
| Current interactive Profile view | Current Agent head plus exact current Agent revision and permitted presentation state | May reflect current state; must label current versus historical context. |
| Retained external presentation artifact | Source Agent reference, projection version, presentation-state reference/snapshot and artifact digest | Must remain reproducible even after current display state changes. |
| Displayed resource list | Exact Agent revision bindings plus exact catalog revisions when labels affect retained output | Display cannot substitute for canonical binding history. |
| Provider/executor materialization | Exact Agent revision, effective-configuration snapshot and compiler provenance | Belongs to runtime compilation, not Profile history. |

## 2. Profile projection provenance

A future retained Profile projection must be able to identify, without fixing a
schema in this REQ:

```text
canonical agent_id
exact AgentRevisionRef
source head/presentation state reference or immutable snapshot
projection contract/version
source references for imported descriptive material
artifact digest/reference when externally retained
rendered_at and actor/process provenance where relevant
```

`SourceReferenceV2` and `ArtifactReferenceV2` provide reusable provenance and
artifact-reference primitives. They do not establish a Profile asset catalog,
asset lifecycle or public visibility policy.

## 3. REQ-01 B02 consumption

`E17-R01-B02` states that `name`, `status` and `sharing_mode` are head fields
outside the current Agent revision fingerprint/history. REQ-02 consumes that
finding as follows:

- current `name` may appear in a current Profile projection;
- no document may claim that historical name/presentation is reconstructable
  from `AgentRevisionV2` alone;
- status and sharing mode remain lifecycle/governance state, not Profile
  metadata;
- REQ-03 must model revision state, head state and lifecycle history as distinct
  inputs before freezing an effective historical snapshot;
- a future contract must keep any presentation history under the same Agent
  authority and avoid a second Profile lineage by default.

REQ-03 cannot close a historically reproducible presentation row while this
source distinction is absent or unresolved. This is a dependency constraint,
not authority to modify `AgentRevisionV2` now.

## 4. Visibility and Tenant rules

- Agent scope, ownership and sharing mode bound who may read presentation.
- Presentation visibility cannot broaden access granted by Agent/Tenant policy.
- Public-looking metadata does not make an Agent or its resources public.
- Restricted source or artifact classification remains restricted in derived
  presentation.
- Raw credentials, secrets, private Memory, internal instructions and hidden
  policy details cannot enter presentation.
- Cross-Tenant Profile projection or asset access fails closed.

## 5. Correction and deletion

Corrections to retained presentation artifacts append a new artifact or
correction record and preserve prior provenance according to Evidence and
retention policy. Current view metadata may change only through the future
canonical Agent-owned command boundary. Deletion, legal erasure, public cache
invalidation and asset retention remain policy/implementation decisions; this
REQ creates no delete semantics.
