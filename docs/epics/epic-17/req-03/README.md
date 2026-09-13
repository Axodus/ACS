# EPIC-17-REQ-03 — Effective Configuration Resolution & Historical Runtime Snapshot

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `0c8234a5f52d56a09da8c7b7f1e0f0b03cb8ba41`
**Dependencies:** `REQ-01 COMPLETE / ACCEPTED`; `REQ-02 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## 1. Mission result

REQ-03 defines class-specific configuration resolution and an immutable,
fingerprinted execution snapshot without creating a universal override chain or
redefining Run/Runtime:

```text
accepted immutable source references
  + current head/lifecycle eligibility
  + class-specific authority and attenuation
  + admission observations and decisions
  -> deterministic effective configuration
  -> immutable execution configuration snapshot
  -> existing binding / intent / Run evidence chain
```

Resolution occurs under ACS admission authority. Runtime consumes the accepted
result; it does not reinterpret policies, elevate authority or resolve a new
configuration after dispatch.

## 2. State separation

```text
REVISION STATE
  immutable authored behavior/configuration; fingerprinted

HEAD STATE
  current Agent-level administrative state

LIFECYCLE HISTORY
  ordered historical transitions of head/lifecycle semantics

EFFECTIVE EXECUTION CONFIGURATION
  deterministic result resolved at admission for one binding generation

EXECUTION CONFIGURATION SNAPSHOT
  immutable evidence of inputs, decisions and resolved values actually used
```

These are related records with different owners and time semantics. They must
not be collapsed into `AgentRevisionV2` or one mutable configuration blob.

## 3. Deliverables

| Deliverable | Document |
| --- | --- |
| Implemented evidence and gaps | [Evidence baseline](evidence-baseline.md) |
| State, resolution and admission model | [Resolution model](resolution-model.md) |
| Authority/precedence by class | [Authority matrix](authority-matrix.md) |
| Snapshot, fingerprint and reconstruction | [Snapshot and reconstruction](snapshot-and-reconstruction.md) |
| Candidate contract deltas and ADRs | [Contract deltas and ADRs](contract-deltas-and-adrs.md) |
| Proposed decisions | [Decision record](decision-record.md) |
| Closure and future IMP gates | [Acceptance gates](acceptance-gates.md) |

## 4. Capability dispositions

| Capability | Classification | REQ-03 disposition |
| --- | --- | --- |
| `E17-C11` Runtime/system configuration | `EXTEND` | Define a typed logical effective snapshot while provider, engine, target, policy and runtime services retain ownership. |
| `E17-C29` Historically reconstructable behavior | `EXTEND` | Reconstruct from exact Agent revision plus immutable admitted snapshot and explicit head/lifecycle source status. |
| `E17-C50` Execution policies | `REUSE` | Preserve `ExecutionPolicyV2`, policy snapshots and governance authority; apply class-specific attenuation. |
| `E17-C58` Runtime resolution | `EXTEND` | Type resolution inputs, decisions, fingerprints and snapshot references without replacing admission/runtime compilation. |

## 5. Findings carried forward

- `E17-R01-B01`: Native reads and legacy Agent writes remain split. A resolver
  cannot treat legacy mutation state as canonical Native input.
- `E17-R01-B02`: Agent head/lifecycle history is insufficient for historical
  reconstruction. Snapshot rules preserve this as an explicit unavailable
  source rather than copying all head fields into Agent revision.
- `E17-R01-B03`: legacy deployment/readiness/composition consumers remain and
  cannot become a second configuration owner.
- `E17-R02-B01`: legacy Profile capability contribution is excluded from
  canonical capability resolution pending REQ-04.
- `E17-R02-B02`/`B03`: presentation state/history and Product API projection
  provenance remain incomplete; retained presentation must fail closed when
  required source history is unavailable.
- `E17-R02-B04`: the revision/head/lifecycle distinction is consumed directly
  by this REQ.

## 6. Closure result

```text
Configuration authority: RESOLVED BY CLASS
Universal override chain: REJECTED
Lower-layer authority escalation: REJECTED
Admission resolution: DEFINED
Immutable snapshot boundary: DEFINED
Historical reconstruction: DEFINED WITH EXPLICIT SOURCE GAPS
Runtime/Run ownership: PRESERVED

EPIC-17-REQ-03: COMPLETE / READY FOR CTO ACCEPTANCE
EPIC-17-REQ-04: BLOCKED_BY_REQ-03_ACCEPTANCE
Implementation authority: NONE
```
