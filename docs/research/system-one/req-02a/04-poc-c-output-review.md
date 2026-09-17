# 04 — PoC candidate C: output completeness and instruction-adherence review

## Problem

An artifact can satisfy syntax or schema checks while omitting task-specific
requirements. The experiment tests whether contextual judgment finds omissions
early enough to reduce rework while leaving approval and Evidence authority in
ACS.

## Candidate design

| Field | Design |
| --- | --- |
| Corpus | Phase 0: fabricated task/output pairs with planted omissions, extra content, contradictions, and correct completions. Phase 1: redacted ACS-like artifacts paired with a frozen requirement checklist. |
| Ground truth | Requirement-by-requirement expected state: `present`, `missing`, `contradicted`, `not_applicable`, or `unknown`; adjudicated against the checklist, not against provider preference. |
| Judgment dimensions | Instruction adherence; output completeness; requirement coverage; contradiction; evidence/reference quality where applicable. |
| Output | Per-requirement typed result, confidence interpretation, cited input location, aggregate advisory summary, and explicit result state. The aggregate is not a universal quality score. |
| Baseline A | Deterministic schema/checklist validation plus ordinary reviewer approval. |
| Arm B | System One evaluates the frozen checklist over the same output and requirement references. |
| Arm C | Stronger reasoning comparison for disputed or low-confidence requirements only. |
| Escalation | Candidate threshold starts at confidence `>= 0.85` for advisory pass candidates; any missing/contradicted high-risk requirement or uncertainty escalates. Threshold must be calibrated per dimension. |
| Latency budget | Proposed asynchronous target: p95 <= 15 seconds/artifact, timeout at 30 seconds. No synchronous Product API use is authorized. |
| Cost budget | Pre-execution ceiling must include artifact size, retries, reviewer time, escalations, and rework avoided. A cheaper judgment call is not assumed to reduce total cost. |
| Positive success | Higher omission detection or earlier actionable review than the baseline at an acceptable false-positive burden, with no automatic completion/approval mutation. |
| Negative success | Provider result becomes approval, canonical Evidence, reputation, Genome fitness, or workflow completion; or false positives create more rework than they prevent. |

## Decision value

This candidate is low authority and highly reversible. It is a useful fallback
if routing classification is rejected for authority risk, and it directly tests
whether contextual judgments add value beyond deterministic validation.
