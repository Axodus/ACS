# EPIC-17-IMP-03B — Slice 2 Durable Memory Store Report

**Status:** `COMPLETE / CTO ACCEPTED`  
**Schema:** `9`  
**Publication:** authorized for `dev`

## Delivered boundary

Slice 2 creates the canonical PostgreSQL Memory owner: versioned Memory Policy heads and immutable revisions, immutable content-bearing Memory Records with successor provenance, encrypted content rows, and content-free tombstones. Memory content is persisted only through a crypto-provider boundary; missing provider configuration rejects content writes without a plaintext fallback.

Canonical Event vocabulary was extended additively with `memory_policy` and `memory_record`. Each durable mutation commits canonical state, Event, and outbox in one transaction. Event and outbox payloads do not carry plaintext, ciphertext, key material, or secret references.

## B04 status

`E17-R06-B04` is `PARTIALLY RESOLVED`:

- physical content removal and tombstone exclusion are validated;
- deletion is transactional and rollback-safe;
- the only implemented assurance is `ACTIVE_STORE_DELETED`;
- `CRYPTOGRAPHIC_ERASURE` and `BACKUP_ERASURE` are not claimed.

## Validation

- Build: pass.
- PostgreSQL acceptance: schema 9, 17 passed, 0 failed, 0 skipped.
- Focused Slice 2 durable test: pass.
- Local regression: 128 passed, 10 failed.
- Causal classification: A=0, B=0, C=10, D=0.
- The ten C failures stop at `listen EPERM` before HTTP/process logic and before any Memory/schema-9 code path.
- `git diff --check`: pass.

## Next boundary

Slice 3 is limited to governed write and bounded retrieval through exact Policy and scope decisions. Runtime injection, Product API, RAG/vector infrastructure, User Context Memory, and retention scheduling remain outside this slice.
