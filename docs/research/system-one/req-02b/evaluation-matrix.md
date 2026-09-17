# Evaluation matrix and preregistered gates

## Primary comparison

| Question | A — ACS baseline | B — System One | C — stronger reasoning |
| --- | --- | --- | --- |
| Does the judgment match independent labels? | deterministic label/rule output | typed ordinal judgments and flags | same rubric, comparator output |
| Does confidence identify uncertainty? | `unknown`/rule coverage only | distribution/binary probability bands | comparator confidence only as secondary evidence |
| Does escalation save work? | ordinary review rate | B low/uncertain cases sent to C | resolution quality and added cost |
| Is the result operationally usable? | local deterministic timing | provider, normalization, timeout/error timing | comparator timing and cost |
| Can the provider be removed? | remains available | replaced by ACS-native stub/replay | remains a comparison arm, not a dependency |

## Required metrics

| Category | Metric | Frozen gate or reporting rule |
| --- | --- | --- |
| Quality | macro-F1 or balanced accuracy per dimension; ordinal weighted agreement | B must improve A by at least 5 percentage points on the primary holdout measure, or match A while meeting the escalation/cost gates |
| Safety | false-positive/false-negative behavior for insufficient/conflicting/ambiguous cases | no more than 2 percentage-point increase in unsafe false negatives over A; ambiguity recall `>= 80%` |
| Calibration | reliability curve, Brier/ordinal Brier where valid, and ECE | ECE `<= 0.10` on holdout; ECE `> 0.15` is a failure; no probability claim is made when the output cannot support the metric |
| Escalation | coverage, escalation rate, escalation precision, unresolved rate | at least 20% fewer C/human-review-equivalent cases than A at no unsafe-error increase; report every escalation reason |
| Repeatability | exact ordinal answer and confidence-band stability | exact `>= 85%`; band `>= 90%` for identical input/question/version |
| Latency | p50/p95 and timeout rate | p50 `<= 2s`, p95 `<= 10s`, timeout `<= 2%` |
| Reliability | provider error and invalid-result rate | errors `<= 2%`; invalid/shape mismatch `<= 1%`; provider absence fails closed |
| Economics | raw cost/judgment; total cost/accepted judgment; review/rework proxy | B raw `<= 30%` of C raw; B total `<= 60%` of C; no >10% burden increase over A |
| Removal | replay through ACS-native stub or another provider-shaped adapter | must reproduce the frozen case, result states, metrics, and policy interpretation without provider-specific semantics |

## Negative success criteria

Any of the following is sufficient for `NO-GO` for System One in this workload:

- negligible quality gain over A and no meaningful cost/escalation advantage;
- confidence bands are poorly calibrated or do not improve uncertainty handling;
- latency, timeouts, errors, or retries erase the expected advantage;
- repeatability falls below the frozen requirement;
- B cost approaches C without a compensating quality/safety gain;
- provider semantics cannot be represented without semantic lock-in;
- removal replay fails or requires changing ACS Evidence, Agent, Genome,
  Runtime, Admission, Governance, Workforce, or Product API semantics;
- any output is interpreted as canonical Evidence, approval, permission,
  reputation, Genome fitness, or economic value.

## Result classification

Any future execution report must end with exactly one experiment-result
classification:

- `POC JUSTIFIED` — only if all critical gates pass and incremental value is
  demonstrated;
- `POC NOT JUSTIFIED` — if the negative criteria are met;
- `POC INCONCLUSIVE` — if data, reliability, or calibration is insufficient to
  decide.

This internal experiment result is separate from the authorization statuses
`POC EXECUTION READY`, `POC EXECUTION NOT READY`, and `POC NO LONGER JUSTIFIED`
used by the design gate.

## Removal checklist

Before any execution result can be accepted, confirm that the following remain
ACS-owned:

- dimension meanings, level definitions, labels, rationales, splits, and
  adjudication records;
- corpus IDs, Evidence references/hashes, data classification, experiment
  manifest, thresholds, result states, and policy interpretation;
- baseline behavior, metrics, cost formulas, and decision record.

Provider-specific values may remain only as replaceable metadata:

- endpoint, SDK, model/version, request IDs, raw payload shape, token counters,
  provider traces, and provider-native prompt/configuration details.

The provider can be removed without changing the meaning of any ACS-owned
artifact.
