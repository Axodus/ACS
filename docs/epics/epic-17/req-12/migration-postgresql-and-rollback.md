# REQ-12 Migration, PostgreSQL and Rollback Constraints

## Shared authority

Any future durable EPIC-17 state uses the existing PostgreSQL/shared-state
authority and transaction conventions. An IMP cannot introduce a parallel
database, event ledger, outbox, idempotency store or persistence service.

The current Native durable repository demonstrates PostgreSQL transactions,
advisory idempotency locks, canonical Events and transactional outbox patterns.
Future contracts must reuse or explicitly extend those owners after approval.

## Per-IMP migration dossier

Every IMP that changes durable or compatibility state must define:

- authoritative old and new representations plus stable identity mapping;
- additive schema objects and migration ownership;
- online/offline and expand/backfill/verify/cutover/contract phases;
- deterministic backfill ordering, checkpointing and idempotent resume;
- source revision/fingerprint/digest and target integrity checks;
- Tenant isolation and row-count/referential reconciliation;
- Event/outbox behavior and whether backfill emits canonical events;
- legacy read/write behavior during transition and the exact dual-write policy;
- cutover preconditions, observation window and abort thresholds;
- rollback/roll-forward procedure and retained compatibility window;
- deletion, retention, privacy and Evidence implications;
- disposable PostgreSQL validation and restart reconstruction evidence.

Dual canonical writes are rejected. If temporary compatibility dual-write is
unavoidable, one owner remains authoritative, the secondary write is explicitly
derived, divergence is detected, and cutover/rollback duration is bounded.

## Migration sequence

1. Add accepted schema/contracts without changing active readers or writers.
2. Backfill from one named source with idempotent checkpoints.
3. Verify identity, fingerprints/digests, Tenant scope and reconstruction.
4. Shadow-read/compare without changing authority.
5. Cut over one bounded command/read path at a time.
6. Observe and reconcile errors/outbox lag/idempotency conflicts.
7. Remove legacy paths only in a later explicitly authorized contraction step.

## Rollback classes

| Change class | Required rollback behavior |
| --- | --- |
| Additive contract/projection | Disable route/feature exposure and restore prior projection; retain canonical new data for forward recovery. |
| Backfill | Stop/resume by checkpoint; never delete source; mark incomplete target unavailable. |
| Write cutover | Route new commands back to the prior authoritative adapter only if doing so preserves accepted owner semantics; otherwise stop mutation and roll forward. |
| Immutable lineage/event | Append correction/reconciliation; never rewrite committed history. |
| Secret/credential metadata | Revoke/rotate via existing credential owner; never restore raw secret from logs/snapshots. |
| Memory/content deletion | Rollback cannot resurrect validly erased content; preserve content-free proof/tombstone only. |
| Activation/admission | Stop new claims/admissions; reconcile existing Runs through current cancellation/recovery owners. |
| UI | Revert presentation while leaving server-side authority and canonical state unchanged. |

## PostgreSQL acceptance

A database-affecting IMP must validate migrations against a disposable supported
PostgreSQL instance, including clean install, upgrade from the declared
baseline, restart, concurrent CAS/idempotency, outbox recovery, failed
transaction rollback, Tenant isolation and representative backfill/cutover.

Tests that skip because a database URL is absent remain skips and cannot count
as PostgreSQL acceptance. Production migration and destructive schema
contraction require separate authority after local/disposable acceptance.
