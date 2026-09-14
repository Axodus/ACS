# EPIC-17-IMP-03B — Slice 4 Retention & Deletion Closure Package

**Status:** `COMPLETE / CTO ACCEPTED / PUBLISHED`  
**Schema:** `9`  
**Publication:** `AUTHORIZED FOR dev`

## Delivered boundary

Slice 4 adds governed retention execution to `GovernedMemoryService`. It
resolves the exact immutable Policy revision, validates Tenant and scope through
the canonical-owner boundary, checks the Policy expiry eligibility, and then
uses the existing durable tombstone primitive. It does not create a second
deletion path.

The resulting transaction contains the canonical Memory Event, content-free
tombstone, physical deletion of the encrypted active-store row, redacted
decision Evidence and outbox record. Failure of any part rolls back the whole
unit. Repeating the same retention idempotency key returns the prior canonical
result; a fresh key cannot tombstone an already tombstoned Record.

The only deletion assurance emitted or persisted is `ACTIVE_STORE_DELETED`.
`CRYPTOGRAPHIC_ERASURE` and `BACKUP_ERASURE` are neither inferred nor claimed.

## Validation

- `npm run build`: pass.
- Focused governed Memory tests: pass.
- `npm run acceptance:postgres`: schema 9, `19 passed / 0 failed / 0 skipped`.
- PostgreSQL proof covers early-policy rejection with no durable side effect,
  exact Policy eligibility, idempotent replay, Tenant and scope substitution
  rejection, content absence after commit, redacted Event/Evidence payloads,
  tombstoned retrieval exclusion and outbox-collision rollback.
- Restricted-sandbox regression: `129 passed / 10 failed`; all ten failures
  occur at `listen EPERM` before their tested surfaces.
- Listener-capable local regression: `750 passed / 0 failed / 19 skipped`.
  The skips are PostgreSQL tests without `ACS_SH_DATABASE_URL`; the separate
  PostgreSQL acceptance above is authoritative for schema 9 durable behavior.
- Authoritative causal classification: `A=0`, `B=0`, `C=0`, `D=0`.
- `git diff --check`: pass.

## B04 disposition

`E17-R06-B04` is `RESOLVED` for the accepted active-store contract:
governed eligibility, content-free tombstone, physical active-store deletion,
rollback and retrieval non-survival are implemented and validated. Production
cryptographic-key erasure and backup/WAL erasure remain separate infrastructure
capabilities and are not represented as completed guarantees.

## Non-goals retained

No scheduler or Automation owner, Runtime injection, Product API/Admin route,
vector/RAG adapter, User Context Memory, consent infrastructure, schema 10 or
production KMS/Transit integration was introduced.
