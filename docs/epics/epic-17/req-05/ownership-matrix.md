# REQ-05 Evidence and Ownership Matrix

| Concern | Evidence/current owner | Stable identity/history | Normative boundary |
| --- | --- | --- | --- |
| Provider integration definition | `ModelProvider` and `ModelProviderRegistry` in `src/intelligence/model-provider-registry.ts` | Provider ID; dynamic health/capabilities | Reuse when integration is provider-specific; no parallel Connector needed |
| Tool/MCP definition | REQ-04 governed resource refs in `src/native-core/agent.ts`; `RedHatMcpAdapter` is planning-only | MCP general history absent | Connector may reference, never replace Tool/MCP identity or authorization |
| Configured Connection | `CredentialConnection` and `CredentialConnectionRegistry` in `src/intelligence/credential-connection.ts` and `src/intelligence/credential-registry.ts`; durable SQLite adapter in `src/intelligence/vault-secret-provider.ts` | Connection ID, owner Tenant, type/status/timestamps; full immutable lineage not proven | Existing configured-instance owner remains authoritative |
| Secret material | `SecretStore` in `src/intelligence/secret-store.ts`; `SecretReference` in `src/intelligence/credential-connection.ts` | Secret ref/version metadata and provider audit; value stays external | Only SecretStore returns value under Tenant/purpose checks |
| Credential lease | `CredentialProvider.resolve` in `src/intelligence/credential-provider.ts`; `CredentialLease` in `src/intelligence/credential-connection.ts` | Purpose/Tenant/expiry metadata | Late-bound, scoped and non-transferable; snapshot stores refs only |
| Product API | Credential routes and redacted read models in `src/http/routes/product-api-routes.ts` | Redacted projection | Cannot expose secret value or become Connection owner |
| Channel | Specific source/channel vocabulary in `src/trinity-intake-boundary.ts`; blocked direct execution in `src/trinity-acs-roundtrip-protocol.ts` | No generic canonical contract/history | New interaction endpoint capability under Tenant integration ownership |

## Tenant and relation model

```text
Connector definition <- Connection <- Channel
                           |
                           +-> opaque credential/secret reference

governance decision applies to each operation
```

Each relation is explicit and Tenant-scoped. Cross-Tenant lookup, credential
resolution or Channel activation fails closed. Sharing a Connector definition
does not share Connections, credentials or Channels.

Connector representation remains optional: if a provider/Tool/MCP definition
fully owns the integration, Product API may adapt it as a Connector projection.
A distinct contract is justified only by reusable integration configuration or
capability semantics not owned by those classes.
