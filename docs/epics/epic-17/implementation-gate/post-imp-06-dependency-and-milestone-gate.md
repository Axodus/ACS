# EPIC-17 — Post-IMP-06 Dependency & Milestone Gate

**Status:** `COMPLETE / READY FOR CTO REVIEW`
**Published baseline:** `bccac46bf5a5c7469c5d158987c003512a17c8da`
**Scope:** documentation-only dependency and milestone reconciliation
**Implementation authority:** none
**Migration authority:** none
**Schema authority:** Schema 12 canonical; Schema 13 not authorized

## Gate question

This gate determines the next implementation candidate from the accepted
REQ-12 dependency graph after IMP-06 closure. It does not authorize the
candidate, add a Product API route, invoke admission, create a Run or Workflow,
start a scheduler, execute OpenClaw work or change persistence.

## Evidence reviewed

- [Dependency graph](../dependency-graph.md)
- [REQ decomposition](../req-decomposition.md)
- [Capability-to-REQ matrix](../capability-to-req-matrix.md)
- [REQ-10 — Product API, Administration & Control Plane](../req-10/README.md)
- [REQ-11 — Genome Traits, Assets & Verification](../req-11/README.md)
- [REQ-12 — Cross-Domain Conformance & IMP Readiness](../req-12/README.md)
- [REQ-12 candidate IMP dependency plan](../req-12/candidate-imp-dependency-plan.md)
- [REQ-12 blocker traceability](../req-12/blocker-traceability.md)
- [REQ-12 contract delta and ADR plan](../req-12/contract-delta-and-adr-plan.md)
- [IMP-06 final conformance and closure](imp-06-final-conformance.md)

The published baseline is the IMP-06 closure commit. The closure records
`EPIC-17-IMP-06` as `COMPLETE / CTO ACCEPTED / CLOSED`, with Schema 12
canonical and no remaining required IMP-06 functional slice.

## Dependency reconciliation

The frozen candidate plan maps the node after IMP-06 to:

```text
EPIC-17-IMP-07
Product API and Administration Contracts

Mapped REQ:
EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection
```

Its accepted prerequisites are all satisfied:

| Required dependency | Repository disposition | Gate result |
| --- | --- | --- |
| `IMP-03A` | `COMPLETE / CTO ACCEPTED / PUBLISHED` | `SATISFIED` |
| `IMP-03B` | `COMPLETE / CTO ACCEPTED / PUBLISHED` | `SATISFIED` |
| `IMP-04` | `COMPLETE / CTO ACCEPTED / PUBLISHED` | `SATISFIED` |
| `IMP-05` | `COMPLETE / CTO ACCEPTED / CLOSED` | `SATISFIED` |
| `IMP-06` | `COMPLETE / CTO ACCEPTED / CLOSED` at `bccac46` | `SATISFIED` |

REQ-10 is `COMPLETE / ACCEPTED`. IMP-07 therefore becomes the next canonical
candidate by dependency, not merely by sequence number. IMP-08 still depends
on IMP-07; IMP-09 depends on IMP-07, IMP-08 and an explicit Administration IA
decision.

## Blocker disposition

There is no unresolved predecessor blocker preventing preparation of the
IMP-07 charter. The remaining findings are inputs that the charter must own,
split or defer explicitly:

| Blocker | IMP-07 disposition required |
| --- | --- |
| `E17-R10-B09` | Define common source, lineage, freshness and reconstruction metadata. |
| `E17-R10-B10` | Define owner-routed action descriptors and command envelopes while preserving canonical owner validation. |
| `E17-R10-B11` | Define Global Settings only as a class-owned index over existing owners. |
| `E17-R10-B12` | Keep routes on hold until the CTO accepts an IMP-07 charter and explicitly authorizes the applicable slice. |
| `E17-R10-B13` | IMP-07 may establish API readiness and explicit unavailable states; Control Plane module implementation remains assigned to IMP-09. |
| `E17-R10-B15` | Prove Tenant-safe list, search, reference and history behavior for every projection introduced by an authorized IMP-07 slice; retain final cross-domain verification for IMP-10. |
| `E17-R11-B08` | The REQ-12 trace assigns its API concern to IMP-07, but Genome domain contracts depend on IMP-08. IMP-07 may freeze extension and unavailable-state semantics only; trait, asset and verification projections remain unavailable until their canonical IMP-08 sources exist. |
| `E17-R10-B14` | `DEFERRED TO IMP-09`; it is not an IMP-07 entry blocker, but no route or module placement may silently resolve the IA divergence. |

`E17-R10-B01` through `E17-R10-B08` were predecessor findings mapped to
IMP-01 through IMP-06. Their required canonical sources now exist in accepted
milestones, so they are satisfied dependencies rather than remaining IMP-07
entry blockers.

## Contract delta and ADR ownership

The IMP-07 charter must disposition these REQ-10 contract candidates before
the corresponding code is authorized:

- direct IMP-07 inputs: `E17-R10-CD01` through `E17-R10-CD15`;
- deferred Control Plane/IA inputs: `E17-R10-CD16` and `E17-R10-CD17` to
  IMP-09;
- direct IMP-07 ADR candidates: `ADR-17-043` through `ADR-17-048` and
  `ADR-17-050`;
- deferred Control Plane/IA ADR candidates: `ADR-17-049` and `ADR-17-051` to
  IMP-09.

This split preserves one Product API boundary, source-faithful projections,
owner-routed commands, class-owned Global Settings and Tenant-safe query
semantics while preventing Product API contracts from making a Control Plane
IA decision by implication.

## Required freeze before code

`YES`. A short IMP-07 architecture/semantic freeze is required in its charter,
covering:

1. common projection metadata and loss/reconstruction markers;
2. owner-routed action and command semantics;
3. the class-owned Global Settings index;
4. Product API family/versioning and unavailable-state boundaries;
5. Tenant-safe list, search, reference, history and redaction behavior;
6. the exact split from IMP-09 Control Plane and IA work.

This is a bounded implementation-gate freeze. It does not reopen REQ-10 or
authorize functional work.

## Schema assessment

`NONE`. IMP-07 is mapped to contracts, projections and owner-routed
application actions over canonical state already delivered through Schema 12.
REQ-10 explicitly rejects a Global Settings aggregate, repository, table or
store. Schema 13 remains unauthorized. A future persistence requirement would
be a new candidate requiring a separate architecture and migration decision.

## Holds preserved by this gate

```text
new Product API routes: HOLD
admission invocation: HOLD
Run / Workflow creation: HOLD
scheduler daemon: HOLD
OpenClaw execution: HOLD
Schema 13: NOT AUTHORIZED
new functional implementation: NONE
```

## Gate result

```text
Next canonical milestone:
EPIC-17-IMP-07 — Product API and Administration Contracts

Mapped REQ:
EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection

Dependencies:
SATISFIED

Remaining blockers:
E17-R10-B09, E17-R10-B10, E17-R10-B11, E17-R10-B12,
E17-R10-B13 and E17-R10-B15 — IMP-07 charter/slice dispositions required
E17-R11-B08 — dependency-deferred until canonical IMP-08 sources exist
E17-R10-B14 — deferred to IMP-09; not an IMP-07 entry blocker

Required architecture/semantic freeze:
YES

Schema impact:
NONE

Recommendation:
READY FOR CTO IMPLEMENTATION GATE
```

The recommendation authorizes preparation and CTO evaluation of a concrete
IMP-07 charter only. Functional implementation remains unauthorized.
