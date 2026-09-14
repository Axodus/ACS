# EPIC-17-IMP-03B — Slice 5 Product API / Administration & Conformance Package

**Status:** `COMPLETE / CTO ACCEPTED / PUBLISHED`  
**Schema:** `9` unchanged  
**Scope:** existing Product API projection only

## Delivered projection boundary

Slice 5 adds four GET-only Product API routes:

- `GET /api/v1/memory/policies`
- `GET /api/v1/memory/policies/:memoryPolicyId`
- `GET /api/v1/memory/records`
- `GET /api/v1/memory/records/:memoryId`

The route layer composes `ProductApiClient`; it does not query Memory tables or
repositories directly. The client reads canonical Memory Policy heads/lineage
and content-free Record state from `AsyncNativeCoreRepository`, then creates a
dedicated projection. Policy reads represent the current canonical head. There
is no historical HTTP endpoint; exact historical reconstruction remains in the
canonical repository through immutable Policy revisions and Record identity.

Record projections include Tenant-scoped identity, type, safe scope metadata,
exact Policy revision/fingerprint, predecessor lineage, Knowledge reference,
safe provenance references, lifecycle and tombstone status. A tombstoned
projection may declare only `deletionGuarantee: ACTIVE_STORE_DELETED`.

The projection never calls `readMemoryRecordContent`. It excludes raw or
decrypted content, `content_ref`, digests, ciphertext, encryption backend/key
metadata, cryptographic context, secrets, Event/outbox payloads and deleted
content. No privileged administrative content-inspection route was added.

## Tenant, errors and mutation posture

Lists query only the authenticated context Tenant. A detail read for a missing
resource or a resource owned by another Tenant returns the same typed 404:
`memory_policy_not_found` or `memory_record_not_found`. This prevents existence
disclosure across Tenants.

The `/api/v1/memory/*` surface accepts GET only. POST, PUT, PATCH and DELETE
return the existing `method_not_allowed` response. Slice 5 adds no direct
record mutation, Policy revision mutation, retention shortcut, Runtime Memory
injection, Run/Task/Activation behavior, User Context Memory, RAG/vector store
or schema change.

## Cross-domain conformance

Memory remains a canonical companion domain:

```text
Governance -> owns Memory Policy history
Memory Domain -> owns Records, content lifecycle and tombstones
Agent / Workforce / Knowledge -> exact references only
Product API / Administration -> Tenant-scoped projection only
Runtime -> not integrated
```

Memory is not Agent or Workforce identity, Knowledge, Evidence, Event, Run
state, Checkpoint, authority or a RAG/vector-store owner. User Context Memory
remains `OPEN / DEFERRED` under `E17-R06-B03`; account, session and Tenant are
not treated as consent or privacy authority.

## REQ-06 closure reconciliation

| Item | Slice 5 disposition |
| --- | --- |
| B01 / B02 | Resolved by the accepted Policy and Store boundaries. |
| B03 | Open and deferred; no schema, route or fallback identity was introduced. |
| B04 | Resolved for `ACTIVE_STORE_DELETED`; stronger erasure guarantees are not claimed. |
| B05 / B06 | Resolved by exact companion references, governed access and typed Policy/Record results; Runtime integration remains deferred. |
| CD01–CD07 | Implemented in Slices 1–4. |
| CD08 | Implemented here as a safe Product API projection. |
| ADR-020–024 | Decided and implemented within their approved boundaries. |

## Validation

- `npm run build`: pass.
- Focused Slice 5 Product API and HTTP tests: pass.
- `npm run acceptance:postgres`: schema 9, `20 passed / 0 failed / 0 skipped`.
- PostgreSQL coverage proves Tenant filtering, active/tombstoned projection,
  predecessor preservation, `ACTIVE_STORE_DELETED` projection and exclusion of
  content and cryptographic material.
- Listener-capable `ACS_ENVIRONMENT=local npm run check`: `752 passed / 0
  failed / 20 skipped`. The skips are PostgreSQL tests without
  `ACS_SH_DATABASE_URL` and are independently covered by the PostgreSQL
  acceptance suite.
- Authoritative causal classification: `A=0`, `B=0`, `C=0`, `D=0`.
- `git diff --check`: pass.

## Remaining boundaries

Production Memory enablement still requires a validated external KMS/Transit
provider. `CRYPTOGRAPHIC_ERASURE` and `BACKUP_ERASURE` remain unclaimed. User
Context Memory, consent infrastructure, Runtime injection, automatic retrieval,
RAG/vector search, Product API content inspection and a retention scheduler are
outside this slice.
