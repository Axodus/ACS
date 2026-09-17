# 05 — Workforce, Workflow, Governance, Product API, and operations

## Workforce and Workflow

System One is a possible input for task classification, ambiguity resolution,
routing suggestions, escalation selection, and worker-selection features. The
fit is useful only if the result is advisory and revisioned with the ACS task
context.

ACS must continue to own:

- workflow/workforce identity and revisions;
- task admission, dependency, lease, retry, timeout, cancellation, and join
  semantics;
- agent eligibility and capability checks;
- authority, budget, knowledge scope, and approval references;
- final run state and institutional lineage.

An external judgment cannot create a canonical Task, select an unauthorized
worker, alter a workflow revision, or satisfy a human approval state.

## Governance

**POSSIBLE FIT — advisory interpretation only.** A provider may classify a
submitted proposal, summarize evidence, or identify ambiguity for a reviewer.
Consequential governance remains owned by canonical governance policy and
authorized human/role decisions.

Probabilistic judgment is inappropriate as the sole control for:

- constitutional or mandate interpretation with irreversible consequence;
- permission escalation or identity proof;
- treasury, wallet, signing, settlement, payout, or economic action;
- production release or security exception;
- acceptance of incomplete Evidence as if it were complete;
- conversion of confidence into reputation, rank, fitness, or value.

## Product API

No Product API change is authorized or performed. If a future adapter is
considered, the boundary should be explicit about:

| Concern | Research requirement |
| --- | --- |
| Latency | Separate bounded synchronous use from asynchronous review; measure p50/p95/p99 on ACS workload. |
| Timeout | Return `unavailable` or `escalate`; never infer approval. |
| Provider outage | Deterministic fallback or safe hold according to policy. |
| Retry | Only with idempotency and a provider request correlation key. |
| Circuit breaking | Prevent provider failure from taking down the control plane. |
| Idempotency | Keep ACS request/run identity independent from provider IDs. |
| Observability | Record provider/version/attempt/latency/failure without leaking sensitive payloads. |
| Tenant isolation | Scope context, credentials, retention, and evidence references per Organization/domain. |

## Operational analysis

**VENDOR CLAIM:** TypeSafe's September 14, 2026 launch material reports
70–500 ms end-to-end response times, a stated $42 per billion input-token
price, and large speed/cost multiples on selected System One workflows. The
same material explains that the evaluations use selected workflows, reference
large models, and may be favorable to the vendor's system. These numbers are
not ACS measurements, an SLA, or a production forecast.

| Property | Classification | Current evidence |
| --- | --- | --- |
| ACS latency/throughput | `MEASURED BY ACS` only for existing local paths | No System One measurement exists. |
| System One latency/throughput | `UNKNOWN` | Target-workload benchmark required. |
| Cost reduction | `VENDOR CLAIM / UNKNOWN` | Published workflow multiples are vendor evaluation results; a cheaper judgment can increase total cost through retries, false escalations, or review. |
| Availability/reliability | `UNKNOWN` | No ACS-approved SLA or failure test reviewed. |
| Repeatability | `UNKNOWN` | Must test version pinning, prompt/context identity, and replay behavior. |
| Confidence calibration | `UNKNOWN` | A confidence number is not a calibrated probability without a labeled corpus. |
| Model/version evolution | `UNKNOWN` | Require version metadata and drift review. |
| API stability | `UNKNOWN` | SDK presence is not a compatibility guarantee. |
| Observability/tracing | `POSSIBLE FIT` | Adapter would need to normalize provider observations into ACS telemetry/evidence links. |

## Economics

The economic hypothesis is testable but not established:

```text
deterministic rule -> simple judgment -> confidence threshold
       enough --------------------------> ACS policy
       uncertain -----------------------> stronger reasoning / human review
```

Useful measurement must include total cost, not only provider-call price:

- judgment calls;
- retries and timeouts;
- stronger reasoning calls;
- human review time;
- false accepts and false rejects;
- rework and incident cost;
- evidence and observability overhead.

No quantified savings claim is made by this research.
