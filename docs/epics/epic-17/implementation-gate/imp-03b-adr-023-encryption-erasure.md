# ADR-17-023 — Memory Content Protection, Deletion and Reconstruction

**Status:** `COMPLETE / CTO ACCEPTED / PUBLICATION AUTHORIZED`
**Scope:** schema-9 candidate only
**Migration authority:** schema 8 -> 9 authorized
**Slice 2 authority:** Durable Memory Store authorized
**Related blocker:** `E17-R06-B04 PARTIALLY REDUCED / OPEN`

## Decision

Select the encryption-key authority and deletion guarantees for durable Memory
content before schema 9 can create `acs_memory_contents`.

```text
Memory Domain
  -> content semantics and deletion decision
Security / Infrastructure
  -> key lifecycle, protect/unprotect and erasure evidence
Memory Store
  -> ciphertext and opaque metadata only
  -> never key material
```

Memory content remains distinct from credentials. Memory never grants secret,
capability, delegation or execution authority.

## Current repository evidence

| Surface | Evidence | Consequence |
| --- | --- | --- |
| `SecretStore` | `get` returns plaintext; references are Tenant-scoped. | Correct credential owner, not a KMS interface. |
| `VaultSecretProvider` | Vault KV v2 value storage returns raw values. | Not a Transit/KMS encrypt-decrypt or erasure-attestation adapter. |
| In-memory/filesystem stores | Explicitly non-production-oriented. | Cannot establish a production protection or backup-erasure guarantee. |
| Production composition | Requires an external managed secret provider. | Production Memory protection needs the same managed posture. |

Reusing `SecretStore` as a master-key API is rejected. It would return key
material into an application-facing boundary and has no encryption-context,
controlled-decrypt or erasure-attestation contract.

## CTO accepted decision

Adopt an external managed **Memory Key Protection** capability, owned by
Security / Infrastructure. It is an infrastructure adapter, not a Memory
repository, Event store, SecretStore replacement or new canonical owner.

```text
Memory Store -> protect(exact tenant and Memory context, plaintext)
             <- ciphertext plus opaque protection metadata
Memory Store -> unprotect(exact tenant and Memory context, ciphertext)
             <- plaintext only for an already-authorized bounded operation
Security / Infrastructure -> owns root keys, rotation and erasure evidence
```

The adapter must bind each protect/unprotect operation to provider-enforced
associated data. It must not expose generic decrypt-by-key-reference behavior.

## Schema-9 amendment

Replace the ambiguous `encryption_key_ref` field in `acs_memory_contents` with:

| Column | Meaning |
| --- | --- |
| `encryption_backend` | Stable provider identifier only. |
| `encryption_key_ref` | Opaque non-reusable protection-key reference. |
| `encryption_key_version` | Exact protection-key version. |
| `cipher_suite` | Approved ciphertext algorithm label. |
| `encryption_context_digest` | Digest of associated data, never raw context. |

`content_ciphertext` is opaque to Memory. A provider may embed a wrapped data
key inside that ciphertext, but the Store never persists or receives raw key
material. `content_digest` stays only in the active content row and is deleted
with it. The tombstone retains a digest only if the exact Policy allows it.

No Policy, Record, Event, Evidence, outbox, Product API projection, error,
log, dump or snapshot may hold plaintext, raw key material, a bearer credential
or reusable decrypt metadata.

## Tenant isolation

Associated data must bind:

```text
tenant_id
memory_id
memory fingerprint
policy_id / policy_revision / policy_fingerprint
purpose = acs.memory.content
```

Only the digest of this context is persisted. A mismatched caller, Tenant,
Record, Policy or context must fail closed. A key reference never authorizes a
Memory read and must never work across Tenants.

## Rotation and immutability

Root-key rotation does not change a Memory Record's semantic content,
fingerprint, Policy reference, predecessor lineage or lifecycle. If provider
rotation is transparent, no Memory row changes. If rewrapping is required, it
may change only ciphertext and the five protection fields in the active content
row, while preserving memory ID, Tenant, content digest, media type and context.

Rewrapping is security maintenance, not a successor Memory Record. A future
schema migration must add a guard trigger to reject every other content-row
update. `DELETE` of a content row remains allowed only through the explicit
retention transaction; no cascade is permitted.

## Truthful deletion guarantees

| Guarantee | Meaning | Initial recommendation |
| --- | --- | --- |
| `ACTIVE_STORE_DELETED` | The content row was deleted in the committed Memory transaction. | Required and provable. |
| `CRYPTOGRAPHIC_ERASURE` | A record- or approved retention-cohort-exclusive key was destroyed with provider evidence. | Never assumed or emitted initially. |
| `BACKUP_ERASURE` | Infrastructure proves retained backup, replica, export and WAL copies were erased or unrecoverable. | Never assumed or emitted initially. |

Deleting an active PostgreSQL row does not erase prior ciphertext from WAL,
replicas, backups, dumps or unapproved diagnostics. Slice 2 therefore declares
only `ACTIVE_STORE_DELETED`. A tombstone must never claim broader erasure.

A future stronger guarantee requires a key destruction scope no broader than an
erased Record or approved retention cohort. Destroying a Tenant-wide shared key
to erase one Memory Record is prohibited. Any later proof is Security-owned
Evidence/provenance and cannot restore content or mutate the tombstone.

Historical reconstruction after deletion returns only the exact Record and
Policy references, deletion reason/time, permitted digest and provenance. It
never rehydrates content from current state, Event, Evidence, outbox or backup.

## Environment posture

| Environment | Allowed provider | Permitted claim |
| --- | --- | --- |
| Unit/integration tests | Explicit in-process, ephemeral test protector. | Test-only confidentiality; no backup/crypto-erasure claim. |
| Development PostgreSQL | Explicit development protector; never silently selected for production. | `ACTIVE_STORE_DELETED` only. |
| Production | External managed KMS/Transit-equivalent with Tenant-bound context and key lifecycle. | `ACTIVE_STORE_DELETED`; stronger guarantees only with evidence. |

Plaintext durable Memory content is prohibited in every environment. The current
in-memory, filesystem and Vault KV SecretStore adapters cannot be the
production Memory Key Protection provider. Provider unavailability or missing
Tenant-context enforcement fails closed.

## Schema impact and implementation limits

This ADR adds no table and preserves the approved five-table ownership shape.
It adds the five opaque protection fields and constrained rewrap trigger to
`acs_memory_contents`. `acs_memory_tombstones` needs no new assurance field:
its presence means only `ACTIVE_STORE_DELETED` in the initial implementation.

Any future cryptographic- or backup-erasure attestation requires a separately
approved Security/Infrastructure evidence contract. It must not mutate an
immutable tombstone or overstate deletion.

## Required proof after a separate Slice-2 GO

1. Cross-Tenant, Record, fingerprint, Policy and context substitution fails closed.
2. Plaintext, keys and reusable decrypt metadata are absent from all durable and projected surfaces.
3. Rewrap preserves the content digest and cannot alter semantic Record fields.
4. Event, tombstone, content deletion and outbox roll back together on injected failure.
5. A committed tombstone has no content row; deferred cross-table constraint
   triggers reject any final content/tombstone coexistence at commit.
6. Historical paths cannot recover deleted content.
7. PostgreSQL acceptance and full regression retain `A = 0` and `D = 0`.

## CTO disposition

1. External managed Memory Key Protection is canonical; SecretStore/Vault-KV
   reuse as a master-key API is rejected.
2. `ACTIVE_STORE_DELETED` is the only deletion assurance for initial Slice 2/4.
3. The five protection metadata fields and constrained rewrap guard are accepted.
4. A production KMS/Transit adapter is required before production Memory
   enablement, not before schema-9 migration. The Store fails closed for content
   writes without a configured cryptographic provider.

ADR-023 no longer blocks migration. `E17-R06-B04` remains open pending durable
implementation proof and later retention enforcement.
