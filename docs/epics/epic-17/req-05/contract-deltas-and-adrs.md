# REQ-05 Contract Deltas, ADRs and Blockers

## Candidate deltas

1. `E17-R05-CD01`: versioned Connector projection/definition discriminator.
2. `E17-R05-CD02`: explicit Connection relation to definition and Tenant.
3. `E17-R05-CD03`: opaque credential/secret-version and lease-purpose snapshot refs.
4. `E17-R05-CD04`: Channel endpoint, direction, source identity and admission-policy refs.
5. `E17-R05-CD05`: operation-level Connector/Channel authorization decisions.
6. `E17-R05-CD06`: immutable config/provenance or typed history gap for snapshot use.
7. `E17-R05-CD07`: normalized delivery/ingress Evidence and idempotency correlation.

Candidate ADRs: `ADR-17-016` Connector projection versus definition;
`ADR-17-017` Connection/credential separation; `ADR-17-018` Channel interaction
boundary; `ADR-17-019` integration authorization and secret-safe snapshots.

## Blockers

| ID | Blocker |
| --- | --- |
| `E17-R05-B01` | Existing `CredentialConnection` combines configured connection and credential metadata; semantic projection/history must be accepted before migration. |
| `E17-R05-B02` | No generic Channel owner, contract or durable history exists. |
| `E17-R05-B03` | General MCP definition/connection split remains unimplemented. |
| `E17-R05-B04` | Exact historical Connection/secret-version reconstruction is not uniformly proven. |
| `E17-R05-B05` | Channel ingress idempotency/admission/evidence contract is absent. |

These block implementation only. No CEO escalation is required.
