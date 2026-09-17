# ACS-RESEARCH-POC-01 — System One Evidence Judgment

**Execution date:** September 17, 2026
**Classification:** Research / non-normative
**Authority:** None over ACS decisions
**Data boundary:** Phase 0 synthetic/fabricated only

## STATUS

`STAGE B COMPLETE / CTO FINAL REVIEW REQUIRED`

The frozen Phase-0 experiment completed after Stage A acceptance and CTO
authorization of comparator C. The final classification is
`PATTERN VALIDATED / PROVIDER NO-GO`.

## PROTOCOL VERSION / COMMIT

`REQ-02B / POC-01 / Stage B`, frozen by `638757b`. Thresholds, budgets, corpus,
dimensions, and success criteria were not changed after observing results.

## CORPUS

240 evaluations: 216 unique synthetic cases and 24 repeats. Cases deliberately
cover positive, negative, ambiguous, adversarial/edge, partial, insufficient,
and conflicting evidence. Hidden expected judgments are independent corpus
labels, excluded from every provider payload. No ACS, user, tenant, source-code,
credential, or institutional data was used.

## HARNESS

The experimental harness supplies neutral requests, deterministic baseline A,
provider adapters B/C, synthetic-payload guards, resumable progress files,
sanitized raw result artifacts, normalization, metrics, pipeline simulation, and
removal-test metadata. It does not modify ACS production contracts or runtime.

## SYSTEM ONE ADAPTER

`provider/typesafe-adapter.mjs` maps the neutral request to TypeSafe/System One
and normalizes typed scores, probabilities, confidence, status, latency, usage,
and safe metadata. Provider parsing is isolated behind the experimental adapter.
The temporary `TYPESAFE_API_KEY` was read from the local environment only and
was not printed, logged, committed, or persisted.

## STAGE A SMOKE

Six cases / 24 judgments completed with zero provider errors and zero timeouts.
Observed p50 was 305 ms and p95 was 940 ms. Stage A established transport and
boundary compatibility only; provisional high-confidence errors were retained
as a warning for Stage B.

## STAGE B EXECUTION

All three arms completed 240/240 evaluations. B and C each returned 240
successful normalized results: zero provider errors, timeouts, invalid
responses, and normalization failures. Progress was persisted incrementally;
the final artifacts contain sanitized outputs and no raw response bodies.

## ARM A RESULTS

Deterministic ACS baseline, not ground truth:

| Measure | Result |
| --- | ---: |
| Exact ordinal accuracy | 61.15% |
| Ordinal agreement | 83.02% |
| Relevance accuracy | 22.08% |
| Evidence quality accuracy | 70.83% |
| Instruction adherence accuracy | 51.67% |
| Output completeness accuracy | 100.00% |

## ARM B RESULTS

TypeSafe/System One (`jev-1.13.0`):

| Measure | Result |
| --- | ---: |
| Exact ordinal accuracy | 34.90% |
| Ordinal agreement | 70.35% |
| p50 / p95 latency | 306 / 536 ms |
| Provider error / timeout / invalid | 0% / 0% / 0% |
| Usage | 186,499 tokens |

Dimension accuracy: relevance 44.58%, evidence quality 21.67%, instruction
adherence 44.17%, output completeness 29.17%.

## ARM C RESULTS

Strong reasoning comparator (`claude-opus-4-6-thinking`):

| Measure | Result |
| --- | ---: |
| Exact ordinal accuracy | 35.10% |
| Ordinal agreement | 71.22% |
| p50 / p95 latency | 2,340 / 3,428 ms |
| Provider error / timeout / invalid | 0% / 0% / 0% |
| Usage | 167,734 tokens |

C is a comparator, not ground truth. Its confidence was unavailable because the
approved text-only route did not return a probability distribution.

## QUALITY RESULTS

B was 26.25 percentage points below A on exact ordinal accuracy. The simulated
pipelines were: A only 61.15%; A→B 34.90%; A→C 35.10%; A→B→C 36.77%.
Therefore this workload did not show quality gain from replacing the baseline
with B or C.

## CONFIDENCE / CALIBRATION

B returned 542 high-band, 131 intermediate-band, and 287 low-band judgments.
ECE was 0.377 and the Brier-style top-confidence error was 0.357. Of 542
high-confidence B judgments, 303 were incorrect (55.90%). This directly fails
the intended confidence-to-escalation safety premise for this corpus.

The frozen offline policy escalated 190/240 cases (79.17%). Reasons included
low/unknown confidence, risk-case class, and baseline disagreement on risk
cases. C had no usable confidence signal for an equivalent calibration result.

## LATENCY / RELIABILITY

B met the frozen smoke-scale operational envelope and completed all calls. C
was materially slower. These are experiment observations, not availability or
production guarantees.

## COST

The TypeSafe dashboard, reviewed after execution, reports **$0.042 per million
input tokens** and free output. Its aggregate shows 247 requests, 191,830
tokens, and an estimated total of **$0.01** (unrounded input calculation:
$0.00805686). This dashboard total includes seven requests outside the 240-row
Stage B arm and is therefore not treated as an isolated Stage B invoice.

For the isolated Stage B B-arm usage captured by the harness, 170,179 input
tokens imply an estimated **$0.00714752**, or approximately $0.00002978 per
request and $0.00000745 per normalized judgment. The comparator C price remains
unknown, so total pipeline cost and cost per accepted pipeline decision remain
unknown. These are dashboard-based estimates, not a provider billing
guarantee.

## REPEATABILITY

Across 96 dimension-level repeat comparisons: B exact ordinal stability was
94.79%, confidence-band stability 89.58%, mean confidence delta 0.0166, and 10
comparisons crossed a confidence band. B therefore passed exact stability but
missed the frozen confidence-band stability marker. C exact stability was
92.71%; A was deterministic at 100%.

## PROTOCOL DEVIATIONS

None. Stage A was kept separate from Stage B, C received the same substantive
case information as B, and no threshold, budget, or success criterion changed.

## PROVIDER-SPECIFIC LEAKAGE

The evaluation core consumes neutral normalized judgments. TypeSafe and C
request/response parsing remains in separate experimental adapters. The removal
test identified no provider concept required by corpus, ground truth, metrics,
or ACS semantics. Provider score rounding, probability semantics, model
metadata, and status mapping remain adapter-owned details.

## REMOVAL TEST

Passed conceptually and structurally: corpus, independent labels, metrics, and
ACS semantics remain unchanged if the System One adapter is removed and another
adapter is inserted. No Runtime, Admission, Evidence, Genome, Workforce,
Workflow, Governance, Product API, schema, or Control Plane change is needed.

## SECURITY / DATA CONFIRMATION

Phase 0 synthetic-only boundary passed for B and C. Payload guards excluded
hidden truth and secrets. Results contain sanitized metadata only; no credential
or raw provider response was persisted. Provider retention, training/data-use,
residency, tenant isolation, and legal terms remain unresolved prerequisites for
any future Phase 1 or Phase 2 work.

## NEGATIVE CRITERIA TRIGGERED

- B adds no quality over A and is materially worse overall.
- B confidence is not calibrated: 55.90% of high-band judgments were wrong.
- B confidence-band repeatability missed the frozen marker.
- C is slower and does not outperform A on aggregate.
- Dollar cost and accepted-judgment economics remain unproven.

## UNRESOLVED QUESTIONS

- What pricing/billing data would be available under an approved future account?
- Would a different frozen corpus or dimension-specific protocol change the
  result, and is that worth a separately authorized experiment?
- Can any future provider expose a confidence signal with acceptable
  calibration without leaking proprietary semantics?
- What retention, data-use, residency, tenant, and audit guarantees would be
  required before Phase 1?

## FINAL CLASSIFICATION

`PATTERN VALIDATED / PROVIDER NO-GO`

## CTO RECOMMENDATION

Retain the judgment-layer pattern as a non-normative architectural lesson.
Do not pursue System One as an ACS dependency for this workload. Any new
provider experiment requires a new bounded gate; production integration remains
unauthorized.

## DECISIONS REQUIRED FROM CTO

Review and accept or reject the final classification and the sanitized result
artifacts. No further execution is requested by this report.

## DECISIONS REQUIRED FROM CEO

None at this stage.

## IMPLEMENTATION IMPACT

Experimental-only files and sanitized results were added under
`docs/research/system-one/poc-01/`. Canonical ACS behavior, contracts, schemas,
runtime, Admission, Evidence, Genome, Workforce, Workflow, Governance, Product
API, security boundaries, and production configuration were not modified.
