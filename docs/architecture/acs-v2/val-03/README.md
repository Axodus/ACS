# ACS-V2-VAL-03 — Workforce End-to-End Acceptance & Contract Closure

## Status

`BLOCKED`

Validation ran on September 12, 2026. The first integrated canonical chain reaches runtime compilation and fails before Attempt A because the compiler computes an event sequence for the Run stream while its emitted event is classified into the Agent stream. This is recorded as `VAL-03-DEFECT-001` and is not repaired here.

VAL-03 remains validation-only. It does not reopen accepted Workforce semantics or introduce an alternate writer, schema, provider, or frontend authority.

## Result

The accepted focused suites remain green. The full PostgreSQL-enabled repository run contains 732 tests: 731 pass, 1 fails, 0 skip. The sole failure is the new transversal VAL-03 reproduction in `tests/acs-v2-val-03-postgres.test.mjs`.

See [acceptance-report.md](acceptance-report.md) for the decision record.
