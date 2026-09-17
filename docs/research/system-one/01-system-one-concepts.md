# 01 — System One concepts and source discipline

## What the official material supports

**DOCUMENTED FACT:** TypeSafe presents System One as a way to express small,
typed units of AI intelligence and compose them into larger behavior. Its
documentation describes atomic questions, typed primitives such as choices and
scores, composition, and confidence-oriented outputs.

**DOCUMENTED FACT:** The official examples position a judgment as a structured
answer to a question rather than an unconstrained conversational response. The
result can be consumed by application logic.

**DOCUMENTED FACT:** The official JavaScript and Python repositories expose SDK
surfaces for interacting with the TypeSafe service. This establishes an
integration surface, not an ACS-compatible contract or production guarantee.

**DOCUMENTED CONTRACTUAL TERMS / VENDOR CLAIM:** TypeSafe's published privacy
policy says it will not train or fine-tune models on prompts or other Input. Its
DPA describes TypeSafe as a processor for Customer Personal Data and describes
subprocessor and international-transfer mechanisms. The privacy policy says
the Services are hosted in the United States. The Master Customer Agreement
also says TypeSafe may process Telemetry to improve its Services and is not
obligated to retain Customer Data after termination. These statements are
important source evidence, but they require legal, security, plan/edition, and
deletion-verification review before Axodus data could be considered eligible.

**VENDOR CLAIM:** System One can make application behavior more reliable,
interpretable, or cost-efficient by replacing some free-form model calls with
small, typed judgments. That claim is plausible for bounded classification and
evaluation workloads, but it is not evidence of calibration, availability,
latency, cost, or domain accuracy for ACS.

## Conceptual model used in this research

```text
context + question + permitted answer space
                    |
                    v
          typed judgment provider
                    |
          value + confidence/uncertainty
                    |
                    v
            ACS-owned policy
        accept | reject | escalate
```

The provider answers a bounded question. ACS decides whether that answer is
sufficient, what it means in the current policy version, and what happens when
the provider is unavailable or uncertain.

## What is not established

The product and technical material does not by itself establish:

- a durable ACS evidence model;
- tenant isolation suitable for Axodus;
- an ACS-approved retention, training-use, or residency posture for every
  deployment mode or data category;
- calibrated confidence on ACS workloads;
- deterministic replay across model or provider version changes;
- an availability, latency, throughput, or cost SLA;
- a stable export format sufficient for provider removal;
- authority-aware admission or governance semantics;
- a workforce/workflow runtime;
- Genome, reputation, or economic semantics.

These remain **UNKNOWN** until a separately authorized validation gate produces
evidence.

## Fit interpretation

System One is best understood as a possible **judgment/evaluation provider**.
It is not equivalent to an ACS Agent, AgentRevision, Runtime, Workforce,
Workflow, Evidence store, Governance policy, or Product API.
