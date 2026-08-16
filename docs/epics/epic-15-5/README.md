# EPIC-15.5 — ACS Operational Readiness & Gap Elimination

**Status:** **CLOSED WITH CERTIFICATION LIMITS** — 2026-08-16
**Certified topology:** `PRODUCTION_LIKE_SINGLE_HOST`
**Global production claim:** **NOT CERTIFIED**

## Mission outcome

EPIC-15.5 changed ACS acceptance from “a contract or screen exists” to “an operator can safely run, diagnose, recover and govern the supported system”. The certified journey is:

```text
trusted authentication
→ Tenant administration and governance
→ Agent composition and write-only secret references
→ readiness and governed deployment
→ independent remote execution
→ durable ownership, fencing and recovery
→ external telemetry and diagnostics
→ browser-supported remediation and audit
→ production-like health verification and rollback
```

A01 established 24 findings. AEES-H closed the register with 17 `RESOLVED`, 7 `ACCEPTABLE_DEFERRED` and 0 `OPEN_BLOCKER` inside the certified topology. The terminal register is [operational-gap-inventory.md](./operational-gap-inventory.md), and the normative decision is [epic-15-5-closure-report.md](./epic-15-5-closure-report.md).

## Final readiness

| Level | Certified topology | Global claim |
| --- | --- | --- |
| Development Ready | **READY / CERTIFIED** | **READY** |
| Integration Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** |
| Operational Ready | **READY / CERTIFIED** | **PARTIALLY_CERTIFIED** |
| Production Ready | **READY for `PRODUCTION_LIKE_SINGLE_HOST`** | **NOT_CERTIFIED** |

The certified topology is one active Control Plane host with independent worker processes, durable local authoritative stores, an independent OTLP receiver process and an independent health/rollback-capable target process. H also proved contention/single-winner behavior with multiple local Control Plane contexts/processes where the store contract supports it.

## Milestone outcomes

| Milestone | Result | Delivered boundary |
| --- | --- | --- |
| A — Discovery & Baseline | **PASS** | 24 verified findings and readiness baseline |
| B — Durable State & Adapters | **PASS WITH TOPOLOGY LIMITS** | durable administration/audit, Vault boundary, durable economics/settlement |
| C — Identity, Security & Edge | **PASS WITH TOPOLOGY LIMITS** | trusted OIDC/JWT identity, hardened edge and real shared-local limiter |
| D — Distributed Runtime & Recovery | **PASS WITH TOPOLOGY LIMITS** | independent workers, durable jobs/leases/fencing and crash recovery |
| E — Observability & Diagnostics | **PASS WITH TOPOLOGY LIMITS** | structured telemetry, external-process OTLP and dependency-aware diagnostics |
| F — Operational UX | **PASS** | supported Agent, execution, recovery, operations and Tenant browser journeys |
| G — Production Deployment Gate | **PASS WITH TOPOLOGY LIMITS** | aggregate production readiness, governance, target health and rollback |
| H — Full-System Closure | **PASS WITH ENVIRONMENT LIMITATIONS** | full regression, terminal findings and certified/global claim separation |

## H acceptance summary

- complete serial suite: **569/569 PASS**, 92 files;
- concurrent B–G core: **47/47 PASS**;
- browser: **56/56 route-viewports PASS** across four viewports;
- accessibility, horizontal overflow, page errors and unexpected console errors: **0**;
- security and cross-Tenant violations: **0**;
- worker crash, Control Plane restart, fencing, stale/duplicate result, orphan recovery and cancellation race: **PASS**;
- production readiness deny/allow, deployment, health, degradation and rollback: **PASS**;
- no-emit and writable-path root/static builds: **PASS**;
- official repository emit: `ENVIRONMENT_BLOCKER` (`TS5033/EROFS`), not a product compile failure.

Evidence root: `/tmp/acs-epic15-5-aees-h-evidence/manifest.json`.

## Production guarantees

Within the certified topology, ACS proves:

- signed/validated identity before Tenant or platform authority;
- Tenant-scoped governance and isolation;
- fail-closed production adapter selection;
- restart-survivable operational state;
- durable remote execution ownership, leases and fencing;
- deterministic crash/retry/cancellation recovery;
- structured logs, metrics, traces and external-process export;
- dependency-aware readiness and operator diagnostics;
- supported operational browser journeys;
- explicit production governance/readiness, verified health and rollback.

## Explicit non-guarantees

EPIC-15.5 does not certify live managed IdP/Vault availability or HA, provider-managed workload identity, networked multi-host authoritative stores, a global limiter, cross-host workers/Control Planes, multi-region recovery, a managed telemetry backend, a real cloud target, unlimited fleet scale, billing or SCIM.

Development adapters remain available only through explicit development/test composition. Production does not silently fall back to mock identity, memory/filesystem secrets, process-local runtime, local worker, memory limiter, disabled telemetry or sandbox target.

## Document map

1. [epic-15-5-closure-report.md](./epic-15-5-closure-report.md) — final certification decision.
2. [operational-gap-inventory.md](./operational-gap-inventory.md) — all 24 terminal findings.
3. [production-readiness-baseline.md](./production-readiness-baseline.md) — A01 baseline and final readiness by dimension.
4. [architecture-gap-review.md](./architecture-gap-review.md) — final contract/adapter/proof classification.
5. [ux-operational-audit.md](./ux-operational-audit.md) — final operator journey status.
6. [browser-acceptance.md](./browser-acceptance.md) — H browser evidence.
7. [regression-inventory.md](./regression-inventory.md) — full-system coverage.
8. [EPIC-15.5_Strategic_Operational_Plan.md](./EPIC-15.5_Strategic_Operational_Plan.md) — milestone sequence and final outcome.
9. [stories.md](./stories.md) — closed story/gate inventory.
10. [milestones/README.md](./milestones/README.md) — A–H index and reports.
11. [milestones/AEES-H-full-system-production-acceptance-closure.md](./milestones/AEES-H-full-system-production-acceptance-closure.md) — H01/H02/H03 evidence.
12. [AGENTS.md](./AGENTS.md) — local execution rules.

## Closure rule for future work

Any expansion beyond `PRODUCTION_LIKE_SINGLE_HOST` must be treated as a new certification target. The seven deferred provider/topology findings cannot be described as resolved without live evidence for the expanded topology.
