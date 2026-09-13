# EPIC-17-REQ-04 — Governed Resources, Models, Skills, Tools & MCP Boundary

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `c6d888641c882088a30add5a0de888ba08425632`
**Dependencies:** `REQ-01 COMPLETE / ACCEPTED`; `REQ-03 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Mission result

REQ-04 freezes resource ownership without pretending that all resource classes
already share one implementation:

```text
AgentRevisionV2
  -> exact governed resource references
  -> requirements/preferences, never ownership or grants

resource/catalog owner
  -> identity + revision/history + provenance + lifecycle

admission snapshot
  -> exact selected refs + capability/policy evidence
```

Only governed Role currently proves fingerprinted durable history. Model
provider/catalog ownership is implemented but dynamic. Skill, Tool, Capability,
legacy Profile preset and MCP history remain incomplete and require additive
contracts before a resource-history IMP.

## Capability dispositions

| Capability | Classification | REQ-04 disposition |
| --- | --- | --- |
| `E17-C03` Model catalog | `ADAPT` | Preserve provider/model registry ownership and canonical provider/model identity; add historical selection evidence later. |
| `E17-C04` Skills | `ADAPT` | Preserve distinct Skill resources and source metadata; require exact governed revisions/history before canonical admission. |
| `E17-C05` Tools | `EXTEND` | Keep Tool distinct from Skill and permission; add version/provenance/invocation contract only through its owner. |
| `E17-C06` Capabilities | `EXTEND` | Separate definition, requirement, support Evidence and authority grant. |
| `E17-C22` Model preferences | `ADAPT` | Agent expresses requirements/routes; admission selects eligible exact model and snapshots evidence. |
| `E17-C23` Skill bindings | `REUSE` | Preserve Native exact `RevisionRef` bindings; reject unversioned canonical binding. |

## Package

- [Evidence and inventory](evidence-and-inventory.md)
- [Resource ownership matrix](resource-ownership-matrix.md)
- [Reference, lifecycle and snapshot rules](reference-and-history-rules.md)
- [Legacy Profile preset disposition](legacy-profile-preset.md)
- [Contract deltas and ADRs](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

```text
EPIC-17-REQ-04: COMPLETE / READY FOR CTO ACCEPTANCE
EPIC-17-REQ-05: BLOCKED_BY_REQ-04_ACCEPTANCE
EPIC-17-REQ-06: BLOCKED_BY_REQ-04_ACCEPTANCE
Implementation authority: NONE
```
