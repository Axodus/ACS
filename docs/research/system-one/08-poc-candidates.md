# 08 — PoC candidates and smallest useful gate

These are proposals only. No PoC is authorized by `ACS-RESEARCH-REQ-02`.
All candidates are non-production, reversible, isolated, and subordinate to
ACS policy.

## PoC A — Evidence relevance and quality triage

| Field | Proposal |
| --- | --- |
| Problem | Human review queues contain evidence and artifacts whose relevance/completeness is uneven. |
| Current ACS approach | Store/link Evidence and rely on deterministic requirements plus human review. |
| System One approach | Answer bounded relevance, provenance-completeness, or quality questions over redacted fixtures. |
| Expected advantage | Faster triage and explicit uncertainty for reviewer prioritization. |
| Integration boundary | Offline/replay evaluator; Evidence IDs in, judgment result out. |
| Data exposed | Synthetic or redacted evidence excerpts and hashes only. |
| Authority boundary | No Evidence mutation, acceptance, permission, or release decision. |
| Failure/fallback | Unavailable/uncertain remains human review; no automatic acceptance. |
| Latency expectation | Batch/async; target measured against current review queue, not assumed. |
| Cost expectation | Compare total review/rework cost, not call price alone. |
| Success metrics | Precision/recall against labeled judgments, calibration, queue reduction, reviewer agreement. |
| Negative success criteria | False acceptance of incomplete Evidence, cross-tenant leakage, opaque results, provider-only storage. |
| Rollback/removal | Delete adapter and derived judgments; canonical Evidence remains intact. |

## PoC B — Request classification and routing confidence

| Field | Proposal |
| --- | --- |
| Problem | Some intake requests are context-sensitive after deterministic rules run. |
| Current ACS approach | Deterministic intent classification, policy gates, and explicit blocked actions. |
| System One approach | Classify a bounded request into an ACS-owned option set and return uncertainty. |
| Expected advantage | Better triage for ambiguous low-risk requests and earlier escalation. |
| Integration boundary | Non-production intake replay; ACS policy consumes the result. |
| Data exposed | Redacted request text plus scoped context classification. |
| Authority boundary | No admission, capability, permission, or execution grant. |
| Failure/fallback | Deterministic classifier, safe hold, or human review according to policy. |
| Latency expectation | Bounded synchronous or async path; measure before any request-path use. |
| Cost expectation | Include escalations, retries, and downstream reasoning. |
| Success metrics | Ambiguity detection, routing accuracy, unsafe false-negative rate, calibration, timeout rate. |
| Negative success criteria | Provider result bypasses blocked-action policy or causes unauthorized routing. |
| Rollback/removal | Disable adapter and return to deterministic routing. |

## PoC C — Output completeness and instruction-adherence review

| Field | Proposal |
| --- | --- |
| Problem | Generated artifacts may pass syntax checks while missing task-specific requirements. |
| Current ACS approach | Deterministic validation plus reviewer/approval evidence. |
| System One approach | Evaluate a bounded checklist over output and required Evidence. |
| Expected advantage | Earlier detection of omissions before human review. |
| Integration boundary | Post-run advisory evaluator; no workflow completion mutation. |
| Data exposed | Redacted artifact, checklist, and canonical requirement references. |
| Authority boundary | Reviewer or ACS policy remains responsible for acceptance. |
| Failure/fallback | Mark unavailable and preserve ordinary validation/review path. |
| Latency expectation | Async after artifact creation. |
| Cost expectation | Compare rework avoided against evaluation and review cost. |
| Success metrics | Omission detection, reviewer agreement, false-positive burden, calibration, rework rate. |
| Negative success criteria | Judgment becomes Evidence truth, approval, reputation, or Genome fitness. |
| Rollback/removal | Remove evaluator; retain artifact, ordinary validation, and reviewer records. |

## Smallest useful next gate

The smallest useful gate is **not a provider call**. It is a CTO-reviewed test
design gate that produces:

1. a labeled, synthetic/redacted corpus for one candidate workload;
2. a provider-neutral result vocabulary and failure-state test table;
3. acceptance metrics for accuracy, calibration, latency, total cost, leakage,
   and removal/replay;
4. a data-flow and retention review;
5. an explicit decision on whether credentials or paid access would be needed
   for the next phase.

If the next phase requires credentials, paid access, production data, or live
provider calls, it must stop for a new authorization and security review.
