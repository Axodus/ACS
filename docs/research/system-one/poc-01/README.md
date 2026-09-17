# POC-01 — System One Evidence Judgment

This directory contains the authorized, non-production Phase 0 experiment for
System One. It is deliberately isolated from ACS runtime, Admission, Evidence,
Genome, Workforce, Workflow, Governance, Product API, and database contracts.

The experiment boundary is:

```text
synthetic corpus -> neutral harness interface -> A baseline / B System One / C comparator
```

The provider adapter is experimental code. Its request/response mapping is not a
normative ACS contract and must remain removable.

## Current execution state

On September 17, 2026, Stage A smoke completed against six representative
synthetic cases using the temporary experimental `TYPESAFE_API_KEY`. All six
provider calls returned parseable judgments with no recorded provider errors or
timeouts. After CTO authorization of comparator C, Stage B completed the frozen
240-evaluation Phase-0 run for A, B, and C. The result is recorded as
`PATTERN VALIDATED / PROVIDER NO-GO`; this is not production adoption.

Run the validation checks with:

```text
node docs/research/system-one/poc-01/harness/generate-corpus.mjs
node docs/research/system-one/poc-01/harness/poc-01.test.mjs
node docs/research/system-one/poc-01/harness/run-baseline.mjs
node docs/research/system-one/poc-01/harness/run-smoke.mjs
node docs/research/system-one/poc-01/harness/run-stage-b.mjs
node docs/research/system-one/poc-01/harness/analyze-stage-b.mjs
```

The external adapter requires an explicitly configured experimental credential
and endpoint. Secrets are read only from the process environment, never written
to the corpus, logs, or result artifacts. No production credential is accepted.

## Authority and data boundary

All cases are fabricated. Hidden expected judgments are stored only in the
synthetic corpus for offline evaluation and are excluded from provider payloads.
No experiment result changes an ACS decision. Stage B began only after Stage A
authentication, serialization, parsing, timeout, redaction, persistence, and
adapter-boundary checks were technically clean.

The final execution report is in `analysis/stage-b-execution-report.md`; the
Stage A historical report remains in `analysis/execution-report.md`. Sanitized raw
arm outputs and the derived analysis remain in `results/`. No raw provider
response body or credential is persisted.
