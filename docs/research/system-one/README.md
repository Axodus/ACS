# TypeSafe / System One — ACS Architecture Fit Research

**Request:** `ACS-RESEARCH-REQ-02`
**Status:** `COMPLETE / RESEARCH-ONLY / NON-NORMATIVE`
**Research date:** 2026-09-17
**Implementation authority:** `NONE`

## Executive conclusion

```text
System One may provide judgments.
ACS retains authority.
```

The research supports adopting the **pattern** of bounded atomic judgments,
typed outputs, explicit uncertainty, deterministic composition, and policy-owned
escalation. That finding is independent from adopting TypeSafe/System One.

System One appears sufficiently differentiated to justify a narrowly scoped,
non-production evaluation of judgment workloads. The evidence does not justify
making it an ACS dependency, canonical evidence store, admission authority,
workforce/workflow orchestrator, Genome evaluator, reputation system, or
economic decision-maker.

The recommended posture is therefore:

| Scope | Classification |
| --- | --- |
| Typed atomic judgment pattern | `PATTERN ONLY` |
| Confidence and escalation pattern | `PATTERN ONLY` |
| Evidence-quality / output-review evaluation | `POC RECOMMENDED` |
| Runtime or Admission authority | `NO-GO` |
| Genome fitness, reputation, or economic value | `NO-GO` |
| Workforce/workflow input | `POC RECOMMENDED`, input only |
| System One as production provider/dependency | `NO-GO NOW`; future `INTEGRATION CANDIDATE` only after gates |

## Research boundary

This package does not install TypeSafe/System One, add dependencies, request or
store credentials, make provider calls, change ACS source, change schemas,
modify Product API, alter Runtime or Admission, change Evidence or Genome
semantics, or implement a PoC.

All System One statements are classified as one of:

- **DOCUMENTED FACT** — directly described by official TypeSafe material;
- **VENDOR CLAIM** — capability or benefit asserted by the vendor, not proven by ACS;
- **ACS REPOSITORY FACT** — observed in ACS contracts, instructions, or reports;
- **ENGINEERING INFERENCE** — reasoned fit or risk based on those facts;
- **UNKNOWN** — requires a separately authorized validation gate.

## Package

- [01 — System One concepts](./01-system-one-concepts.md)
- [02 — ACS baseline](./02-acs-baseline.md)
- [03 — Fit and ownership boundaries](./03-fit-and-ownership-boundaries.md)
- [04 — Judgment pipeline, Runtime, Evidence, and Genome](./04-judgment-runtime-evidence-genome.md)
- [05 — Workforce, Workflow, Governance, Product API, and operations](./05-workforce-governance-product-operations.md)
- [06 — Security, privacy, sovereignty, and lock-in](./06-security-privacy-sovereignty.md)
- [07 — Provider-neutral abstraction research](./07-provider-neutral-abstraction.md)
- [08 — PoC candidates and gates](./08-poc-candidates.md)
- [09 — Decision matrix and CTO recommendation](./09-decision-matrix-recommendation.md)
- [REQ-02A — PoC readiness and evaluation design](./req-02a/README.md)
- [REQ-02B — PoC parameter freeze](./req-02b/README.md)

## Source register

Primary TypeSafe sources reviewed:

- [TypeSafe introduction](https://docs.typesafe.ai/introduction)
- [TypeSafe documentation index](https://docs.typesafe.ai/llms.txt)
- [System One concept](https://docs.typesafe.ai/concepts/system-one)
- [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe state](https://docs.typesafe.ai/concepts/state)
- [TypeSafe primitives](https://docs.typesafe.ai/concepts/primitives)
- [TypeSafe confidence](https://docs.typesafe.ai/concepts/confidence)
- [TypeSafe API](https://docs.typesafe.ai/concepts/api)
- [TypeSafe privacy policy](https://typesafe.ai/legal/privacy-policy)
- [TypeSafe data processing addendum](https://typesafe.ai/legal/data-processing)
- [TypeSafe master customer agreement](https://typesafe.ai/legal/mca)
- [TypeSafe workflow evaluations](https://evals.typesafe.ai/)
- [Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TypeSafe JavaScript SDK repository](https://github.com/typesafe-ai/typesafe-sdk-js)
- [TypeSafe Python SDK repository](https://github.com/typesafe-ai/typesafe-sdk-python)
- [TypeSafe System One adapter repository](https://github.com/typesafe-ai/system-one-adapter-python)

Primary ACS sources reviewed:

- [`AGENTS.md`](../../../AGENTS.md)
- [ACS status](../../../.instructions/STATUS.md)
- [ACS security](../../../.instructions/SECURITY.md)
- [ACS authority boundary matrix](../../../.instructions/ACS_AUTHORITY_BOUNDARY_MATRIX.md)
- [ACS v2 target architecture](../../architecture/acs-v2/target-architecture.md)
- [ACS v2 canonical contracts](../../architecture/acs-v2/canonical-contracts.md)
- [ACS v2 provider evaluation](../../architecture/acs-v2/provider-evaluation.md)
- [ACS v2 architecture discovery baseline](../../../.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md)
- [Agentic Genetics terminology](../agentic-genetics/01-concepts-and-terminology.md)
- [Agentic Genetics evidence and fitness boundary](../agentic-genetics/06-evidence-performance-and-fitness.md)

## Required CTO/CEO decision separation

This report recommends a research posture only. CTO review is required for any
future architecture gate. CEO approval remains required for any scope that
would change authority, security boundaries, economic interpretation, or
production posture.
