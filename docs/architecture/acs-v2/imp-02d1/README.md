# ACS-V2-IMP-02D1 — Product API Agent-Scoped Operational Query Compatibility

**Status:** COMPLETE
**Date:** 2026-09-11

IMP-02D correctly withheld Agent Runs and Evidence from the frontend because the direct Product API routes were unbounded, and withheld Agent economics totals because the summary ignored Agent scope. IMP-02D1 repairs those existing query contracts without adding a read model, storage, routes, frontend behavior, or accounting logic.

## Compatibility repairs

- `GET /agents/:agentId/execution-runs` now has server-owned `limit` and `offset` bounds. The default limit is 50, the maximum limit is 100, and the maximum offset is 10,000. Records are ordered by descending `startedAt`, then descending `runId`.
- `GET /agents/:agentId/evidence` now has the same bounded page contract. Evidence is ordered by descending `createdAt`, then descending `evidenceId`.
- `GET /evidence?agentId=:agentId` now forwards the existing `agentId` parameter into the canonical Audit/Event filter instead of accepting it and returning broader records.
- `GET /agents/:agentId/economics` and `GET /economics/summary?agentId=:agentId` now apply canonical Agent scope to their existing Agent, Deployment, Runtime, and Execution Run projections. Existing zero-valued operational totals and economic semantics remain unchanged.

Direct Agent Runs and Evidence routes verify that the Agent exists before returning a page, so an unknown Agent returns `404` while a valid Agent with no records returns `200 []`.

## Query shape and isolation

Runs are filtered by `ExecutionRunRecord.agentId` and isolation scope while records are scanned from the existing runtime map. The implementation retains only `offset + limit` candidates and does not materialize or slice an unbounded Agent result.

Evidence filters canonical `AuditEvent.agentId` at the Audit service before deriving Evidence. For a bounded request, matching events stream into a fixed-size Evidence collector; the direct route never builds an unbounded Evidence array. The current in-memory/file audit stores still scan their existing state because no indexed durable query contract exists; no schema or index change is authorized by this milestone.

No ownership is inferred from Agent names, timestamps, providers, models, or payload similarity. Existing authentication, organization/tenant isolation, redaction, governance, and economic authority remain unchanged.

## Economic boundary

This work only scopes existing operational projections. It does not introduce canonical usage-to-cost math, change pricing, or change quote, reservation, settlement, or Usage correlation. The established bounded Usage route remains `GET /economics/usage?agentId=:agentId&limit=50`.

The existing Run summary projection still exposes `revisionId: 0`; canonical execution revision provenance is not present in the Run record and remains a deferred contract gap.

## Validation

- Focused API compatibility coverage creates 55 Agent A Runs/Evidence records, foreign Agent B records, and an empty Agent C.
- It verifies bounds, pagination, deterministic ordering, `404` versus empty, invalid bounds, direct-route conflict rejection, cross-Agent exclusion, generic Evidence `agentId` forwarding, scoped economics projections, and unchanged bounded Usage.
- `s63-epic-16-3-usage-settlement.test.mjs` passes, preserving the accepted settlement/reservation/quote correlation behavior.
- Standalone frontend typecheck, lint, 10 tests, and build pass unchanged. The build retains existing stream-externalization and large-chunk warnings.
- Disposable localhost Product API validation passed over real HTTP with 55 Agent A Runs/Evidence records, foreign Agent B records, and empty Agent C routes.
- Canonical host suite: 694 total, 690 passed, 0 failed, 4 PostgreSQL-gated skips.

PostgreSQL revalidation is not required: no PostgreSQL repository/query implementation, schema, migration, or durable economic persistence path changed. The four host-suite skips remain gated by the absent `ACS_SH_DATABASE_URL`.

## Decision

**READ MODEL ADDED: NO.** Existing Product API routes and query layers are sufficient after these narrow compatibility repairs.

**IMP-02D completion readiness: READY TO RESUME IMP-02D.** A separately authorized frontend continuation may consume the repaired Run, Evidence, and scoped economics-summary contracts. This milestone does not do so.
