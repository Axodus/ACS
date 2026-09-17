# 02 — PoC candidate A: evidence relevance and quality triage

## Problem

Review queues may contain artifacts that are relevant but incomplete,
well-formed but weakly supported, or insufficiently scoped for the requested
task. The experiment tests whether an explicit judgment layer improves triage
without changing canonical Evidence.

## Candidate design

| Field | Design |
| --- | --- |
| Corpus | Phase 0: fabricated evidence packets with planted relevance, provenance, contradiction, and completeness conditions. Phase 1: redacted ACS-like excerpts with stable Evidence IDs/hashes and no secrets or tenant identifiers. |
| Ground truth | Predefined rubric for each dimension; two independent reviewers for a stratified sample; adjudicated label may be `relevant`, `not_relevant`, `sufficient`, `insufficient`, `conflicting`, or `unknown`. |
| Judgment dimensions | Relevance to the scoped task; provenance completeness; evidence quality; contradiction/ambiguity flag. |
| Output | One typed result per dimension, optional supporting span/reference, confidence interpretation, and explicit result state. No mutation of Evidence. |
| Baseline A | Deterministic required-field/provenance checks plus ordinary human review for semantic quality. |
| Arm B | System One answers the frozen atomic questions over the same redacted context. |
| Arm C | Stronger reasoning review only for low-confidence, conflicting, or sampled disagreement cases. |
| Escalation | Candidate threshold starts at confidence `>= 0.85` only as a test value; it must be calibrated per question. Any `unknown`, timeout, policy conflict, or missing context escalates. |
| Latency budget | Proposed offline target: p95 <= 10 seconds/item, timeout at 15 seconds. This is a budget to test, not a vendor guarantee. |
| Cost budget | No execution cost is authorized here. Before execution, set an absolute per-item ceiling and compare total cost including retries, review, escalations, and avoided rework. |
| Positive success | Meets the predeclared quality/calibration gates; reduces unnecessary manual or stronger-reasoning review at equal or lower unsafe false-negative rate; preserves removal replay. |
| Negative success | Any false acceptance of deliberately incomplete/contradictory evidence, cross-tenant exposure, unbounded retries, or provider result treated as canonical Evidence. |

## Decision value

This candidate has differentiated value only if uncertainty improves queue
ordering or escalation decisions. A higher label accuracy with no useful
reduction in review burden, no calibration, or increased unsafe false
negatives is not sufficient.
