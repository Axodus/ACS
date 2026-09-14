# EPIC-17-IMP-04 — Slice 2 Durable Delegation Grant Persistence

**Status:** COMPLETE / CTO ACCEPTED
**Schema:** 10 / CANONICAL AFTER PUBLICATION
**Scope:** Durable Delegation Grant persistence only

## Delivered boundary

Schema 10 adds a stable Delegation Grant head, immutable Grant revisions, and append-only revocation facts. The durable repository uses Tenant-qualified aggregate locks, compare-and-swap, exact historical parent references, idempotency, canonical Event/Evidence/outbox atomicity, historical reconstruction, and fail-closed chain usability.

Grant revisions preserve bounded authority, governing references, opaque credential and Memory references, ancestry, depth, expiry and provenance. No secret, credential material, Memory content, Runtime authority or execution state is persisted.

## Accepted validation

| Validation | Result |
| --- | --- |
| TypeScript build | PASS |
| Slice 1 and Slice 2 focused tests | 2 PASS / 0 FAIL |
| PostgreSQL acceptance | 21 PASS / 0 FAIL / 0 SKIP |
| PostgreSQL schema version | 10 |
| `git diff --check` | PASS |

The PostgreSQL acceptance covers immutable history, exact parent revision preservation, stale CAS rejection with no partial mutation, Tenant boundary rejection, self/cycle/depth and authority-expansion rejection, idempotent replay/conflict, append-only revocation, descendant invalidation for new use, and Event/outbox rollback.

## Preserved boundaries

This Slice does not integrate admission, create Runs or Tasks, inject Runtime authority, mutate Workforce, expose a Product API, resolve credentials, or access Memory content. Historical admitted execution remains outside this Slice and is not mutated by revocation.

## Next authorized work

Slice 3 is authorized to resolve current effective delegated authority from the durable exact chain. Admission integration remains held.
