# IMP-02D1 Compatibility Validation

## Focused Product API evidence

`tests/imp-02d1-agent-operational-query-compatibility.test.mjs` passed after a root TypeScript build.

Fixture topology:

- Agent A: 55 Runs, 55 derived execution Evidence records, and Usage quantity `10` on one canonical Run.
- Agent B: 3 Runs, 3 derived execution Evidence records, and Usage quantity `90` on one canonical Run.
- Agent C: valid Agent with no Runs, Evidence, or Usage.

Verified behavior:

- Runs default to 50 Agent A records; `offset=50` returns the remaining 5; all returned IDs are Agent A; ordering is `startedAt DESC, runId DESC`.
- Evidence defaults to 50 Agent A records; `offset=50` returns the remaining 5; all records retain Agent entity references and `execution-run` provenance; ordering is `createdAt DESC, evidenceId DESC`.
- Generic `GET /evidence?agentId=AgentA&limit=100` returns the 55 Agent A records only, proving the forwarding repair.
- Agent C receives `200 []` for Runs and Evidence. Unknown Agents receive `404` from the direct routes.
- Invalid direct-route bounds (`limit=0`, `limit=101`, negative offset) and a conflicting `agentId` query parameter are rejected with `400`.
- Agent A economics projections contain Agent A and its Runs only. Agent B is excluded. Agent C retains the existing zero-valued operational totals and no Execution Run projection.
- Bounded Agent Usage remains server-scoped: the Agent A request returns only its Usage/Run record, not Agent B's quantity-90 record.

The existing economic summary does not derive nonzero financial totals from Usage in this operational projection. The scope test therefore asserts canonical entity projections rather than inventing new accounting expectations.

## Regressions

The following serial focused run passed:

```text
npm run build && node --test --test-concurrency=1 \
  tests/imp-02d1-agent-operational-query-compatibility.test.mjs \
  tests/imp-02d-agent-operational-scope.test.mjs \
  tests/s20-http-integration.test.mjs \
  tests/s27-operational-evidence.test.mjs \
  tests/s63-epic-16-3-usage-settlement.test.mjs
```

Result: 5 test files passed, 0 failed.

The existing IMP-02D scope fixture now creates valid Agents before querying direct Agent routes. Its cross-Agent assertions are unchanged; this aligns the test with the repaired `404` unknown-Agent versus `200 []` valid-empty contract.

Standalone frontend validation was intentionally unchanged:

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run test`: 10 passed, 0 failed.
- `npm run build`: pass.

The standalone build retains existing `stream` browser externalization and chunk-size warnings.

## Canonical host suite

The restricted sandbox run produced 108 passed and 8 EPIC-15 loopback/process failures. The same isolated serial command passed in the canonical host environment:

```text
ACS_RUNTIME_DATABASE_PATH=/tmp/acs-imp-02d1-runtime.sqlite \
node --test --test-concurrency=1 tests/*.test.mjs
```

Result: **694 total, 690 passed, 0 failed, 4 PostgreSQL-gated skips**.

The skips were the existing tests gated by absent `ACS_SH_DATABASE_URL`:

- IMP-01B PostgreSQL lineage/outbox/idempotency/replay/evidence/accounting.
- VAL-01 PostgreSQL durable acceptance.
- SH02 PostgreSQL transaction/CAS acceptance.
- SH03 two-connection shared rate-limit acceptance.

## PostgreSQL decision

Dedicated PostgreSQL revalidation was not required. The changed Product API paths use the synchronous control-plane runtime map, `AuditService`, and existing file/in-memory administrative audit store; no `AsyncAuditEventStore`, PostgreSQL query, shared-state schema, migration, index, persistence behavior, or accounting durability code changed. The canonical host suite preserved the existing PostgreSQL gates as skips.

## Query-shape assessment

- Runs filter canonical Agent and isolation scope while iterating the existing runtime map, retaining at most `offset + limit` records. No unbounded result array is created and then sliced.
- Evidence filters canonical Agent scope through `AuditService.forEachEvent()` and retains at most `offset + limit` derived Evidence records. No unbounded matching Evidence array is created and then sliced for bounded direct Agent reads.
- Current in-memory/file stores still require a linear scan of their resident state. That is a performance limitation of the existing storage implementation, not a client-side or result-materialization leak. No unapproved index or schema work was introduced.

## Localhost API validation

No browser validation was required or authorized for this backend-only milestone, and frontend behavior remains on the accepted IMP-02D PARTIAL state.

A disposable real HTTP Product API server passed the localhost probe at:

```text
http://127.0.0.1:41295/api/v1
```

The server used in-memory Agent A (`agent-imp-02d1-local-a`), Agent B (`agent-imp-02d1-local-b`), and Agent C (`agent-imp-02d1-local-c`) fixtures and closed after the probe. It verified:

- Agent A Runs: first page 50 and second page 5; every Run belonged to Agent A.
- Agent A Evidence: first page 50 and second page 5; every Evidence record retained Agent A's canonical entity reference.
- Generic Evidence `agentId` filter: Agent A records only.
- Agent A economics projections and Usage: Agent B contribution absent.
- Agent C Runs and Evidence: valid empty arrays.

The fixture recorded 55 Agent A Runs, 55 Agent A derived Evidence records, and non-sensitive Usage record `usage-local-a`. No production data, credentials, or external systems were used.
