# 01 — Experiment design

## Research question and falsification

The primary comparison is not “can the provider answer?” It is:

```text
Does System One improve useful decisions, uncertainty handling, or total cost
against the current ACS baseline without weakening authority, safety, privacy,
repeatability, or removability?
```

The experiment should be rejected if it only shows task capability but does not
show incremental value, or if any provider result bypasses an ACS-owned policy
or failure state.

## Arms

| Arm | Role | Authority |
| --- | --- | --- |
| A — ACS baseline | Current deterministic rule/checklist/classifier and its ordinary review path | Canonical ACS behavior for the experiment |
| B — System One judgment | Bounded typed judgment over the same frozen input | Advisory candidate only |
| C — stronger reasoning comparison | Used only for uncertain/disputed cases or a sampled control | Advisory comparison; never automatic authority |

Arm C is not required to run on every item. Its purpose is to test whether
System One reduces expensive reasoning work without hiding difficult cases.

The adjudication reference is independent of the provider result. It should be
created by a predeclared rubric and, where human review is needed, at least two
reviewers with a tie-break rule. `unknown`, `not applicable`, and `insufficient
evidence` must be valid outcomes rather than forced labels.

## Unit of evaluation

Each item receives a stable experiment ID and contains only the minimum context
needed for one bounded question. The manifest records:

- candidate and corpus phase;
- ACS baseline version and rule outcome;
- question revision and allowed answer options;
- expected judgment or adjudication label, when one exists;
- provider/model/version metadata, if a later execution is authorized;
- result state, confidence interpretation, policy threshold, escalation path;
- latency, retries, timeout, and error classification;
- final comparison outcome and reviewer notes.

The experiment manifest is ACS-owned. Provider correlation IDs are subordinate
metadata and cannot replace the experiment ID.

## Question construction

Each candidate should use independent, narrow questions rather than one broad
score. For example, `relevance`, `evidence_quality`, and `instruction_adherence`
must not be collapsed into a universal “agent fitness” value.

Every question definition must state:

1. subject and scope;
2. answer type and permitted options;
3. meaning of confidence or score;
4. evidence/context allowed;
5. `uncertain`, `unavailable`, `invalid`, and `timed_out` behavior;
6. the ACS policy that interprets the result.

TypeSafe confidence is treated as provider/question-specific information about
answer uncertainty or distribution concentration. It is not assumed to be a
calibrated probability, a permission, or a guarantee of workflow correctness.

## Evaluation sequence

1. Freeze corpus, labels, question text, threshold candidates, and version
   manifest before execution.
2. Run Arm A on the frozen corpus.
3. Run Arm B under the same input and context limits.
4. Route only predeclared uncertain/disputed items to Arm C.
5. Compare all arms against the adjudication reference and the ACS baseline.
6. Run repeatability, failure-state, privacy-boundary, and removal tests.
7. Report quality, calibration, operations, economics, and authority-boundary
   results separately.

No threshold may be tuned on the final holdout set. A development split may be
used to choose a candidate threshold; the holdout threshold is then frozen.

## Authority boundary

The output of Arm B can be an input to an offline evaluator or a future ACS
policy test. It cannot become Evidence truth, Admission, capability,
permission, reputation, Genome fitness, workflow completion, or economic value.
Unavailable or uncertain results must preserve the safe ACS path.
