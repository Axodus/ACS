# IMP-02D1 Query Contract Audit

## Before and after

| Contract | Before | After |
| --- | --- | --- |
| `GET /agents/:agentId/execution-runs` | Direct Agent scope, unbounded array, no query parameters. | Direct server scope with `limit` (default 50, max 100) and `offset` (default 0, max 10,000). Unknown Agent is `404`; valid Agent without records is `200 []`. |
| `GET /agents/:agentId/evidence` | Direct Agent scope, unbounded array, no query parameters. | Direct server scope with the same `limit` and `offset` bounds and empty/not-found distinction. |
| `GET /evidence?agentId=:agentId` | `agentId` was accepted but omitted by `buildEvidenceQuery()`, so it was silently ignored. | The existing parameter is forwarded to `EvidenceQuery.agentId`, then applied to the canonical Audit event filter. |
| `GET /agents/:agentId/economics` | Delegated to `getEconomicSummary({ agentId })`, but the summary ignored the supplied scope. | Existing Agent, Deployment, Runtime, and Execution Run projections apply canonical `agentId` scope. |
| `GET /economics/summary?agentId=:agentId` | Accepted Agent scope but received a summary that ignored it. | Uses the same corrected scoped summary behavior. |

## Pagination semantics

Product API list routes already use plain array response bodies and `limit` parameters. No existing cursor, page, offset, continuation token, or response-envelope pagination convention was found. The repaired direct Agent routes retain their array bodies and use one narrow `limit` + `offset` convention.

- `limit`: positive base-10 integer, default `50`, maximum `100`.
- `offset`: non-negative base-10 integer, default `0`, maximum `10,000`.
- Invalid values and unsupported query parameters return the existing typed validation response (`400`).
- A query `agentId` cannot override a direct-route Agent ID because the direct routes reject it as unsupported.
- Runs order by `startedAt DESC, runId DESC`.
- Evidence order by `createdAt DESC, evidenceId DESC`.

No total count or synthetic pagination metadata was added.

## Canonical scope and correlations

- Runs: `ExecutionRunRecord.agentId`.
- Evidence: `AuditEvent.agentId`, represented in Evidence as an `entityRefs` entry with `type: "agent"`.
- Economics projections: Agent and Execution Run records already carry canonical `agentId`; Runtime scope uses `RuntimeInstanceRecord.agentId` with the existing deployment Agent relationship as its contract fallback.
- Usage: existing `UsageInspectionRecord.agentId`, resolved through its canonical Execution Run relationship.

No names, provider/model identifiers, timestamps, or arbitrary metadata are used for Agent ownership.

## Remaining contract gaps

- Run execution Agent-revision provenance is not represented in the current `ExecutionRunRecord`; the summary still has the established placeholder `revisionId: 0`.
- This milestone did not add a standalone Agent Cost-record query or change existing operational zero-total economics semantics.
