# ACS-RESEARCH-POC-01 — Stage A Preliminary Execution Report

> Historical Stage A record. The final Stage B report is
> `analysis/stage-b-execution-report.md`.

**Execution date:** September 17, 2026
**Classification:** Research / non-normative
**Authority:** None over ACS decisions
**Data boundary:** Phase 0 synthetic/fabricated only

## STATUS

`STAGE A COMPLETE / STAGE B NOT STARTED`

Stage A completed on six representative synthetic cases. The System One
adapter authenticated, serialized the documented request shape, parsed typed
`Score` answers, preserved probability distributions and confidence, persisted
sanitized results, and made no production-affecting change. Stage B was not
started because arm C (the stronger-reasoning comparator) has no approved local
configuration or credential in this environment. No conclusion about System One
dependency value can be made from the smoke sample.

## PROTOCOL VERSION / COMMIT

`REQ-02B / POC-01`, frozen by commit `638757b` (`docs(research): freeze system one poc parameters`).

No threshold, budget, corpus, or success criterion was changed after observing
provider output.

## CORPUS

- 240 evaluation rows: 216 unique cases and 24 repeats.
- Families: clean stratified, ambiguous/insufficient, conflicting, partial,
  adversarial/edge.
- Splits: development, calibration, holdout, with repeats isolated from split
  metrics.
- All content and labels are fabricated. No ACS Evidence, agent, genome, user,
  tenant, repository-secret, or institutional data entered a provider payload.
- Hidden expected judgments are retained only for offline evaluation and are
  excluded by the neutral request builder.

Artifacts:

- `corpus/phase-0.jsonl` — synthetic cases with hidden expected judgments.
- `corpus/manifest.json` — count and classification manifest.

## HARNESS

The experimental harness provides:

- deterministic corpus generation;
- a neutral request shape with four frozen judgment questions;
- a deterministic ACS baseline;
- payload safety checks that reject hidden truth and secret fields;
- sanitized result persistence;
- local contract tests;
- a Stage A smoke runner that stops before external calls when configuration is
  missing.

It does not introduce an ACS production contract, dependency, schema, runtime
path, Admission path, or Product API change.

## SYSTEM ONE ADAPTER

`provider/typesafe-adapter.mjs` is experimental and removable. It maps the
neutral request to the provider request boundary and normalizes provider `Score`
answers to ordinal levels `0..3`, retaining provider-reported probabilities and
confidence as observations. It does not treat confidence as truth, permission,
capability, Evidence authority, reputation, Genome fitness, or economic value.

The adapter reads only process environment variables. The temporary key was
present in `.env.local` under `TYPESAFE_API_KEY`; its value was never printed,
logged, committed, or persisted in an artifact.

## STAGE A SMOKE

`results/stage-a-smoke.json` records six representative cases:

- six provider requests completed successfully;
- 24 normalized judgments returned;
- provider/API errors: 0/6;
- provider timeouts: 0/6;
- observed latency: 286–940 ms;
- observed p50: 305 ms;
- observed p95: 940 ms;
- external calls: yes, synthetic payloads only;
- production effect: none.

The smoke result is a technical compatibility result, not a quality or
calibration gate. It surfaced provisional high-confidence disagreements against
the synthetic expected labels: 3/6 relevance high-confidence answers were
incorrect and 1/3 high-confidence output-completeness answers was incorrect in
this tiny sample. These observations require full-sample measurement and must
not be generalized from the smoke run.

## STAGE B EXECUTION

`NOT STARTED.`

The frozen protocol requires A, B, and C to be comparable. Arm C has no
configured stronger-reasoning comparator in the local environment. Running only
A and B would create a protocol deviation and would not answer whether System
One adds enough value to justify a dependency. No full provider run was made.

## ARM A RESULTS

The deterministic baseline was run locally on all 240 rows. This is the control
arm, not an independent truth source.

| Dimension | Exact ordinal accuracy |
| --- | ---: |
| relevance | 22.08% |
| evidence_quality | 70.83% |
| instruction_adherence | 51.67% |
| output_completeness | 100.00% |
| **overall judgment-level accuracy** | **61.15%** |

The synthetic labels are generated with the corpus construction and are not a
claim about production ACS performance.

## ARM B RESULTS

Smoke only: 6 cases / 24 judgments, all transport and shape checks successful.
No full-sample quality, calibration, escalation, cost, or repeatability result
is available.

## ARM C RESULTS

`NOT AVAILABLE.` No stronger-reasoning comparator was configured or called.

## QUALITY RESULTS

No preregistered quality gate was evaluated. The smoke sample is too small for a
quality decision. Full comparison against A and C remains required, including
per-dimension, per-family, holdout, ambiguity, conflicting-evidence, false
positive, false negative, macro, and ordinal agreement measures.

## CONFIDENCE / CALIBRATION

System One returned provider-reported confidence and probability distributions.
The adapter preserved them without interpreting a confidence value as a
correctness probability. In the smoke sample, 10/24 judgments were in the
candidate high band, 7/24 intermediate, and 7/24 low. The provisional
high-confidence error observations above prevent treating the smoke as evidence
of useful calibration. Brier/ECE/reliability curves require the full frozen
calibration and holdout splits.

## LATENCY / RELIABILITY

Smoke observations were within the frozen p50/p95 targets, with zero errors and
zero timeouts. This is not a production guarantee and is insufficient to prove
tail behavior, retry behavior, rate-limit handling, or availability.

## COST

Provider billing/cost data was not recorded in the smoke artifact. Therefore
cost per judgment, cost per accepted judgment, total cost, and comparison with
C are `UNKNOWN`. No cost conclusion is permitted.

## REPEATABILITY

One repeat case was included in the smoke selection, but one repeated answer is
not a repeatability estimate. The frozen 24-repeat requirement remains
unexecuted.

## PROTOCOL DEVIATIONS

None to thresholds, budgets, corpus, dimensions, or success criteria.

Stage B was intentionally not started because the required C comparator is not
configured. This is a stop condition, not a silent substitution or a parameter
change.

## PROVIDER-SPECIFIC LEAKAGE

The harness contains no System One concepts outside the experimental adapter
and provider contract files. The provider request shape is isolated. The
provider-native `Score` response is converted to provider-neutral ordinal level,
probability distribution, confidence, status, and latency observations.

Potential remaining leakage to test during removal replay: score-to-ordinal
rounding, provider question wording, probability-map semantics, model/version
metadata, and provider-specific result states.

## REMOVAL TEST

Static removal preparation passed: the baseline and corpus do not import the
System One adapter, and expected ACS-owned meanings remain in the harness.
Execution removal replay was not performed because Stage B did not produce a
full result set. A complete removal test must replay frozen inputs and compare
metrics using an ACS-native stub or another provider-shaped adapter without
changing Evidence, Agent, Genome, Runtime, Admission, Governance, Workforce,
Workflow, or Product API semantics.

## SECURITY / DATA CONFIRMATION

- Phase 0 synthetic data only: confirmed.
- Temporary experimental credential: read from environment only; not persisted.
- Secret logging/redaction: confirmed by adapter design and artifact inspection.
- Payload hidden truth exclusion: confirmed for all 240 cases by tests.
- Production ACS data or credentials: not used.
- ACS runtime/security boundary: unchanged.
- Provider retention, training/data-use, residency, tenant isolation, and legal
  terms: not revalidated by this execution and remain prerequisites for any
  broader data phase.

## NEGATIVE CRITERIA TRIGGERED

No final negative criterion was adjudicated because the full experiment did not
run. The smoke produced a warning signal for high-confidence errors, which is a
reason to require calibration analysis, not a basis for a final provider
rejection.

## UNRESOLVED QUESTIONS

- Which approved stronger-reasoning comparator will provide arm C?
- What are the full-sample confidence calibration and high-confidence error
  rates on calibration and holdout splits?
- Does System One reduce C-equivalent escalation without unsafe error growth?
- What is total cost per accepted judgment after retries and escalation?
- Does the 24-repeat set meet exact ordinal and confidence-band stability gates?
- Can removal replay reproduce all result states and metrics without provider
  semantics leaking into ACS-owned artifacts?
- What provider retention, data-use, residency, tenant, and audit terms apply to
  any Phase 1 proposal?

## FINAL CLASSIFICATION

`FURTHER EXPERIMENTATION`

This classification means the smoke proved technical reachability for the
synthetic adapter but did not provide the complete A/B/C evidence required for a
provider decision. It is not authorization for ACS integration and is not a
positive finding on System One dependency value.

## CTO RECOMMENDATION

Keep System One outside ACS production and do not promote the adapter into the
canonical core. A second execution gate is required after an approved arm C is
configured. Preserve the smoke artifact and do not tune prompts, thresholds,
budgets, or labels based on these observations.

## DECISIONS REQUIRED FROM CTO

- Select or authorize the stronger-reasoning comparator and its experimental
  credential/configuration.
- Confirm whether the temporary TypeSafe credential may remain valid for a
  full Phase 0 run.
- Reconfirm that provider billing and terms are acceptable for the next gate.

## DECISIONS REQUIRED FROM CEO

`NONE` for this bounded Phase 0 continuation. No production or institutional
authority decision is requested.

## IMPLEMENTATION IMPACT

- Experimental files only under `docs/research/system-one/poc-01/`.
- No production source, runtime, Admission, Evidence, Genome, Workforce,
  Workflow, Governance, Product API, database, or Control Plane changes.
- New sanitized results contain no credential or ACS data.
- Push remains on hold pending CTO review.
