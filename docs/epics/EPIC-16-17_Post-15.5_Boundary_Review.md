# EPIC-16 / EPIC-17 Post-15.5 Boundary Review

**Status:** `PLANNING_ONLY`

**Review date:** 2026-08-17

**Imported baseline:** `4006e6c`

**Implementation authorization:** none

## 1. Executive conclusion

The repository does not contain a canonical EPIC-16 or EPIC-17 planning
package. No mission, strategic plan, boundary review, stories, milestone index
or closure predecessor for either EPIC can be recovered from the reachable Git
history.

This document therefore does not invent or retroactively attribute an original
mission to EPIC-16 or EPIC-17. It establishes the planner-facing boundary that
must be approved before either normative package or first implementation sprint
is created.

The post-15.5 certification line is frozen as follows:

```text
POST-15.5 / AEES-SH: PASS
POST-15.5 / AEES-MH:
  MH02: PASS
  MH03: NOT CERTIFIED — infrastructure gated
```

Commit `4006e6c` is the resumption marker for a future physical multi-host
attempt. EPIC-16 and EPIC-17 must not absorb MH03 merely to change that result.

## 2. Source recovery result

The review inspected the current documentation tree, reachable branches and
commit history.

| Source | Result | Planning consequence |
| --- | --- | --- |
| `docs/epics/epic-16/` | absent | no canonical EPIC-16 mission exists in the repository |
| `docs/epics/epic-17/` | absent | no canonical EPIC-17 mission exists in the repository |
| reachable `dev` and `master` history | no EPIC-16/17 package | no deleted normative package can be reconstructed from reachable commits |
| `git log -S EPIC-16` | only `3a2d1fa`, which records that the package was absent | confirms absence rather than a prior plan |
| `git log -S EPIC-17` | no result | no historical repository source was found |
| unreachable object scan | no recoverable package | no dangling planning commit was found |

If an external roadmap, issue tracker or unpublished planning document defines
the original missions, it must be imported explicitly before its contents are
treated as normative.

## 3. Normative sources used by this review

This review derives current boundaries from:

- [EPIC-12 closure](./epic-12/epic-12-closure-report.md);
- [EPIC-13 closure](./epic-13/epic-13-closure-report.md) and
  [financial boundary review](./epic-13/boundary-review.md);
- [EPIC-14 closure](./epic-14/epic-14-closure-report.md);
- [EPIC-15 closure](./epic-15/epic-15-closure-report.md);
- [EPIC-15.5 closure](./epic-15-5/epic-15-5-closure-report.md) and
  [terminal gap inventory](./epic-15-5/operational-gap-inventory.md);
- [AEES-SH readiness](../post-15-5/aees-sh/shared-state-readiness.md);
- [MH02 provider certification](../post-15-5/aees-mh/MH02-managed-provider-certification.md);
- [MH03 terminal decision](../post-15-5/aees-mh/MH03-global-production-decision.md);
- [AEES-MH global readiness decision](../post-15-5/aees-mh/global-readiness-decision.md).

Historical EPIC documents remain authoritative for what they delivered and
explicitly deferred. Post-15.5 documents may strengthen the current platform
baseline, but they do not rewrite historical EPIC claims.

## 4. Frozen certification boundary

The following classification is an input to successor planning, not work for
EPIC-16 or EPIC-17:

| Capability | Current classification |
| --- | --- |
| production-like single-host operation | certified |
| shared PostgreSQL authority | certified for dual independent processes |
| dual Control Plane shared-state semantics | certified on one physical host |
| external OIDC, Vault, edge and OTLP boundaries | certified as `EXTERNAL_PROCESS_PROVEN` |
| physical multi-host | not certified |
| cross-host workers and partitions | not certified |
| host-level failover | not certified |
| provider and database HA | not certified |
| global Production Ready | not certified |

The missing physical topology is a certification-infrastructure dependency. It
is not a generic functional backlog item and must remain in the lateral
POST-15.5 / AEES-MH line.

## 5. Consolidated domains that successor EPICs must reuse

EPIC-16 and EPIC-17 start from a stronger platform than EPIC-12 through
EPIC-15 originally assumed.

| Domain or boundary | Current state | Successor rule |
| --- | --- | --- |
| Tenant administration | lifecycle, membership, authority and UX are implemented | consume canonical services and Product API; do not recreate tenant truth |
| Governance | policies, entitlements, limits, receipts and selected enforcement are implemented | extend through governed actions; do not add controller-local policy truth |
| Audit | shared administrative audit and correlated evidence exist | append authoritative events; do not replace audit with telemetry |
| Identity and edge | trusted OIDC/JWKS identity, signed platform authority and hardened HTTP edge exist | reuse trusted context; do not restore header or development identity fallbacks |
| Secrets | Vault boundary, shared metadata, rotation/revocation and outage semantics exist | persist references and versions only; never create a second secret catalog |
| Persistence | async repository boundaries and shared PostgreSQL production composition exist | new authoritative state must support the shared profile and fail closed |
| Runtime | durable jobs, assignments, workers, leases, results and cancellation exist | integrate with the runtime lifecycle; do not create a parallel executor |
| Recovery | fencing, stale-owner rejection, idempotency and recovery coordination exist | preserve ownership semantics for every new workload |
| Observability | structured logs, metrics, traces, OTLP, readiness and diagnostics exist | instrument extensions through the existing telemetry/dependency boundaries |
| Operational UX | Agent, execution, worker, operations, Tenant and deployment journeys exist | extend the existing Control Plane and Product API; no manual-API normal path |
| Deployment governance | target capability, aggregate readiness, explicit production allow, health and rollback exist | add target/workload checks to the existing evaluator; no client-side authority |
| Economics and settlement | durable, shared, idempotent operational economics exist | treat these as financial evidence primitives, not proof of billing readiness |

## 6. Deferred-scope disposition after EPIC-15.5

The earlier backlog must be reclassified instead of copied into a successor
EPIC unchanged.

| Earlier deferred area | Post-15.5 disposition | Successor treatment |
| --- | --- | --- |
| full production authentication boundary | `DELIVERED` within certified provider/topology limits | prerequisite, not an EPIC mission |
| production secrets provider | `DELIVERED` as external-provider boundary; HA not certified | prerequisite; HA remains lateral certification |
| production launch/deployment path | `DELIVERED` for the certified topology | prerequisite, not an EPIC mission |
| tenant administration and governance | `DELIVERED` | consolidated domain |
| runtime orchestration, durable ownership and recovery | `MATERIALLY_DELIVERED` | only advanced scheduling/fleet automation remains |
| distributed tracing backend | `DELIVERED` as external OTLP boundary | managed retention, alert routing and SLO tooling remain |
| incident diagnostics and safe remediation | `MATERIALLY_DELIVERED` | incident lifecycle/automation remains a distinct candidate |
| advanced worker fleet management and autoscaling | `NOT_DELIVERED` | separate product/operations candidate; not MH03 evidence |
| invitations and identity-provider lifecycle workflows | `NOT_DELIVERED` | enterprise identity lifecycle candidate |
| SCIM and generic IAM/RBAC/ABAC | `NOT_DELIVERED` and intentionally excluded | requires a narrowly approved mission; do not generalize existing authority |
| billing, pricing, invoices, payments and tenant billing | `BOUNDARY_ONLY` | strongest documented successor product candidate |
| settlement/reconciliation execution and financial providers | `PARTIALLY_DELIVERED_FOUNDATION` | reuse shared economics; production financial operations remain open |
| accounting, tax and compliance certification | `NOT_DELIVERED` | explicit legal/provider decision required before implementation |
| infrastructure provisioning and provider repair | `EXTERNAL_RESPONSIBILITY` | keep outside normal Control Plane unless separately approved |
| global multi-host, provider HA and remote target certification | `INFRASTRUCTURE_GATED` | frozen POST-15.5 certification branch |
| WAF/CDN, multi-region and formal DR | `OUTSIDE_CURRENT_PRODUCT_CONTRACT` | no implicit successor scope |
| generic workflow engine | `OUTSIDE_EPIC-15.5_CONTRACT` | only promote with a separate product mission |

## 7. Assumptions that are now obsolete

Any prior or external EPIC-16/17 proposal must be revised if it assumes that it
still needs to:

- make ACS operational as a general prerequisite;
- introduce the first durable repository or production secret boundary;
- create the first trusted identity boundary;
- replace same-process execution;
- add the first lease, fencing or recovery mechanism;
- add the first external telemetry exporter;
- create basic runtime/operator diagnostics;
- create the first supported Control Plane operational journey;
- remove a blanket sandbox-only deployment rule;
- make authoritative repositories network-I/O capable;
- introduce shared PostgreSQL authority for the first time.

These capabilities may require extension for a new domain, but their existing
contracts and invariants must be consumed rather than reimplemented.

## 8. Candidate successor mission clusters

Because the original missions are absent, the following are planning
hypotheses, not approved EPIC definitions.

### Candidate A — Production Financial Operations

This is the strongest documented successor boundary. EPIC-13 intentionally
stopped at read-only financial truth, billing intent, provider candidates,
tenant accountability and no-money-movement claim discipline. Later work made
economics and settlement durable/shared but did not implement billing,
invoicing, payment capture, subscriptions, tax or accounting.

Potential mission:

> Turn the EPIC-13 financial boundary into explicitly governed production
> financial operations without weakening Tenant, audit, secret, economics or
> production-readiness authority.

Required executive decisions before planning:

- whether ACS owns billing or only exports authoritative usage/settlement;
- whether real money movement is in scope;
- provider and credential model;
- invoice, tax and jurisdiction boundary;
- tenant payer/account responsibility;
- refunds, disputes and reconciliation ownership;
- compliance and accounting integration claims.

### Candidate B — Enterprise Identity Lifecycle and Provisioning

Trusted authentication is implemented, but login product, invitations,
directory lifecycle, SCIM and enterprise provisioning are not.

Potential mission:

> Add governed identity lifecycle and enterprise provisioning while preserving
> ACS-canonical Tenant membership and platform authority.

This candidate must not replace signed identity validation, infer membership
from IdP claims or become a generic authorization rewrite.

### Candidate C — Operational Reliability Automation and Fleet Operations

Diagnostics, retry/cancel, recovery, telemetry and worker visibility exist.
Alert routing, incident lifecycle, SLO management, capacity provisioning,
draining automation and fleet scaling do not.

Potential mission:

> Convert operational evidence into governed reliability and capacity workflows
> without redesigning the durable runtime or claiming infrastructure control
> that ACS does not possess.

This candidate must remain distinct from MH03. Product fleet workflows can be
implemented in a bounded topology; physical host-failure certification still
requires the external infrastructure defined by AEES-MH.

## 9. Recommended sequencing decision

The repository evidence supports the following planning recommendation:

1. Use **Candidate A — Production Financial Operations** as the leading
   EPIC-16 hypothesis because it has the oldest and most complete dedicated
   boundary package, explicit open decisions and clear unfinished operator
   value.
2. Do not assign EPIC-17 yet. Choose between **Candidate B** and **Candidate C**
   using the current product roadmap; combining them would create an incoherent
   identity-plus-infrastructure EPIC.
3. Keep marketplace, exchange, generic workflow, multi-region and global HA
   claims unassigned until a dedicated mission is approved.

This recommendation becomes normative only after explicit planner/product
approval or import of an external canonical roadmap.

## 10. Changed prerequisites

Any approved EPIC-16/17 package should import these prerequisites:

```text
EPIC-10 domain contracts
EPIC-14 Control Plane information architecture
EPIC-15 Tenant authority and governance
EPIC-15.5 operational/production-like certification
AEES-SH shared authoritative state
MH02 external-provider composition
```

It should not require MH03 or global multi-host certification unless the mission
itself cannot be truthfully delivered in the certified topology.

New authoritative state must work with the shared production profile. New
operator actions must use Product API authority, audit, telemetry, readiness,
Tenant isolation and production governance from the beginning.

## 11. Cross-EPIC boundary

Until missions are approved:

| Work | Owner |
| --- | --- |
| physical multi-host evidence, partitions, host failover and provider HA | POST-15.5 / AEES-MH resumed from `4006e6c` |
| shared-state regressions required by new features | continuous hardening in the active functional EPIC |
| production financial operations | EPIC-16 candidate |
| enterprise identity lifecycle/provisioning | EPIC-17 candidate option |
| incident/SLO/fleet automation | EPIC-17 candidate option |
| existing runtime, readiness, diagnostics, deployment and Tenant journeys | consolidated platform capability |

EPIC-16/17 acceptance may run on the certified bounded topology. It must report
that topology honestly and must not promote the global claim.

## 12. No-scope-expansion guardrails

Before mission approval, do not:

- create `docs/epics/epic-16/` or `docs/epics/epic-17/` as if a mission were
  already canonical;
- implement code, routes, schemas or UI for a candidate cluster;
- resume MH03 with same-host processes or containers;
- reopen EPIC-15.5 findings or rewrite its historical closure;
- duplicate Tenant, governance, runtime, telemetry, deployment or economics
  authority;
- turn a candidate list into readiness or production claims.

## 13. Required planner decisions

| ID | Decision | Status |
| --- | --- | --- |
| BR-01 | Import an external canonical EPIC-16/17 roadmap, if one exists | `OPEN` |
| BR-02 | Approve or reject Production Financial Operations as EPIC-16 mission | `OPEN` |
| BR-03 | Select Enterprise Identity Lifecycle or Reliability/Fleet Operations as the next independent mission | `OPEN` |
| BR-04 | Decide whether any financial provider, money movement, tax or accounting scope is authorized | `OPEN` |
| BR-05 | Confirm MH03 remains a lateral infrastructure-gated certification line | `PROPOSED_CONFIRMED_BY_BASELINE` |

## 14. Next authorized deliverable

After BR-01 and BR-02 are resolved, create a planning-only EPIC-16 package in
the established repository format:

```text
docs/epics/epic-16/
  README.md
  AGENTS.md
  EPIC-16_Strategic_Operational_Plan.md
  architecture.md
  contracts.md
  boundary-review.md
  stories.md
  planner-handoff.md
  milestones/README.md
```

The package must organize work by operational flow, identify consolidated
domains, preserve explicit executive decisions and name the first bounded
milestone. Code implementation remains unauthorized until that package is
approved.

EPIC-17 should receive its own package only after its mission is selected. It
must not be created as a placeholder containing both remaining candidate
clusters.

## 15. Review result

```text
EPIC-16 canonical mission recovered: NO
EPIC-17 canonical mission recovered: NO
Post-15.5 boundary review: COMPLETE
Functional implementation authorized: NO
MH03 resumed: NO
Recommended next decision: approve or replace the EPIC-16 financial-operations hypothesis
```
