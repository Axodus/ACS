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
timeouts. The full Stage B run remains held because the required stronger-
reasoning comparator C is not configured.

Run the validation checks with:

```text
node docs/research/system-one/poc-01/harness/generate-corpus.mjs
node docs/research/system-one/poc-01/harness/poc-01.test.mjs
node docs/research/system-one/poc-01/harness/run-baseline.mjs
node docs/research/system-one/poc-01/harness/run-smoke.mjs
```

The external adapter requires an explicitly configured experimental credential
and endpoint. Secrets are read only from the process environment, never written
to the corpus, logs, or result artifacts. No production credential is accepted.

## Authority and data boundary

All cases are fabricated. Hidden expected judgments are stored only in the
synthetic corpus for offline evaluation and are excluded from provider payloads.
No experiment result changes an ACS decision. Stage B must not begin unless
Stage A authentication, serialization, parsing, timeout, redaction, persistence,
and adapter-boundary checks are technically clean.
