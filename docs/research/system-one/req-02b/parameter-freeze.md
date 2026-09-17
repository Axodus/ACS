# Parameter freeze

## 1. Research question

Does System One add enough value over the ACS deterministic/simple baseline to
justify a separately authorized dependency experiment for contextual evidence
judgments?

The experiment fails if it only demonstrates that System One can produce an
answer. It must demonstrate incremental quality, useful uncertainty handling,
operational viability, economic leverage, and provider removability.

## 2. Frozen judgment dimensions

The experiment evaluates four independent ordinal dimensions. They are
contextual judgments, not canonical Evidence fields and not a combined agent
score.

| Dimension | Ordered levels, 0 through 3 | Separate flags |
| --- | --- | --- |
| `relevance` | irrelevant; weakly related; materially related; directly relevant | missing context, ambiguity |
| `evidence_quality` | unusable; weak/partial; adequate; strong and corroborated | insufficient evidence, conflicting evidence |
| `instruction_adherence` | absent/conflicting; materially incomplete; mostly compliant; complete | ambiguous instruction |
| `output_completeness` | missing; substantially incomplete; minor omissions; complete for the stated scope | not applicable, insufficient context |

Each question must ask one dimension at a time. The dimension definitions and
levels are ACS-owned experiment semantics. A future provider adapter may map
them to an appropriate native primitive, but provider-native labels cannot
change their meaning.

For a later TypeSafe evaluation, ordered dimensions are expected to use a
score-like distribution over levels. Ambiguity, insufficiency, and conflict
are separate yes/no judgments or explicit result states; they must not be
encoded as a mysterious fifth quality level.

## 3. Arms and controls

| Arm | Frozen behavior | Purpose |
| --- | --- | --- |
| A — ACS baseline | Current deterministic metadata/provenance checks and requirement-coverage rules, with safe `unknown`/review outcome; a transparent lexical/field-overlap control is reported separately when useful | ACS baseline/control; the simple lexical control is experimental only and does not change production ACS behavior |
| B — System One | Same frozen case, context, dimension definitions, and allowed levels; typed judgment plus provider-reported distribution/confidence and result state | Candidate judgment provider |
| C — stronger reasoning evaluator | Same rubric and context limits; run on the complete holdout plus every predeclared B escalation/disagreement | Comparator, not truth and not authority |

Arm C is not automatically ground truth. Ground truth is the independent
adjudication record described in the corpus specification.

## 4. Confidence interpretation

The experiment does not interpret a numeric confidence value as “probability of
being correct.” For an ordered judgment, confidence is evaluated from the
provider's answer distribution: concentration around the selected level and
separation from the next alternative. For binary flags, it is evaluated from
the yes/no probability and its distance from indifference.

The following bands are preregistered operational partitions, not correctness
claims:

| Band | Ordered judgment candidate | Binary flag candidate | Policy meaning in the offline evaluator |
| --- | --- | --- | --- |
| `high` | top-level mass `>= 0.75` **and** top-vs-second margin `>= 0.25` | selected outcome `>= 0.80` or `<= 0.20` | eligible for non-escalated comparison only if quality gates also pass |
| `intermediate` | top-level mass `>= 0.50` and margin `>= 0.10`, but not `high` | selected outcome in `[0.60, 0.80)` or `(0.20, 0.40]` | count as candidate coverage; calibration and error are still inspected |
| `low` | otherwise | selected outcome in `[0.40, 0.60]` | escalate to C or adjudication in the experiment |

These values are frozen before corpus evaluation and cannot be tuned on the
holdout. They are deliberately described as uncertainty bands. Calibration
must determine whether they are useful; the band name itself provides no
guarantee.

## 5. Escalation behavior

The offline policy sends an item to C when any of the following is true:

- any dimension is `low` confidence;
- the result is `uncertain`, `unavailable`, `invalid`, or `timed_out`;
- an insufficient/conflicting/ambiguous flag is raised;
- B disagrees with A on a predeclared high-risk case;
- the item belongs to the mandatory C holdout comparator set.

No escalation result becomes an ACS decision. The experiment records whether
the escalation was useful, unnecessary, or failed to resolve ambiguity.

## 6. Frozen operational budgets

These are experiment budgets, not vendor guarantees:

- p50 latency: `<= 2 seconds/item`;
- p95 latency: `<= 10 seconds/item`;
- per-item timeout: `15 seconds`;
- provider/API error rate: `<= 2%`;
- timeout rate: `<= 2%`;
- invalid/shape-mismatch result rate: `<= 1%`;
- repeated identical judgment band stability: `>= 90%`;
- repeated identical exact ordinal answer stability: `>= 85%`.

Queue time, provider time, retry time, and local normalization time must be
reported separately.

## 7. Frozen economic comparison

No price is assumed at design time. Execution must record provider price,
input/output units, retries, C calls, adjudication time, and rework proxy.

Pre-registered comparison gates:

- B raw judgment cost `<= 30%` of C raw judgment cost;
- B total cost per accepted judgment `<= 60%` of C on the same holdout;
- B must not increase total review/escalation burden by more than `10%` over A;
- if B approaches C cost without a quality or calibration advantage, the result
  is `NO-GO`.

“Accepted judgment” means an item counted as non-escalated by the offline
comparison policy. It is not an ACS acceptance or product decision.
