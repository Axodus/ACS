# ACS-V2-VAL-02B — IMP-02B Regression & Reload Acceptance

**Status:** `COMPLETE` — validation evidence complete; CTO promotion disposition
remains the next decision.

**Validated commit:** `67dba463ca651f8b38e0ce1c3f4887e25f924a1d` on `dev`.

## Objective

VAL-02B determined whether the eight EPIC-15.5 file failures reported during
IMP-02B validation were caused by IMP-02B, and whether a canonical Agent
revision survives a browser reload and Product API re-fetch.

## Result

- **Regression gate:** `PASS`.
  The reported failures are `ENVIRONMENT / HARNESS`, not IMP-02B regressions.
  All eight focused tests passed when their loopback and child-process
  requirements were available. Both the isolated serial suite and the ordinary
  `npm test` rerun passed with `692 total`, `688 passed`, `0 failed`, and four
  documented PostgreSQL skips.
- **Reload gate:** `PASS`.
  The disposable Agent `imp02b-local-20260910` changed from revision `r3` to
  `r4`, the Product API persisted the new name, and a direct Configuration URL
  reload re-fetched and rendered that name and `r4`.

## Recommendation

`ACS-V2-IMP-02B → PROMOTE TO COMPLETE — ACCEPTED`.

No production source, API, database, migration, dependency, or contract change
was made by this validation package.

## Documents

| Document | Purpose |
| --- | --- |
| [Environment](environment.md) | Reproducible local execution conditions. |
| [Suite comparison](suite-comparison.md) | Why the 692-subtest baseline and the 114-file failure report differed. |
| [Regression analysis](regression-analysis.md) | Per-test classification and historical comparison. |
| [Reload acceptance](reload-acceptance.md) | `r3 → r4 → browser reload → backend re-fetch` evidence. |
| [Acceptance results](acceptance-results.md) | Final matrix and promotion recommendation. |
