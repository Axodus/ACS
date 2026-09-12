# ACS-V2-IMP-03A — Workforce Durable Contracts & Role-History Resolution

**Status:** PARTIAL — implementation complete; repository-wide validation has unrelated failures on September 11, 2026  
**Owner:** Axodus CTO  
**Authority:** ACS-V2-REQ-06, FROZEN-v1

IMP-03A adds the ACS-owned durable Workforce foundation required by the next
milestone. Workforce identity is separate from immutable composition revisions;
the current revision is advanced with expected-head CAS, canonical events,
outbox delivery, and existing ACS idempotency semantics in one PostgreSQL
transaction.

The implementation preserves `pinned` Agent revision references and stores
`current_head_at_admission` as an unresolved selector. It adds a small
ACS-owned governed-role revision history so an exact role reference remains
readable after the governed resource advances.

Run admission, WorkforceRunMembershipV2, task ownership, coordination,
runtime compilation, Product API expansion, UI, provider adapters, Eigent,
CAMEL, and Cost contract changes remain outside this milestone.

## Acceptance

The focused conformance suite covers identity, lineage, immutable history,
selectors, Agent and role references, lifecycle transitions, CAS, idempotency,
atomic event/outbox writes, failure injection, reload, migration upgrade, and
external-framework sovereignty. PostgreSQL acceptance is recorded in
[postgresql-validation.md](postgresql-validation.md) and the final gate is in
[acceptance-report.md](acceptance-report.md).
