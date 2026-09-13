# REQ-11 Performance and Derived Views

## Existing evidence boundary

Runs, Tasks, Attempts, Runtime observations, Evidence, Usage and Cost are the
accepted sources for operational history. `AcsPerformanceRecord` is a bounded
capability/trading record with modes including mock, sandbox and validation;
its supplied fixture explicitly disclaims real execution and return claims.
It is not canonical Agent reputation or Genome fitness.

## Permitted derived view

A future performance view may summarize canonical source records when it
exposes:

- exact subject and source references;
- Tenant and operational scope;
- time window and observation/freshness time;
- execution mode and environment;
- metric definition, units and aggregation method;
- included/excluded population and completeness gaps;
- warnings, uncertainty and correction status;
- Evidence, Usage and Cost correlation without copying their ledgers;
- projection contract/version.

The view is a query/projection. It creates no performance aggregate, immutable
Agent characteristic or universal score by default.

## Trait derivation

A derived trait assertion based on performance must identify the exact method,
window, source records and Evidence. It expires or becomes stale according to
its method/policy. It remains descriptive and cannot be combined with unrelated
references to infer authority.

Examples of prohibited transformations include:

```text
high success rate -> permission
low cost -> quality or safety
historical outcome -> guaranteed future performance
metric summary -> reputation or fitness
verified assertion -> admission approval
performance history -> economic right or royalty
```

Ranking, universal trust scores, genetic fitness, autonomous selection,
reputation and economic valuation remain rejected. A future policy may consume
canonical metrics only through a separately accepted policy/authority contract;
Genome does not make that decision.
