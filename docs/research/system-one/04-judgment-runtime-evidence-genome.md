# 04 — Judgment pipeline, Runtime, Evidence, and Genome

## Judgment pipeline

The proposed pipeline is architecturally sound when the policy boundary is
explicit:

```text
ACS deterministic rule
      |
      +-- sufficient --> ACS policy decision
      |
      +-- judgment needed --> bounded Judgment Provider
                                  |
                         typed result + uncertainty
                                  |
                                  v
                            ACS policy
                         accept / reject / escalate
```

**ENGINEERING INFERENCE:** This adds real value when the question is bounded,
the answer space is small, the deterministic rule lacks context, and uncertainty
changes the next safe action. It merely adds another model call when the output
is not typed, no threshold changes behavior, or the task is already deterministic.

## Runtime and Admission

| Runtime use | Fit | Boundary |
| --- | --- | --- |
| Request classification | `POSSIBLE FIT` | Provider supplies a proposal; ACS validates and applies policy. |
| Risk/context judgment | `POSSIBLE FIT` | Risk is an input, not a permission or capability. |
| Routing input | `POSSIBLE FIT` | ACS resolves eligible workflow/workforce/provider. |
| Confidence escalation | `STRONG FIT` as a pattern | ACS maps uncertainty to hold, review, retry, or safe denial. |
| Admission authority | `NO-GO` | Admission remains ACS/Governance-owned and fail-closed where required. |

Probabilistic judgment is inappropriate as the sole basis for wallet signing,
treasury movement, permissions escalation, production provider execution,
constitutional governance, or irreversible state mutation.

## Evidence

The required semantic separation is:

```text
Observation != Evidence != Judgment != Policy Decision
```

- **Observation:** provider/runtime fact, such as a response, score, timeout,
  model version, or returned artifact.
- **Evidence:** canonical ACS record or reference with scope, provenance,
  correlation, retention, and verification semantics.
- **Judgment:** a bounded interpretation of supplied context and Evidence.
- **Policy Decision:** ACS-owned consequence under an explicit policy version.

A future judgment could contain references such as Evidence IDs, artifact hashes,
question/version, provider/model metadata, reported confidence, and an
availability/failure state. It must not rewrite the referenced Evidence or
assert that its own interpretation is canonical truth.

Candidate atomic judgments:

| Judgment | Fit | Safe use |
| --- | --- | --- |
| `task_success` | `POSSIBLE FIT` | Review signal over defined output/evidence, never automatic authority. |
| `relevance` | `POC RECOMMENDED` | Triage scoped source/evidence references. |
| `instruction_adherence` | `POC RECOMMENDED` | Quality review before human or policy review. |
| `evidence_quality` | `POC RECOMMENDED` | Identify missing provenance or incompleteness. |
| `risk` | `POSSIBLE FIT` | Advisory input; high-impact actions require policy/human controls. |
| `output_completeness` | `POC RECOMMENDED` | Gate a review queue, not a permission. |

## Genome

The Agentic Genetics boundary already preserves:

```text
Genome != Judgment
Trait != Judgment
Evidence != Judgment
Judgment != Reputation
Reputation != Economic Value
```

System One may eventually evaluate a contextual behavior claim about an Agent
revision or Genome-related workload, but the output remains a scoped judgment.
It cannot become a universal Genome score, fitness authority, reputation, license
entitlement, admission criterion, or economic valuation. Agentic Genetics
remains a separate research/program path.
