# ACS-BLOCKER-019

## STATUS

COMPLETE / ACCEPTED

## TITLE

Runtime Event Stream Identity & Run Admission Error Surface Remediation

## AFFECTED MILESTONE

ACS-V2-VAL-03 — Runtime Execution, Attempt, Reassignment and Recovery Validation

## AUTHORIZATION

CTO remediation decision dated 2026-09-12 authorized correction of two defects only:

1. Runtime compilation allocated its event sequence from `run:<runId>` while the persisted event was classified as `agent:<agentId>`.
2. The PostgreSQL adapter wrapped `NativeRunAdmissionError` as `TransactionFailedError`.

## IMPLEMENTATION

`execution.intent_compiled` is Run-owned. Runtime compilation now derives the stream from the event identity before allocating its sequence, then appends the same event through the same stream derivation. `agent_id` remains event provenance and does not change the canonical Run stream.

The PostgreSQL repository adapter now passes `NativeRunAdmissionError` through unchanged. Unexpected repository and database failures continue to use the transaction failure wrapper.

No Workforce semantics, Run admission rules, assignment semantics, lifecycle behavior, Product API contract, schema, or provider integration was changed.

## VALIDATION EVIDENCE

- TypeScript build: PASS.
- IMP-03B regression: PASS.
- IMP-03C regression: PASS.
- IMP-03D regression: PASS.
- IMP-03D PostgreSQL regression: 3 passed, 0 failed, 0 skipped.
- VAL-03 blocker assertions reached before the later lifecycle assertion: draft admission typed error, no partial persistence, Run stream identity, sequence continuity, Agent stream isolation, reassignment compilation, and outbox uniqueness passed.
- `git diff --check`: PASS.

## ACCEPTANCE LIMIT

The VAL-03 test currently stops later at an existing lifecycle expectation: the archived Workforce transition returns HTTP `400` for `Workforce reference is invalid`, while the test expects `422`. That lifecycle behavior is outside ACS-BLOCKER-019 and was left unchanged.

ACS-V2-VAL-03 remains BLOCKED until the blocker is accepted and the full transversal VAL-03 scenario is resumed.
