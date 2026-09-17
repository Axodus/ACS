# 07 — Gate decision and next authorization

## Current classification

`POC DESIGN INCOMPLETE`

The design establishes three measurable candidates and a common A/B/C
comparison, but execution readiness is not yet demonstrated. The following
artifacts are still required:

1. CTO selection of one primary candidate, or an explicit order for the three;
2. frozen Phase 0 corpus specification with actual labels and holdout policy;
3. approved adjudication rubric and reviewer/tie-break process;
4. numeric quality, safety, calibration, latency, error, escalation, and cost
   ceilings for the selected candidate;
5. security/privacy owner and completed Phase 1 redaction/data-flow review if
   redacted samples will be used;
6. provider retention/data-use/tenant/residency review;
7. explicit decision on credentials, paid access, and external calls for the
   separate execution gate;
8. a removal replay artifact and replacement-provider test procedure.

## What is already sufficient

- the authority boundary is explicit and removable;
- the ACS baseline/control is defined;
- stronger reasoning is limited to predeclared escalation/comparison use;
- confidence is not treated as universal probability or authority;
- quality, calibration, operations, economics, security, and removal metrics
  are defined before execution;
- Phase 0/1/2 data progression is explicit;
- production API, Runtime, Admission, Evidence, Genome, Workforce, Workflow,
  Governance, and economic use remain out of scope.

## Smallest useful next gate

The smallest useful next gate is a CTO decision package for one candidate with
a frozen synthetic corpus, approved labels and thresholds, and a security/
privacy checklist. It may then request a separate `PoC Execution Authorization`
that explicitly decides whether credentials and external provider calls are
permitted.

## Required decisions

### CTO

- select candidate A, B, or C;
- approve the baseline/control and adjudication method;
- approve candidate budgets and critical negative criteria;
- name the security/privacy review owner for any Phase 1 use;
- decide whether to prepare a separate execution authorization.

### CEO

`NONE` for this design gate, unless a later proposal changes authority,
security boundaries, production posture, or economic commitments.

## Implementation performed

None. This package is documentation only. No provider call, credential,
dependency, source change, runtime behavior, schema, production configuration,
or PoC was created.
