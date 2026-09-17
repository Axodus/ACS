# ACS-RESEARCH-REQ-02A — System One PoC Readiness & Evaluation Design

**Status:** `AUTHORIZED / DESIGN-ONLY`
**Classification:** `RESEARCH / NON-NORMATIVE`
**Provider calls:** `NONE`
**Credentials:** `NONE`
**Implementation:** `NONE`
**Design date:** 2026-09-17

## Decision target

This package converts the accepted REQ-02 findings into a falsifiable
experiment design. It is not a second architecture-fit review and it does not
authorize a PoC, provider calls, credential use, external data transfer, source
integration, or production configuration.

The experiment must answer:

> Does System One add enough value compared with the ACS baseline to justify a
> separately authorized dependency experiment?

It must not stop at demonstrating that System One can perform a task.

The invariant remains:

```text
System One may provide judgments.
ACS retains authority.
```

## Proposed outcome

`POC DESIGN INCOMPLETE`

The design is sufficiently concrete to select a candidate and request the next
planning decision, but it does not yet contain an approved labeled corpus,
security/privacy sign-off, provider terms review, or measured provider
latency/cost. Those are prerequisites for `POC READY` and remain outside this
authorization.

This is a design-completeness finding, not a rejection of the technology.

## Package

- [01 — Experiment design](./01-experiment-design.md)
- [02 — Candidate A: evidence triage](./02-poc-a-evidence-triage.md)
- [03 — Candidate B: routing classification](./03-poc-b-routing-classification.md)
- [04 — Candidate C: output review](./04-poc-c-output-review.md)
- [05 — Evaluation protocol, metrics, and budgets](./05-evaluation-protocol.md)
- [06 — Data, security, and removal test](./06-data-security-removal.md)
- [07 — Gate decision and next authorization](./07-gate-decision.md)

## Data progression

```text
Phase 0  synthetic / fabricated data       designed now
Phase 1  redacted ACS-like samples         designed now; separate approval before use
Phase 2  real ACS data                     out of scope; separate security/privacy approval
```

No Phase 0 or Phase 1 sample may be sent to a provider under REQ-02A.

## Explicit non-goals

- no TypeSafe/System One installation or dependency;
- no provider credentials, paid access, or external calls;
- no ACS source, schema, migration, runtime, Admission, Evidence, Genome,
  Workforce, Workflow, Governance, or Product API changes;
- no canonical judgment contract or provider-specific schema;
- no production decision, permission, execution, reputation, or economic use.

## Required next gate

The CTO must select one candidate, approve its corpus and adjudication plan,
confirm the security/privacy review owner, and decide whether the next gate may
request credentials and external calls. If those prerequisites are completed,
the result can be reclassified as `POC READY` and returned for a separate
`PoC Execution Authorization` decision.
