# 05 — Evaluation protocol, metrics, and budgets

## Quality and calibration

Metrics must be frozen before execution and reported by candidate, dimension,
corpus phase, risk class, and arm.

| Area | Required measure | Minimum reporting rule |
| --- | --- | --- |
| Label quality | Accuracy or balanced accuracy where labels exist; macro precision/recall/F1 | Report overall and per class; do not hide minority/high-risk classes in an average. |
| Safety behavior | False positives and false negatives, especially unsafe acceptance or unsafe routing | Predefine which error is more costly for each dimension. |
| Agreement | Reviewer agreement and adjudication rate | Separate disagreement from provider error and from `unknown`. |
| Calibration | Reliability curve plus Brier score/ECE where the output is a probability-like value | If the provider output is a score or distribution concentration rather than probability, report its declared semantics and calibrate only after an explicit mapping. |
| Coverage | Fraction accepted without escalation at each threshold | Show the quality/coverage trade-off; no threshold is accepted on coverage alone. |
| Escalation | Escalation rate, escalation precision, and unresolved rate | Break out low-confidence, conflict, timeout, unavailable, and policy-forced escalation. |

Candidate starting thresholds (`0.85` or `0.90`) are hypotheses for the design
only. They must be selected on a development split, frozen, and tested on a
holdout. Confidence cannot be compared across providers unless the experiment
demonstrates comparable semantics and calibration.

## Operations

For every arm and candidate report:

- p50 and p95 latency, with queue/wait time separated from provider time;
- timeout rate, transport/API error rate, invalid-result rate, and retry count;
- repeatability for identical input, question, context, and pinned versions;
- behavior under provider unavailable, malformed, partial, and delayed results;
- observability completeness: experiment ID, policy/question revision, adapter
  correlation, result state, and redacted error category.

The proposed latency budgets in the candidate documents are test targets, not
documented guarantees. Request-path adoption is not implied by meeting them.

## Economics

Report at least:

```text
cost per judgment
cost per accepted decision
cost per reviewed item
cost of escalation
total cost = provider + retries + stronger reasoning + human review + rework
stronger-reasoning calls avoided or added
```

Use an absolute budget only after the execution gate identifies provider
pricing, token/input size assumptions, and reviewer time. A result is positive
only when total cost improves or the quality/safety gain is explicitly judged
worth the added cost by the CTO.

## Predeclared gate proposal

The exact numeric gates require CTO approval before execution. The proposed
shape is:

1. quality is no worse than the ACS baseline on the primary dimension;
2. unsafe false negatives do not exceed the separately approved risk ceiling;
3. calibration is materially better than an uncalibrated accept-on-confidence
   rule, or the result is forced to escalation;
4. escalation reduces stronger-reasoning/human work without hiding difficult
   cases;
5. p50/p95 and timeout/error rates remain within the candidate budget;
6. repeatability and result-state handling are acceptable;
7. total cost per accepted decision is at or below the approved ceiling, or a
   documented quality gain justifies the difference;
8. removal replay succeeds with no provider-specific authority or state.

Any critical negative criterion is a fail regardless of aggregate averages.
