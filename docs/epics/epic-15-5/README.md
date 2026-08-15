# EPIC-15.5 — ACS Operational Readiness & Gap Elimination

**Status:** Milestone B in progress — Sprint B01 complete on 2026-08-15

**Readiness conclusion:** ACS is **Development Ready**, more completely **Integration Ready** for Tenant Administration, and **not Operational Ready or Production Ready**.

## Mission

EPIC-15.5 changes the acceptance question from “does a contract or surface exist?” to “can an operator run the platform safely through supported paths?”. Its target journey is:

```text
authenticate
→ administer tenants
→ create and configure agents
→ assign capabilities, tools and secrets
→ validate readiness
→ deploy
→ execute
→ observe and diagnose
→ recover
→ inspect audit and economics
```

The current repository contains substantial domain, API, governance and UX foundations. A01 found that the active composition still relies on caller-supplied mock identity, process-local authoritative state, local-only execution, development secret and settlement adapters, and incomplete operator journeys. Those facts prevent an operational or production claim.

## A01 outcome

A01 verified **24 consolidated findings**:

| Severity | Count |
| --- | ---: |
| BLOCKER | 8 |
| CRITICAL | 4 |
| HIGH | 9 |
| MEDIUM | 2 |
| LOW | 1 |

The canonical source is [operational-gap-inventory.md](./operational-gap-inventory.md). Findings are evidence-backed and deduplicated by root cause. In-memory test doubles, local development adapters and the sandbox gate are not defects by themselves; the gap is their use as the only or active operational path without a certified production alternative.

## B01 outcome

B01 added an aggregate-specific durable administrative adapter for Tenant, Membership/Ownership, Governance/Entitlements/Limits and the shared administrative audit stream. The shipped HTTP server selects this adapter by default, while programmatic tests may still opt into explicit in-memory repositories. Restart tests prove preservation of revisions, timestamps, ownership, governance configuration and audit correlation.

The adapter is a single-node atomic filesystem snapshot. It is **not** a shared production database and has no cross-process locking, migrations, retention or multi-writer proof. Therefore `ACS-ORG-001` and `ACS-ORG-009` are only **PARTIALLY_RESOLVED**.

B01 also resolved `ACS-ORG-008`: the real HTTP entry handler and CORS preflight accept `GET`, `POST`, `PUT`, `PATCH` and `DELETE`; Tenant Administration `PUT`/`DELETE` operations execute through the real server; and runtime `start`/`stop` handlers are reachable before unsupported-operation guards. Production identity and broader edge hardening remain Milestone C work.

## Principles

- **Evidence before claims.** Contracts and unit tests do not prove operational readiness.
- **Durable truth before scale.** Authoritative state must survive restart and be shareable across replicas.
- **Trusted identity before authority.** Tenant governance is only safe when the incoming principal is authenticated.
- **Remote proof before distributed claims.** A worker interface or local worker is not remote dispatch.
- **Recovery is part of operation.** Detection without a supported remediation path is incomplete.
- **One readiness vocabulary.** Development, integration, operational and production readiness are distinct gates.
- **No premature feature work.** A01 documents and sequences gaps; it does not replace adapters or remove safety gates.

## Scope and non-goals

A01 covers repository-wide discovery, state and adapter inventory, identity/edge review, runtime and deployment flow, economics, audit, observability, Control Plane journeys, recovery and test evidence.

A01 does not implement OIDC, a durable database, managed secrets, a broker, remote workers, exporters, billing, metering, production deployment, or new UX. Billing, SCIM, generic IAM, arbitrary policy languages and a generic observability platform remain outside the baseline unless a future milestone proves they are required for an approved operational journey.

## Document map and reading order

1. [production-readiness-baseline.md](./production-readiness-baseline.md) — current readiness by dimension, state and adapter inventories.
2. [operational-gap-inventory.md](./operational-gap-inventory.md) — canonical findings and evidence.
3. [architecture-gap-review.md](./architecture-gap-review.md) — contract versus implementation versus production proof.
4. [ux-operational-audit.md](./ux-operational-audit.md) — supported, partial and blocked operator journeys.
5. [EPIC-15.5_Strategic_Operational_Plan.md](./EPIC-15.5_Strategic_Operational_Plan.md) — sequencing, gates and definition of done.
6. [stories.md](./stories.md) — implementation-ready stories.
7. [milestones/README.md](./milestones/README.md) — milestone consumption order and exit evidence.
8. [milestones/B01-durable-control-plane-state-http-contract.md](./milestones/B01-durable-control-plane-state-http-contract.md) — implemented persistence and HTTP compatibility evidence.
9. [AGENTS.md](./AGENTS.md) — local execution rules.

## Milestone map

| Milestone | Outcome |
| --- | --- |
| A | Verified system-wide baseline and executable backlog |
| B | **IN PROGRESS:** single-node durable administration delivered; production/shared adapters remain |
| C | Trusted identity, authorization chain and edge controls |
| D | Remote dispatch, durable jobs and recovery semantics |
| E | External observability and dependency-aware readiness |
| F | Complete supported operator journeys and remediation UX |
| G | Certified production deployment gate and target path |
| H | Restart, multi-replica, security, browser and recovery certification |

## EPIC exit criteria

EPIC-15.5 can close only when the operational journey is supported without code edits, direct storage manipulation, forged identity, process-local authoritative truth, restart as remediation or hidden backend-only steps. Production readiness additionally requires trusted identity, durable shared state, managed secrets, remote execution proof, external diagnostics, safe deployment/recovery and reproducible acceptance evidence.

## Baseline relationship

EPIC-15.5 does not reopen the stabilized domain and UX decisions of EPIC-10, EPIC-11, EPIC-12, EPIC-14 or EPIC-15. It distinguishes their valid contract/surface acceptance from production operation. EPIC-15 tenant isolation and governance remain invariants; EPIC-14 browser acceptance remains valid for the certified UI build; neither substitutes for durable state, trusted identity or distributed runtime proof.
