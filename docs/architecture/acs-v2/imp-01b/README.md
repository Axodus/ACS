# ACS-V2-IMP-01B — Durable Foundations Completion

**Status:** PARTIAL

**Date:** 2026-09-10

**Authority:** Axodus CTO

**Production migration:** Not authorized or executed.

## Scope delivered

IMP-01B adds the ACS-owned PostgreSQL persistence boundary required by
REQ-04. It adapts `PostgresSharedAuthoritativeState`; it does not add a second
store, a broker, a provider SDK, an external runtime, or a new canonical
authority.

The additive v3 migration extends the existing Agent tables for native v2
lineage and adds separate tables for canonical events, delivery outbox records,
generic durable idempotency, fenced checkpoints, and native evidence. Native
usage and cost reuse the existing `acs_economic_records` repository substrate.

## Implemented

| Area | Implementation | Preserved boundary |
| --- | --- | --- |
| Agent lineage | `PostgresNativeCoreRepository.advanceAgentLineage` | ACS Agent identity remains canonical; revisions append and advance the head through expected-head CAS. |
| Fingerprints and reconstruction | `getAgentLineage` validates contiguous revisions, predecessor links, head state, and fingerprints. | Invalid persisted lineage fails closed. |
| Canonical events | `acs_native_events` and `appendEvent` | Event is distinct from Audit, Evidence, and runtime events. |
| Transactional outbox | `acs_native_outbox`, lease/ack/retry methods | Delivery is at-least-once and begins only after the command transaction commits. |
| Idempotency | `acs_native_idempotency` and `idempotent` | Same scope/key/request hash returns the original result; conflicts are explicit. |
| Fenced checkpoint | `recordFencedCheckpoint` | Existing runtime assignment, lease, worker identity, and fencing ownership remain authoritative. |
| Evidence | `acs_native_evidence` | Evidence references an Event and subject; it does not become an Audit or Event row. |
| Usage and cost | `recordAccounting` with `native_usage` and `native_cost` economic records | ACS retains accounting ownership; no pricing, settlement, or provider authority was added. |
| Replay | `replayEvents` | Reads canonical events in stream order only; it does not dispatch or re-execute external work. |

## Reused

- PostgreSQL migration registry, advisory migration lock, transactions, and
  shared-state health checks.
- Existing `acs_agents`, `acs_agent_history`, `acs_economic_records`, and
  durable runtime assignment/worker tables.
- Existing Agent, Event, Evidence, Usage, Cost, Checkpoint, lease, fencing,
  and validation contracts from IMP-01.

Legacy Agent repository operations are explicitly constrained to
`record_kind = 'legacy'`. Native v2 records use `record_kind = 'native_v2'` so
the legacy mutable/remove path cannot operate on canonical native lineage.

## Contract traceability

The complete REQ-03 and REQ-04 matrix is maintained in
[implementation traceability](../imp-01/implementation-traceability.md).

| REQ-04 contract | Code | Conformance test |
| --- | --- | --- |
| Agent lineage and expected-head CAS | `src/control-plane/shared-state/native-core-durable.ts` | `tests/acs-v2-imp-01b.test.mjs` |
| Additive durable schema | `src/control-plane/shared-state/migrations.ts` v3 | `tests/acs-v2-imp-01b.test.mjs` |
| Event/outbox/idempotency atomicity | `native-core-durable.ts` command boundaries | `tests/acs-v2-imp-01b.test.mjs` PostgreSQL gate |
| Recovery/replay/fencing/evidence/accounting | `native-core-durable.ts`, existing runtime repository | `tests/acs-v2-imp-01b.test.mjs`; `tests/s49-epic-15-5-durable-runtime-state.test.mjs` |

## Validation evidence

Latest focused validation:

```text
npm run build
git diff --check
node --test tests/acs-v2-imp-01.test.mjs tests/acs-v2-imp-01b.test.mjs \
  tests/s49-epic-15-5-durable-runtime-state.test.mjs \
  tests/s59-post-15-5-aees-sh-shared-state.test.mjs \
  tests/s74-epic-16-6-account-identity-boundary.test.mjs
```

The PostgreSQL section of `acs-v2-imp-01b.test.mjs` is skipped only because
`ACS_SH_DATABASE_URL` is not configured. The local environment also has no
`postgres`, `initdb`, `pg_ctl`, `psql`, or Docker executable. Therefore no
actual PostgreSQL migration, restart reconstruction, CAS, atomic rollback,
outbox recovery, or fenced-write result can be claimed.

An elevated repository run completed with 690 tests: 681 passed, 6 failed, and
3 skipped. Five failures remain the documented `ACS-BLOCKER-014` cases. The
sixth is an unrelated local default SQLite runtime-path failure in `s43`; it
passes with an isolated `ACS_RUNTIME_DATABASE_PATH` and is not changed by this
milestone.

The final sandboxed `npm test` rerun was not comparable: 81 of 113 files
passed and 32 failed after multiple files could not open the shared default
SQLite runtime path. It did confirm the same local-path condition, including
`s43`; it is not used as regression evidence for IMP-01B.

## Acceptance-gate status

| REQ-04 gate | Status | Evidence boundary |
| --- | --- | --- |
| Migration safety | PARTIAL | Additive migration structure is tested; PostgreSQL application is pending database access. |
| Agent reconstruction, immutability, CAS, fingerprints | PARTIAL | Test implementation covers the scenario, including close/reopen; execution is pending PostgreSQL. |
| Event/outbox/idempotency atomicity and recovery | PARTIAL | Command implementation and test coverage exist; failure-mode execution is pending PostgreSQL. |
| Fenced checkpoint and runtime recovery | PARTIAL | Existing runtime durability tests pass; native PostgreSQL fenced-checkpoint execution is pending PostgreSQL. |
| Evidence and usage/cost durability | PARTIAL | Repository code and PostgreSQL gate exist; execution is pending PostgreSQL. |
| Replay isolation | PASS (code boundary) / PARTIAL (durability) | Replay only reads `acs_native_events`; durable replay execution is pending PostgreSQL. |
| Projection rebuild | NOT APPLICABLE | REQ-04 explicitly excludes a v1 projection subsystem. |

## Blockers

`ACS-BLOCKER-014` remains HIGH / OPEN:

- `s27` operational evidence HTTP behavior (`405`, expected `200`)
- `s54` observability/rate limiting (`429`, expected `200`)
- `s57` production target process resolution (missing target server module)
- `s62` missing `createControlPlaneContext` export
- `s63` usage/reservation correlation

The additional `s43` failure is a local runtime database-path condition outside
the IMP-01B changes. Its isolated-path rerun passes; it is recorded separately
and has not been reclassified as an ACS-BLOCKER-014 item.

## Deviations

None from REQ-04. The milestone is PARTIAL because required PostgreSQL
integration evidence is unavailable, not because the frozen contract was
changed.

## New dependencies

None.

## Security impact

No material security-boundary change. Canonical ownership remains in the ACS
control plane, provider/executor identifiers remain references or observations,
and persisted native contract validation rejects secret-like payloads.

## Unresolved contract questions

None. The remaining need is execution evidence against a disposable PostgreSQL
database, followed by normal review of the existing unrelated blockers.

## Files changed

- `src/control-plane/shared-state/native-core-durable.ts`
- `src/control-plane/shared-state/migrations.ts`
- `src/control-plane/shared-state/contracts.ts`
- `src/control-plane/shared-state/postgres-shared-state.ts`
- `src/index.ts`
- `tests/acs-v2-imp-01b.test.mjs`
- schema-version expectation updates in `tests/s59-post-15-5-aees-sh-shared-state.test.mjs` and `tests/s74-epic-16-6-account-identity-boundary.test.mjs`
- this report and the IMP-01 traceability matrix

## Next recommended milestone

Provide a disposable PostgreSQL environment and execute every applicable
REQ-04 acceptance gate. Do not begin Workforce, orchestration, Product API v2,
provider integration, or production migration as part of that validation.
