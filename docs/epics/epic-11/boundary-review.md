# EPIC-11 Boundary Review

## EPIC-11 belongs here

- Operational Awareness
- Agent Lifecycle
- Composition Surface
- Operational Execution
- Operational Evidence
- basic Economics visibility
- Control Plane Hardening

## Candidate for EPIC-12

- advanced multi-tenancy administration
- production-grade authentication and RBAC
- sensitive production secrets administration
- advanced observability and alerting
- fleet-scale worker management
- billing and pricing productization
- compliance and governance expansion beyond the initial control plane surface

## Continuous hardening

- loading / empty / error / pending states
- long-running operation handling
- stale state reconciliation
- retry and recovery
- audit correlation
- UX consistency
- regression validation

## Open decision

The relation between Economics and Operational Evidence is intentionally left open:

- keep Economics as a dedicated flow if the Product API exposes it as an operational domain
- treat Economics as part of the evidence layer if that yields a better control-plane model

The planner and later execution agents MUST justify the choice explicitly before implementation locks it in.

## EPIC-10 readiness dependency

EPIC-11 assumes the EPIC-10 baseline exists and remains valid for:

- Product API exposure
- governed agent revisions
- runtime lifecycle concepts
- execution planning concepts
- economic contract concepts
- evidence correlation

If a capability depends on unfinished EPIC-10 readiness work, it MUST be flagged as blocked or deferred instead of being reimplemented here.
