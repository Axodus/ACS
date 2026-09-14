# REQ-12 Candidate IMP Dependency Plan

Every item is `CANDIDATE / REQUIRES SEPARATE CTO GO`. This plan grants no code,
migration, database, API, UI, deployment or production authority.

| IMP | Scope and intended outcome | Depends on | Exit evidence before next IMP |
| --- | --- | --- | --- |
| `EPIC-17-IMP-01` | Canonical Agent mutation seam, Native/legacy compatibility, head/lifecycle history, Profile presentation contract and legacy Profile capability-preset remediation. | `E17-R12-B01/B02` closed at implementation gate | One authoritative write path; exact Agent reference/history; no Profile-derived grant; compatibility inventory and rollback adapter proven. |
| `EPIC-17-IMP-02` | Typed class-specific effective configuration/Run snapshot plus kind-specific governed-resource history or immutable observations. | IMP-01 accepted | Deterministic serialization/fingerprint, CAS/restart reconstruction, no dual resolver and fail-closed missing history. |
| `EPIC-17-IMP-03A` | Connector/MCP definition boundary, Connection/Credential projection, Channel identity/history and ingress reference semantics. | IMP-02 accepted | Definition/instance/secret/Channel separated; opaque credentials; Tenant and historical tests pass. |
| `EPIC-17-IMP-03B` | Memory Policy resolution and companion Memory record/store/reference contracts, consent, retention/deletion and provenance. | IMP-02 accepted | Memory distinct from runtime state/Knowledge/Evidence; deletion/tombstone and policy/store separation proven. |
| `EPIC-17-IMP-04` | Delegation Grant representation/history, typed attenuation, authority basis, chain/depth/cycle and revocation. | IMP-03A and IMP-03B accepted | `COMPLETE / CTO ACCEPTED / PUBLISHED`; schema 10 canonical; no SubAgent, raw credential/Memory transfer or parallel admission owner. |
| `EPIC-17-IMP-05` | Automation stable identity, immutable authored revisions, lifecycle, target and authority-basis references. | IMP-04 accepted | `CANDIDATE / READY FOR CTO GATE PREPARATION`; CAS/history/events/outbox and exact target semantics remain a separate gate. |
| `EPIC-17-IMP-06` | Trigger/Schedule observations, Activation occurrence/claims, schedule recovery, authority/configuration resolution and recoverable admission handoff. | IMP-05 accepted | One logical occurrence/Activation/Run lineage; retries and cancellation layers separated; OpenClaw remains adapter. |
| `EPIC-17-IMP-07` | Source-faithful Product API projections, owner-routed commands, Administration actions and class-owned Global Settings index. | IMP-03A through IMP-06 accepted | One Product API, Tenant-safe projection/action contracts, redaction and exact historical sources. |
| `EPIC-17-IMP-08` | Trait vocabulary/assertions, Agent presentation-asset binding, Evidence/Governance verification and optional bounded performance views. | IMP-07 and relevant IMP-01/02 history accepted | Traits grant nothing; assets remain referenced; verified assertions retain exact proof; all Genome non-goals enforced. |
| `EPIC-17-IMP-09` | Control Plane `Flow -> Module -> Screen`, including explicit Administration IA compatibility remediation. | IMP-07 and IMP-08 accepted; `E17-R12-C12` explicitly decided | Product API-only UI with explicit loading/empty/blocked/pending/stale/unavailable/redacted states and canonical drill-down. |
| `EPIC-17-IMP-10` | Cross-domain conformance, migration completion evidence, resilience/security validation and rollout-readiness assessment. | IMP-01 through IMP-09 accepted | 76-capability conformance, blocker dispositions, PostgreSQL/restart/recovery evidence and a separate production decision package. |

## Parallel window

`IMP-03A` and `IMP-03B` may execute in parallel only after IMP-02 acceptance.
They must share accepted reference/snapshot/Tenant conventions and record a
blocker instead of changing each other's boundary. IMP-04 waits for both.

## Scope reduction

An IMP may omit a safe-to-defer capability only by recording it as unavailable
or rejected in API, UI, tests and migration. Partial or implicit activation is
not a valid scope reduction.

## Gate discipline

Each IMP needs its own charter, selected ADR/delta dispositions, source and
test inventory, migration/rollback plan, security review, validation commands
and commit. Acceptance of one IMP unlocks planning/execution of its dependent
node only as explicitly stated by the CTO.
