# EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection

**Status:** `COMPLETE / ACCEPTED`
**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `75758a752bb8ab04f1402bcd7ce9039fb623a673`
**Baseline:** `8e5c60977affa299b864a42d831e79ef4339ab2a`
**Dependencies:** `REQ-02` through `REQ-09 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
canonical domain owner
  -> versioned Product API projection / governed command adapter
  -> Control Plane flow
  -> module
  -> screen and user interaction
```

Product API remains the only supported application boundary. Administration
coordinates operator workflows and projects owner-supplied action availability;
it does not become the owner of Agent, resources, integration, Memory,
Delegation, Automation, Activation, Runtime, Evidence or Economics state. The
Control Plane never stores or infers canonical truth.

Global Settings is resolved as a class-owned settings index/projection. It is
not a transversal entity, aggregate, repository, table or universal override
layer. Every item retains its canonical owner, scope, source version,
precedence/attenuation rule and historical source.

## Capability dispositions

| Capability | Class | REQ-10 disposition |
| --- | --- | --- |
| `E17-C01` Administration domain | `EXTEND` | Extend existing Tenant/System administration with owner-routed workflows and action projections; Administration owns no underlying domain truth. |
| `E17-C02` Global Settings | `NEW` | Define a class-owned settings index and navigation projection; reject a convenience transversal core and universal override chain. |
| `E17-C67` Product API | `EXTEND` | Add future versioned domain projections and governed command adapters under the existing Product API policy; reject a parallel Genome/Admin API. |
| `E17-C68` Control Plane | `EXTEND` | Add flows/modules/screens that consume Product API only and preserve canonical drill-down, explicit state and action availability. |

## Package

- [Evidence and current surface](evidence-and-current-surface.md)
- [Projection inventory](projection-inventory.md)
- [Product API contract](product-api-contract.md)
- [Administration and actions](administration-and-actions.md)
- [Global Settings ownership](global-settings-ownership.md)
- [Control Plane information architecture](control-plane-information-architecture.md)
- [Security, history and error semantics](security-history-and-errors.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

## Non-goals

- endpoint, DTO, schema, database, service, UI component or route implementation;
- Product API v2, Genome API, Administration API or direct frontend/backend path;
- Global Settings aggregate, table, store or policy engine;
- client-side authority, precedence, effective-configuration or readiness logic;
- new Agent/Profile/resource/Memory/Delegation/Automation/Activation ownership;
- raw secret output, Memory-content bulk exposure or cross-Tenant inference;
- unrelated navigation redesign or silent resolution of the existing
  Administration IA divergence;
- production, migration, IMP or rollout authority.

```text
REQ-10: COMPLETE / ACCEPTED
REQ-11: READY / GO
Implementation authority: NONE
```
