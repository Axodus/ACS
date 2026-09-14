# EPIC-17-IMP-06 — Slice 3 Evidence Report

## Scope

Slice 3 adds Control Plane composition seams for target and Delegation authority
resolution, and prepares a durable Activation handoff. It preserves the existing
owners: Automation revisions provide historical configuration, canonical target
owners resolve policy targets, the Delegation domain resolves authority, and the
Activation repository owns the atomic durable mutation.

The Slice does not invoke admission, create Runs, execute Workflows, own a
scheduler loop, or invoke OpenClaw.

## Validation

| Check | Result |
| --- | --- |
| Build | PASS |
| Focused Slice 1–3 | 4 files PASS / 0 FAIL / 0 SKIP |
| PostgreSQL | PostgreSQL 17.6, Schema 12, 25 PASS / 0 FAIL / 0 SKIP |
| Full regression | 144 passing files / 10 failing files |
| `git diff --check` | PASS |

The ten full-regression failures are C environmental listener denials
(`listen EPERM`) affecting the existing HTTP/listener acceptance paths. Direct
reproduction confirmed the same denial for `127.0.0.1` and `0.0.0.0`. No Slice
3 functional, architectural, or causal failure was observed: A = 0 and D = 0.

## Atomicity proof

The PostgreSQL test injects a duplicate outbox failure after preparing the
Activation operation has begun. It proves that no prepared head, handoff, Event,
Evidence, outbox row, or idempotency row survives rollback. A succeeding retry
then proves that the same seven artifacts commit together and that replay does
not duplicate the prepared state fact. A changed idempotency request hash is
rejected with `NativeIdempotencyConflictError`.

## Boundary proof

Focused coverage proves PINNED target preservation, delegation to the canonical
resolution seam for `RESOLVED_AT_ACTIVATION`, fail-closed missing target
resolution, and cross-Tenant authority rejection before Delegation lookup. It
also proves canonical fail-closed propagation for revoked and expired Grants,
ineligible Activation state rejection, idempotent replay, and typed conflicting
prepared replay rejection. Its historical test fixes the Activation to revision
1 while the current Automation head is revision 2 with a different target; the
prepared snapshot still contains the revision-1 target. The preparation
coordinator reconstructs the exact Automation revision, materializes the
immutable preparation snapshot, and delegates its only mutation to
`prepareActivationHandoff`.
