# Synthetic corpus specification

## 1. Corpus target

Target: **240 evaluation rows**, representing **216 unique synthetic cases**
plus **24 repeat rows**. The size is a design target justified by the need to
cover four dimensions, four ordered levels, ambiguity classes, adversarial
cases, and a repeatability sample. It is not a production statistical claim.

Every unique case is evaluated against all four dimensions and the applicable
flags. The generator, when separately authorized, must reject a corpus that
does not satisfy the quotas below.

## 2. Required case families

| Family | Unique cases | Required content |
| --- | ---: | --- |
| Clean stratified cases | 192 | 48 expected labels per dimension level across levels 0–3; direct and indirect relevance; strong and weak evidence; complete and partial outputs |
| Ambiguous/insufficient | 8 | genuinely undecidable from supplied context; expected `unknown`/ambiguity visible |
| Conflicting Evidence | 8 | mutually inconsistent or provenance-conflicting artifacts |
| Partially correct | 8 | correct core with deliberate omissions or instruction deviations |
| Adversarial/edge | 8 | misleading wording, irrelevant but persuasive text, malformed references, and prompt-injection-like content that must not alter the rubric |
| Repeat rows | 24 | two additional evaluations of 12 cases, kept in the same split as their originals |

The 216 unique cases must be generated with a fixed seed and generator version
once generation is authorized. Repeat cases must not cross data splits.

## 3. Case record

The design-only record contains:

- stable `case_id` and `case_family`;
- synthetic task/request and scoped context;
- synthetic Evidence items with provenance, contradiction, and completeness
  metadata;
- expected judgment for each dimension;
- expected ambiguity/insufficiency/conflict flags;
- short independent rationale for every expected label;
- adjudication status and disagreement notes;
- split assignment and repeat linkage.

Hidden labels and rationales are not included in the provider-visible input.
No real Axodus, personal, tenant, credential, or production data is required.

## 4. Ground truth and disagreement

Truth is created before any System One evaluation:

1. A corpus author writes the expected labels, rationale, and ambiguity class
   from the synthetic case recipe.
2. Two independent reviewers validate a stratified sample blind to Arm B and
   Arm C results.
3. Disagreement is recorded as a disagreement, not silently averaged.
4. A tie-break rule produces an adjudicated label only when the rubric supports
   one; otherwise the case remains `ambiguous`.
5. Primary accuracy excludes unresolved ambiguous labels, while ambiguity
   detection, escalation usefulness, and calibration include them in their
   dedicated analyses.

System One and Arm C are never used to define truth.

## 5. Splits

| Split | Unique cases/rows | Use |
| --- | ---: | --- |
| Development | 120 unique | debug question wording and deterministic baseline; no final gate decisions |
| Calibration | 48 unique | select/freeze the preregistered confidence band interpretation; no holdout tuning |
| Holdout | 48 unique | final A/B/C quality, calibration, operations, and economics comparison |
| Repeat sample | 24 rows | repeatability; originals remain in their assigned split |

Cases from the same synthetic recipe family must be grouped to avoid near
duplicates leaking across splits.
