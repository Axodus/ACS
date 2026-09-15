# EPIC-17 — Post-IMP-07 Dependency & Milestone Gate

**Status:** `COMPLETE / READY FOR CTO REVIEW`
**Published baseline:** `4abeaec3e87d37a53ced4b7a77b7ee4449243353`
**Date:** September 15, 2026
**Scope:** documentation-only dependency and milestone reconciliation
**Implementation authority:** none
**Migration authority:** none

## Gate question

This gate determines the next canonical candidate after the CTO-accepted closure
of IMP-07. It does not authorize IMP-08 implementation, Genome contracts,
Product API changes, schema work, persistence, Runtime, admission, scheduler
or OpenClaw execution.

## Evidence reviewed

- [IMP-07 final conformance](imp-07-final-conformance.md)
- [EPIC-17 dependency graph](../dependency-graph.md)
- [REQ-11 — Genome Traits, Assets & Verification](../req-11/README.md)
- [REQ-11 acceptance gates](../req-11/acceptance-gates.md)
- [REQ-11 contract deltas and ADRs](../req-11/contract-deltas-and-adrs.md)
- [REQ-11 evidence and current boundary](../req-11/evidence-and-current-boundary.md)
- [REQ-12 candidate IMP dependency plan](../req-12/candidate-imp-dependency-plan.md)
- [REQ-12 canonical ownership conformance](../req-12/canonical-ownership-conformance.md)
- [REQ-12 blocker consolidation](../req-12/blocker-consolidation.md)

IMP-07 is closed at the published baseline with REQ-10 satisfied, REQ-12
IMP-07 obligations satisfied, Schema 12 canonical, Schema 13 not required and
no remaining required IMP-07 implementation.

## Dependency reconciliation

The accepted REQ-12 candidate plan maps the node after IMP-07 to:

```text
EPIC-17-IMP-08
Genome Traits, Assets & Verification

Mapped REQ:
EPIC-17-REQ-11 — Genome Traits, Assets & Verification
```

| Required dependency | Disposition | Gate result |
| --- | --- | --- |
| IMP-01 / IMP-02 Agent identity and exact history | accepted canonical source | SATISFIED |
| IMP-03A Connection/Credential boundary | accepted canonical source | SATISFIED |
| IMP-03B Memory boundary | accepted canonical source | SATISFIED |
| IMP-04 Delegation boundary | accepted canonical source | SATISFIED |
| IMP-05 Automation identity/history | accepted canonical source | SATISFIED |
| IMP-06 Activation causal boundary | accepted canonical source | SATISFIED |
| IMP-07 Product/Admin boundary | closed at `4abeaec` | SATISFIED |

## Candidate scope and ownership

IMP-08 is limited to trait vocabulary/assertions, Agent presentation-asset
binding, Evidence/Governance verification references, and optional bounded
performance-derived views. It must preserve these ownership rules:

- Genome references exact canonical Agent history; it does not own Agent lineage.
- Traits grant no capability, permission, credential, Delegation or Runtime authority.
- Assets remain references; no asset-storage owner is implied.
- Evidence remains the proof owner and Governance remains verification/policy authority.
- Performance views are derived and bounded; they do not become economics,
  reputation, ownership, NFT, marketplace or royalty truth.

## Blocker and ADR disposition

- `E17-R11-B08` is **PRESERVED FOR IMP-08**. It was not resolved by IMP-07 and
  becomes an explicit input to the IMP-08 architecture/semantic gate.
- `E17-R10-B14` remains **DEFERRED TO IMP-09** and is non-blocking for IMP-08.
- The REQ-11 contract deltas and ADR candidates remain inputs for a future
  IMP-08 charter; this gate does not accept, implement or close them.
- No CEO escalation is active. Any re-entry of mutation, breeding, authority,
  reputation, NFT, economic rights, marketplace, royalties or ownership requires
  escalation before implementation.

## Required architecture/semantic gate before code

`YES`. A future IMP-08 gate must define at minimum:

1. canonical trait/assertion identity, revision and historical reconstruction;
2. presentation-asset reference and retention semantics;
3. Evidence/Governance verification linkage and invalidation/freshness rules;
4. bounded performance-derived view semantics and explicit unavailable states;
5. Tenant, consent, redaction and Product API compatibility boundaries;
6. schema impact decision, with no migration presumed.

## Schema and holds

```text
Schema 12: CANONICAL
Schema 13: NOT AUTHORIZED
new migration: NONE
new persistence aggregate: NONE

Genome implementation: HOLD
Product API expansion: HOLD
admission / Runtime / Run / Workflow: HOLD
scheduler daemon: HOLD
OpenClaw execution: HOLD
IMP-09 Control Plane IA: HOLD
```

## Gate result

```text
Next canonical candidate:
EPIC-17-IMP-08 — Genome Traits, Assets & Verification

Mapped REQ:
EPIC-17-REQ-11 — Genome Traits, Assets & Verification

Dependencies:
SATISFIED

Preserved blocker:
E17-R11-B08 — IMP-08 architecture/semantic gate input

Deferred blocker:
E17-R10-B14 — IMP-09

Required architecture/semantic gate before code:
YES

Implementation authorization:
NONE

Recommendation:
READY FOR CTO ARCHITECTURE / SEMANTIC GATE REVIEW
```
