# REQ-12 Consolidated Blocker Analysis

## Raw inventory

REQ-01 through REQ-11 define `84` unique blocker IDs. They remain valid and are
listed individually in [Raw blocker traceability](blocker-traceability.md).
Consolidation groups repeated symptoms under one cause; it never closes or
deletes an inherited blocker.

## Consolidated causes

| Cause | Consolidated problem | Raw blockers | Candidate resolution | Classification |
| --- | --- | ---: | --- | --- |
| `E17-R12-C01` Agent seam and presentation history | Native/legacy mutation, lossy projection, head/lifecycle history and Profile capability semantics still coexist. | 11 | `IMP-01` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C02` Effective configuration and resource history | Typed deterministic snapshot, fingerprint relation and per-resource durable history/observations are incomplete. | 13 | `IMP-02` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C03` Integration definition and Channel | Connector/MCP/Connection/Credential/Channel separation, history and ingress causation are unimplemented. | 6 | `IMP-03A` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C04` Memory policy/store | Policy resolution, records/store, consent/deletion, shared references and snapshot integration are absent. | 6 | `IMP-03B` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C05` Delegation authority | Grant history, attenuation resolver, chain/cycle, revocation and legacy metadata treatment are absent. | 6 | `IMP-04` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C06` Automation identity/history | Canonical identity/revision/lifecycle/CAS/target and authority handoff contracts are absent. | 7 | `IMP-05` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C07` Activation and admission | Occurrence identity/claims, schedule recovery, authority/config resolution and recoverable admission handoff are absent. | 11 | `IMP-06` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C08` Evidence and economic correlation | New subjects/correlation for Delegation, Automation, Activation and verification are incomplete; existing ledgers remain authoritative. | 5 | owning IMP plus `IMP-10` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C09` Product API and Administration | Common projection metadata, owner-routed actions, domain routes and source-faithful views are absent. | 6 | `IMP-07` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C10` Genome/assets/verification | Trait/assertion, asset binding, verification and bounded performance-view contracts are absent. | 7 | `IMP-08` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C11` Tenant, security and privacy | Cross-Tenant grants/lookups, consent, deletion, redaction and future-domain negative cases are unproven. | 4 | every owning IMP and `IMP-10` | `BLOCKS SPECIFIC IMP` |
| `E17-R12-C12` Control Plane IA | EPIC-14 places Administration under System while the current UI presents it as a primary domain. | 2 | explicit decision in `IMP-09` charter | `BLOCKS SPECIFIC IMP` |

## Blockers before the first implementation

| Blocker | Finding | Required closure | Classification |
| --- | --- | --- | --- |
| `E17-R12-B01` | No exact IMP-01 charter has selected the candidate deltas/ADRs, bounded migration mode, acceptance tests and rollback obligations. | CTO accepts a concrete IMP-01 plan; architecture acceptance alone is insufficient. | `BLOCKS FIRST IMPLEMENTATION` |
| `E17-R12-B02` | Repository status sources disagree on `ACS-BLOCKER-014`: the canonical blocker register says `HIGH / OPEN`, while remediation evidence recommends `RESOLVED` and records a passing isolated suite/PostgreSQL revalidation. | Governing authority reconciles status and a future implementation gate records the accepted current validation baseline. | `BLOCKS FIRST IMPLEMENTATION` |

`E17-R12-B02` does not reopen or close `ACS-BLOCKER-014`. It preserves the
evidence conflict and prevents an unsupported all-green readiness claim.

## Deferral and escalation

The raw traceability register identifies four capabilities that may remain
fail-closed and be deferred safely: cross-Tenant Delegation, unsupported
Workflow Automation targets, unsupported Workflow Activation targets and
optional performance-derived Genome views. Deferral must preserve the
rejection/unsupported behavior and cannot leave a partially active path.

No architecture or CEO escalation is active. Architecture escalation becomes
mandatory if a proposed resolution changes Agent identity/lineage, Workforce,
Workflow, Run/Task/Assignment/Attempt, Runtime leases/fencing/recovery,
Evidence/Economics authority, shared persistence, Product API or Governance
incompatibly. CEO escalation becomes necessary only if rejected inheritance,
mutation, breeding, reputation, NFT, marketplace, royalties, ownership or
Genome economics reenter scope.
