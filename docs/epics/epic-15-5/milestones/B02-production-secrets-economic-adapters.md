# B02 — Production Secrets & Economic State Adapters

**Status:** PASS — 2026-08-15

**Readiness result:** the adapter blockers are materially reduced, but ACS remains **Operational Ready: BLOCKED** and **Production Ready: BLOCKED**. `ACS-ORG-002` and `ACS-ORG-007` are `PARTIALLY_RESOLVED`, not closed, because live managed-service and shared multi-instance proof remain absent.

## Scope delivered

B02 introduced production-oriented boundaries for secret material and economic state without adding billing, metering, identity, remote runtime or deployment enablement.

```text
credential metadata/reference                 economic command
        ↓                                            ↓
SQLite secret catalog                         EconomicStateStore
        ↓                                            ↓
Vault KV v2 SecretProvider              SQLite authoritative projection
        ↓                                            ↓
tenant-scoped read-through                  SettlementProvider
                                                     ↓
                                           SQLite provider record
                                                     ↓
                                            atomic local commit
```

The shipped HTTP composition now selects durable secret metadata/credential references and durable economic/settlement adapters by default. Secret material remains memory-backed only in the explicit development profile unless Vault is selected. Production profile composition refuses insecure fallback.

## Discovery

### Secret inventory

| Component | Stores value | Stores metadata | Mechanism before B02 | Tenant scoped | Result |
| --- | ---: | ---: | --- | ---: | --- |
| `InMemorySecretStore` | Yes | Reference only | process map | Contract-dependent | Retained as explicit DEV/test adapter |
| `FileSystemSecretStore` | Yes, plaintext | Process-local metadata | local mode-`0600` files | Contract-dependent | Retained as explicit DEV adapter; forbidden as production proof |
| `MockAcsSecretStorage` | Mock only | Inspection contract | process mock | No production path | Unchanged; not a source of truth |
| Credential registry | No | Connection and secret reference | process map | Yes | Can use `SqliteSecretCatalog` and survives restart |
| `VaultSecretProvider` | External only | No local value | Vault KV v2 plus SQLite catalog | Yes, catalog-authoritative | Added as production-oriented adapter |
| API/UI/audit | No | Identifier/status only | redacted projections | Yes | No raw value read model added |

No existing managed provider or vendor SDK was present. B02 uses the native HTTP boundary for Vault KV v2 and Node's existing `node:sqlite`; no new dependency, custom cryptography or vendor credential was added.

### Economics inventory

| Component | Before B02 | Durable | Idempotent | Result |
| --- | --- | ---: | ---: | --- |
| Quotes/reservations/usage | `EconomicService` maps | No | Reservation only | Moved behind `EconomicStateStore`; SQLite adapter added |
| Settlement provider | `InMemorySettlementProvider` | No | Process-local only | `SqliteSettlementProvider` added |
| Settlement projection/receipt | service maps | No | Process-local only | atomic SQLite commit added |
| Recovery | none | No | No | provider-to-projection `reconcile()` added |
| Billing/pricing | DEV policy boundary | N/A | N/A | Unchanged and explicitly non-billing |

## Secret contracts and adapter

`SecretStore` now exposes typed metadata, provider descriptors, health, describe, rotate and revoke operations. `SecretReference` carries optional tenant scope for compatibility; the provider catalog is the authority and rejects a forged reference that omits or changes the owning Tenant.

`VaultSecretProvider` stores only `{ value }` in the configured KV v2 path. The local SQLite catalog stores:

- `secretId`, Tenant, provider, purpose and backend;
- active version and lifecycle status;
- creation/update/rotation/revocation timestamps;
- credential connections containing references, never values.

Administrative reads are metadata-only. Audit events record identifier, provider, version, status and purpose. Transport errors do not include response bodies, tokens or secret values.

### Rotation and revocation

- Rotation uses KV v2 check-and-set against the current catalog version.
- Catalog revision advances only after the provider confirms the new version.
- If catalog persistence fails, the newly written provider version is deleted best-effort and the operation fails.
- Revocation soft-deletes all known KV versions and marks catalog metadata `revoked`.
- `delete()` preserves the logical-revocation semantics; no unaudited hard-delete API was exposed.
- Distributed propagation to already-running workloads remains deferred.

### Isolation and leakage

Every Vault resolve, describe, rotate and revoke requires explicit Tenant context and compares it with catalog ownership. Tenant mismatch produces `ACS_SECRET_TENANT_MISMATCH`. In-memory and filesystem DEV adapters also validate stored metadata, preventing a forged reference from bypassing the Tenant field.

Tests prove zero raw value occurrence in secret metadata, audit JSON, provider request diagnostics and error messages. Raw values intentionally exist transiently in the caller/provider transport and the consuming runtime process; B02 does not claim confidential-computing isolation.

### Configuration and readiness

| Setting | Meaning |
| --- | --- |
| `ACS_ENVIRONMENT=production` or `adapterProfile: "production"` | enables fail-closed adapter profile |
| `ACS_SECRET_PROVIDER=vault` | selects Vault KV v2 |
| `ACS_VAULT_ADDR`, `ACS_VAULT_TOKEN` | Vault transport configuration |
| `ACS_VAULT_NAMESPACE`, `ACS_VAULT_MOUNT` | optional Vault routing |
| `ACS_SECRET_CATALOG_PATH` | durable non-secret catalog path |

Production profile rejects memory/filesystem secret adapters with `ACS_SECRET_PROVIDER_CONFIGURATION_INVALID`. Readiness distinguishes provider kind from live reachability through `SecretStore.health()`; configured but unreachable Vault remains blocked.

## Economic source of truth

`EconomicStateStore` is authoritative for quote, reservation, usage, local settlement projection and receipt. `SettlementProvider` is authoritative for confirmed settlement effects. These are separate boundaries even when both use the same SQLite database file.

The SQLite adapters preserve exact `NeuronsAmount` and `bigint` values as decimal strings, Tenant/workload identity, idempotency keys and record relationships. Settlement projection updates are committed in one `BEGIN IMMEDIATE` transaction:

```text
provider settlement confirmed
        ↓
settlement + reservation + receipt
        ↓
atomic local commit
```

No success is returned before both provider confirmation and authoritative projection commit.

## Idempotency and crash recovery

Settlement idempotency is scoped by Tenant and key. Repeating the same logical request returns the original settlement; reusing a key for a different run/reservation fails with `ACS_ECONOMIC_IDEMPOTENCY_CONFLICT`.

The critical crash window is explicit:

```text
provider commits
→ ACS fails before local projection commit
→ request returns failure
→ new context calls reconcile()
→ missing settlement/reservation/receipt projection is rebuilt once
```

Tests simulate this window. The first reconciliation repairs one record; a second repairs zero; the provider still contains exactly one settlement.

## Failure semantics

| Failure | Result |
| --- | --- |
| Vault unavailable/write rejected | no metadata success; `ACS_SECRET_PROVIDER_UNAVAILABLE` |
| Secret Tenant mismatch | no value; `ACS_SECRET_TENANT_MISMATCH`; denial is audit-ready |
| Secret revoked | no value; `ACS_SECRET_REVOKED` |
| Economic store write/corrupt decode | no success; `ACS_ECONOMIC_PERSISTENCE_FAILED` |
| Settlement provider unavailable | reservation remains reserved; no settlement/receipt |
| Idempotency collision | deterministic conflict; no duplicate effect |
| Projection commit after provider success | request fails; durable reconciliation path repairs later |

Audit emission remains non-transactional with the resource store. Audit failure does not roll back a confirmed external secret/settlement operation; a transactional outbox/shared audit service remains deferred under `ACS-ORG-009`.

## Multi-instance classification

| Component | Classification | Evidence/caveat |
| --- | --- | --- |
| Vault secret material | `EXTERNAL_PROVIDER_MANAGED` | provider protocol supports shared access; live HA/service identity not tested here |
| SQLite secret metadata and credentials | `SINGLE_NODE_DURABLE`, `MULTI_INSTANCE_NOT_PROVEN` | WAL and busy timeout; no cluster DB or replica acceptance |
| SQLite economic state | `SINGLE_NODE_DURABLE`, `MULTI_INSTANCE_NOT_PROVEN` | transactions/idempotency proven on one host |
| SQLite settlement provider | `SINGLE_NODE_DURABLE`, `MULTI_INSTANCE_NOT_PROVEN` | unique keys and restart proof; not an external financial provider |

## Acceptance evidence

Dedicated suite: `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`.

Final result: **6/6 B02 scenarios PASS** and **19/19 targeted regression files PASS** against the clean temporary compilation.

| Evidence | Result |
| --- | --- |
| Vault create/describe/resolve/rotate/revoke | PASS |
| Secret metadata and credential reference restart | PASS |
| Cross-Tenant secret access | 0 violations |
| Raw value in metadata/audit/errors | 0 occurrences |
| Production insecure fallback | BLOCKED as required |
| Economic quote/reserve/usage/settle restart | PASS |
| Duplicate settlement effect | 0 |
| Provider-to-projection reconciliation | PASS, one repair then zero |
| Cross-Tenant economic visibility | 0 violations |
| False success on provider/persistence failure | 0 |

Targeted regressions cover Tenant lifecycle, Membership/Authority, Governance, credential connections, BYOK, OpenCode, HTTP/auth contracts, deployment, tenant isolation, operational evidence, production readiness, financial reconciliation/audit, Tenant Administration API and B01 durability/HTTP compatibility.

The official `npm run build` remains environment-blocked by `TS5033`/`EROFS` in tracked `dist`. Equivalent TypeScript emission to `/tmp/epic15-5-b02-final.kN5LU5/dist` passes and is the artifact used by the final test matrix.

## Finding and readiness impact

- `ACS-ORG-002`: **PARTIALLY_RESOLVED — B02**. A real Vault KV v2 adapter, explicit configuration, fail-closed production selection, Tenant isolation, lifecycle and restart-safe metadata exist. Live Vault/HA/service-identity and shared catalog proof remain.
- `ACS-ORG-007`: **PARTIALLY_RESOLVED — B02**. Economics and settlement are no longer exclusively process-local; idempotency, atomic projection commit, restart and reconciliation pass. SQLite is single-node and is not a billing/financial-provider certification.
- Secrets: `BLOCKED → PARTIAL`.
- Economics: `BLOCKED → PARTIAL`.
- Operational Ready: **BLOCKED**.
- Production Ready: **BLOCKED**.

## Deferred scope

- managed Vault deployment, HA acceptance, service identity and policy provisioning;
- cloud KMS/IAM lifecycle and automatic rotation scheduling;
- supported Control Plane secret lifecycle UX (`ACS-ORG-016`);
- shared multi-instance database and transactional audit outbox;
- pricing, invoices, subscriptions, payments and broad usage metering;
- trusted HTTP identity, distributed limiting, remote workers, exporters and production deployment.

## Acceptance result

B02 is **PASS** for its bounded adapter and durability scope. Milestone B remains **IN PROGRESS** because Agent/deployment/runtime/job state and multi-instance authoritative persistence are still open. No global production-readiness claim is made.
