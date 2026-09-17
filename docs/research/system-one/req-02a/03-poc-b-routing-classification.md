# 03 — PoC candidate B: request classification and routing confidence

## Problem

Some low-risk intake requests are not resolved by deterministic classification
alone because intent, ambiguity, or required context is expressed indirectly.
The experiment tests whether a bounded judgment improves routing inputs while
leaving Admission and execution authority in ACS.

## Candidate design

| Field | Design |
| --- | --- |
| Corpus | Phase 0: fabricated requests covering each allowed route, ambiguous requests, adversarial wording, missing context, and explicitly blocked actions. Phase 1: redacted ACS-like request replays with tenant and credential data removed. |
| Ground truth | ACS-owned route taxonomy and a reviewed expected route. Include `clarify`, `hold`, `human_review`, and `blocked` as first-class labels. Two-reviewer adjudication for ambiguous items. |
| Judgment dimensions | Request class; ambiguity; required context missing; risk/context flag; route recommendation. |
| Output | Typed option(s), confidence interpretation, reason/reference fields where permitted, and `uncertain`/`unavailable` state. |
| Baseline A | Current deterministic classifier, blocked-action rules, and safe hold/clarification behavior. |
| Arm B | System One classifies only into the ACS-owned option set; it cannot invent a route or grant capability. |
| Arm C | Stronger reasoning comparison for low-confidence or high-impact disagreements only. |
| Escalation | Candidate threshold starts at confidence `>= 0.90` for low-risk routing; all blocked/high-impact/unknown cases remain policy-controlled hold or human review. Threshold is a calibration hypothesis, not a universal rule. |
| Latency budget | Proposed replay target: p95 <= 2 seconds/item, timeout at 5 seconds. Request-path use is not authorized; the budget only tests future feasibility. |
| Cost budget | Set a pre-execution absolute ceiling for classification plus escalation. Report cost per correctly routed item and cost per safe accepted route, not call price alone. |
| Positive success | Better ambiguity detection and routing quality than the baseline without increasing unsafe route-to-execution opportunities; measurable reduction in unnecessary stronger reasoning or human review. |
| Negative success | Any route bypasses a blocked-action rule, a judgment is interpreted as Admission, or a provider outage changes the safe baseline outcome. |

## Decision value

This is the strongest candidate for testing the judgment-to-policy pattern, but
it has the highest authority risk. It should remain replay-only until the
failure-state and policy-interposition tests pass.
