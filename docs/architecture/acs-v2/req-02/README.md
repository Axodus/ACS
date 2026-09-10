# ACS-V2-REQ-02 Architecture Extraction Audit

**Status:** `ARCHITECTURE DISCOVERY COMPLETE / CONDITIONAL GO`
**Audit date:** 2026-09-10
**ACS baseline:** `cd9544131ffb622d407faf266357b4d28598cd16`
**Implementation authorization:** repository inspection, architecture discovery, documentation, ADR proposals and implementation planning only; future PoCs require separate authorization

## Decision

ACS should converge on an **ACS-native Agent Coordination System**, preserving its current control plane and durable runtime while adapting selected design primitives from Agenta and CAMEL.

```text
Agenta contract patterns ─┐
                          ├─> ACS-owned canonical cores ─> existing ACS runtime/governance/economic substrate
CAMEL planning patterns ──┘

Eigent desktop/runtime infrastructure: excluded from the long-term dependency path
OpenClaw and Codex: replaceable executors behind ACS contracts
```

No Agenta, Eigent, or CAMEL production component is approved for direct adoption as-is. No external code was merged in this sprint.

## Deliverables

| Deliverable | Document |
|---|---|
| Agenta Core audit | [agenta-core-audit.md](agenta-core-audit.md) |
| Eigent/CAMEL Core audit | [eigent-camel-core-audit.md](eigent-camel-core-audit.md) |
| ACS Current Core audit | [acs-current-core-audit.md](acs-current-core-audit.md) |
| Capability matrix, unified architecture, canonical specifications, trust boundaries, licensing, ADRs, phases, and backlog | [unified-core-architecture.md](unified-core-architecture.md) |
| Decision record and readiness gate | [decision-record.md](decision-record.md) |
| Cross-audit corrections | [agenta-cross-review.md](agenta-cross-review.md), [eigent-camel-cross-review.md](eigent-camel-cross-review.md), [acs-cross-review.md](acs-cross-review.md) |
| License/provenance inventory | [license-provenance-inventory.md](license-provenance-inventory.md), [machine-readable JSON](license-provenance-inventory.json) |
| Existing baseline/conformance addendum | [baseline-conformance-addendum.md](baseline-conformance-addendum.md) |

Cross-review line references identify draft locations examined at review time. The reconciled [unified architecture](unified-core-architecture.md) and [decision record](decision-record.md) govern the final REQ-02 recommendation where those drafts have since changed. Source-code references remain tied to the inspected snapshots below.

## Required-deliverable coverage

| # | Required deliverable | Final location |
|---:|---|---|
| 1 | Agenta Core Audit | [agenta-core-audit.md](agenta-core-audit.md) |
| 2 | Eigent/CAMEL Core Audit | [eigent-camel-core-audit.md](eigent-camel-core-audit.md) |
| 3 | ACS Current Core Audit | [acs-current-core-audit.md](acs-current-core-audit.md) |
| 4 | Cross-System Capability Matrix | [Unified architecture §2](unified-core-architecture.md#2-cross-system-capability-matrix) |
| 5 | ACS v2 Unified Core Architecture | [Unified architecture §1](unified-core-architecture.md#1-executive-architecture-decision) |
| 6 | Canonical Agent Specification | [Unified architecture §4](unified-core-architecture.md#4-canonical-agent-specification) |
| 7 | Canonical Workforce Specification | [Unified architecture §5](unified-core-architecture.md#5-canonical-workforce-specification) |
| 8 | Workflow / Orchestration Specification | [Unified architecture §6](unified-core-architecture.md#6-workflow-and-coordination-specification) |
| 9 | Runtime / Executor Specification | [Unified architecture §7](unified-core-architecture.md#7-runtime-executor-and-provider-specifications) |
| 10 | Provider Abstraction Specification | [Unified architecture §7](unified-core-architecture.md#7-runtime-executor-and-provider-specifications) |
| 11 | Platform Integration Specification | [Unified architecture §8](unified-core-architecture.md#8-platform-integration-specification) |
| 12 | Evidence / Provenance / Reporting Specification | [Unified architecture §10](unified-core-architecture.md#10-evidence-provenance-and-reporting-specification) |
| 13 | Cost Center Architecture | [Unified architecture §11](unified-core-architecture.md#11-cost-center-architecture) |
| 14 | $Neurons Economic Integration Architecture | [Unified architecture §12](unified-core-architecture.md#12-neurons-economic-architecture) |
| 15 | Security / Trust Boundary Analysis | [Unified architecture §9](unified-core-architecture.md#9-domain-isolation-and-trust-boundaries) |
| 16 | Code Reuse & Licensing Assessment | [Unified architecture §13](unified-core-architecture.md#13-code-reuse-and-licensing-assessment) and [inventory](license-provenance-inventory.md) |
| 17 | ADR Proposals | [Unified architecture §14](unified-core-architecture.md#14-adr-proposals) |
| 18 | Phased Implementation Plan | [Unified architecture §15](unified-core-architecture.md#15-phased-implementation-plan) |
| 19 | Implementation Backlog | [Unified architecture §16](unified-core-architecture.md#16-implementation-backlog) |

## Source snapshots

| System | Revision inspected | Working-tree condition | License conclusion |
|---|---|---|---|
| ACS | `cd9544131ffb622d407faf266357b4d28598cd16` | Baseline was clean before this documentation package | No root license/notice found; establish project terms before combined distribution. |
| Agenta | `204703fc24ff52993be317c7a83e2bd755051d35` (`v0.115.2-93-g204703fc24-dirty`, HEAD contains release `v0.115.3`) | Five pre-existing local modifications | MIT outside `ee/`; Agenta Enterprise License in `ee/`. Exclude `ee/` from reuse. |
| Eigent | `6bb55842f73766f7b219aa5ef5bcf5965f3acdaa` (`v1.0.4-dirty`) | Dirty local checkout | Apache-2.0, subject to notice, changed-file, dependency, and trademark review. |
| CAMEL | installed `camel-ai==0.2.91a7` | Package, not source checkout | Apache-2.0 metadata; exact upstream commit and full NOTICE/SBOM unresolved. |
| AgentsAI/OpenClaw | ACS gitlink `7a073ed87f877df7020ba8f348eb59afe3f64a48` | Manifest names a different, non-fetchable source revision | License proof and reproducible provenance unresolved; code adoption blocked. |

## Readiness

- **REQ-02 acceptance:** **ACCEPT**.
- **Architecture direction:** **GO** for the ACS v2 architecture baseline.
- **Architecture:** ACS-native control, agent, workforce, workflow, runtime, evidence, reporting, cost, and economic boundaries.
- **Reuse:** adapt Agenta schemas and compilation patterns; use CAMEL only as a removable planner/graph-proposal source in a future separately authorized PoC; reject Eigent as a permanent runtime dependency.
- **Migration:** additive contracts and compatibility adapters over current ACS; no big-bang replacement.
- **Provider integration:** **NO-GO** without separate authorization, including Codex, OpenClaw, direct-model and external provider integration.
- **Next phase:** freeze ACS-native contracts and execute the dependency-ordered implementation plan.
- **Implementation readiness:** **CONDITIONAL GO** for future contract-first work and isolated non-production PoCs only after separate authorization and named gates.
- **No-go:** production migration, runtime replacement, direct external-code merge, global multi-host claims, credential changes, or financial settlement execution.

`ACS-BLOCKER-014` remains open. The most recent recorded full runtime suite, run on September 9, 2026, compiled successfully but finished with 680 tests: 673 passing, five failing, and two skipped. This sprint did not modify or rerun that workstream.
