# REQ-04 Reference, Lifecycle and Snapshot Rules

## Reference semantics

Canonical Skill, Tool, MCP and reusable governed-resource bindings use exact
`RevisionRef` semantics: kind, stable ID, positive revision and fingerprint.
Capability requirements use qualified definition refs and remain requirements.
Model preferences identify provider-neutral requirements/routes; admission
records the exact selected provider/model identity and observed catalog Evidence.

Unversioned IDs may remain in legacy Product API compatibility DTOs, but cannot
enter a canonical execution snapshot as exact historical resources.

## Lifecycle

`active`, `deprecated` and `experimental` remain the existing governed-resource
vocabulary where applicable. New adoption of deprecated/unavailable content
fails unless an explicit policy permits it. Historical snapshots continue to
resolve the exact prior revision. Deletion cannot erase a referenced revision.

Provider/model `available`, `preview`, `deprecated` and `unavailable` describe
catalog/availability state observed at a time. They do not grant permission and
cannot overwrite the historical selection Evidence.

## Snapshot participation

The REQ-03 snapshot records for each selected resource:

```text
resource kind + stable ID
exact revision + fingerprint where governed history exists
source/provenance and compatibility decision
capability requirements and satisfaction Evidence
policy/approval decision refs
selected provider/model identity and catalog observation digest/time
resolver outcome and rejection reason when ineligible
```

The snapshot never embeds credentials, provider secrets, installed package
contents or mutable endpoint state. MCP connection/credential/channel details
belong to REQ-05.

## Compatibility selection

Admission may select only a resource revision compatible with all declared
requirements and policy. It cannot silently substitute latest, another kind,
an unpinned package, a similarly named provider model or a presentation label.
Fallback creates an explicit selection decision in the same admitted snapshot.

Missing exact history, fingerprint mismatch, kind mismatch, deprecated policy
denial, absent capability Evidence or cross-Tenant scope fails closed.
