# ACS-BLOCKER-016 — Post-Migration Regression & Production Config Test Remediation

**Date:** September 12, 2026  
**Status:** RESOLVED / ACCEPTED  
**Owner:** Axodus CTO  
**Scope:** Regression remediation after ACS-V2-IMP-03B

## Original failure set

The reported blocker snapshot was **705 total, 701 passed, 4 failed, 0
skipped**. The first authoritative reproduction from the current working tree
was **705 total, 702 passed, 3 failed, 0 skipped**. The fourth reported
failure did not reproduce in that run or in the final canonical run and is
recorded below as a stale earlier snapshot rather than being given an invented
remediation.

## Failure causality matrix

| Test | Suite | Failure message | Expected | Actual | Reproducible | Relevant files | First known causal change | IMP-03A relation | IMP-03B relation | Accepted invariant | Classification | Required remediation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `IMP-03A PostgreSQL durable Workforce acceptance` | `tests/acs-v2-imp-03a.test.mjs` | `4 !== 5` | Latest canonical migration version | Migration v5 | Yes in pre-fix baseline | `tests/acs-v2-imp-03a.test.mjs`, shared-state migration exports | IMP-03B migration v5 became canonical after the earlier v4 expectation was written | Direct regression in the latest-schema assertion; IMP-03A semantics remain valid | Caused by the additive v5 migration, without defect in v5 | Clean database applies canonical migrations through v5 | **STALE EXPECTATION AFTER CANONICAL MIGRATION** | Assert `SHARED_STATE_SCHEMA_VERSION`; preserve separate v4 intermediate coverage |
| `IMP-03A upgrades the accepted v3 schema additively and preserves legacy rows` | `tests/acs-v2-imp-03a.test.mjs` | `4 !== 5` | Latest schema after upgrading from v3 | Migration v5 | Yes in pre-fix baseline | `tests/acs-v2-imp-03a.test.mjs`, shared-state migrations | IMP-03B migration v5 followed the accepted v4 migration | Indirect compatibility regression in the latest-schema assertion; v3-to-v4 history remains tested | Caused by canonical v5 being applied after v4 | v3 legacy rows survive v4 and v5; v5 snapshot tables exist | **STALE EXPECTATION AFTER CANONICAL MIGRATION** | Assert the canonical version and verify v4-created state plus v5 snapshot tables |
| `production profile rejects insecure secret and economic fallback` | S46 production configuration suite | `WorkerIdentityConfigurationError` during production-profile setup | A valid production profile with explicit remote runtime configuration | Fixture used removed `runtimeDatabasePath` and did not select remote runtime mode | Yes in pre-fix baseline; passed focused and repeated after fix | `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`, `src/http/control-plane-context.ts` | Runtime configuration was renamed to `runtimeStatePath` and production remote mode became explicit | No IMP-03A causality | No IMP-03B causality | Production configuration requires the accepted runtime topology and production-oriented adapters | **OTHER — STALE TEST FIXTURE** | Update the fixture to use `runtimeMode: "remote"` and `runtimeStatePath`; production code was already correct |
| Earlier reported fourth failure: IMP-02D1 schema expectation | IMP-02D1 operational query compatibility | Earlier snapshot recorded `4 !== 5` | Current canonical schema version | Earlier test setup observed v5 while retaining a v4 expectation | No: absent from the current authoritative baseline and final run | Earlier IMP-02D1 snapshot/test context; current canonical migration exports | Earlier pre-remediation snapshot, before the current run was reproduced | No current IMP-03A failure | No current IMP-03B failure | A current canonical schema assertion must follow v5 | **PRE-EXISTING / UNRELATED** | No remediation under ACS-BLOCKER-016; retained as a historical non-reproduced report and not used to mask any current failure |

The fourth row is intentionally separate from the three failures reproduced in
the current baseline. It was independently checked by rerunning the canonical
suite; it did not recur. No retry, skip, suppression, assertion deletion, or
database cleanup was used to obtain the final result.

## Migration v4/v5 root cause

The affected IMP-03A assertions proved the latest schema after applying the
canonical migration chain. They did not prove that migration v4 was the final
migration. Their literal expectation of `4` became stale when IMP-03B added
canonical migration v5.

The remediation uses `SHARED_STATE_SCHEMA_VERSION` for latest-schema
assertions. The v3 upgrade test still begins from schema version 3, verifies
the preserved legacy row and v4-created Workforce state, applies migrations
idempotently, and now verifies the v5
`acs_workforce_run_membership_snapshots` table. This preserves both paths:

```text
clean database -> canonical migrations -> v5
pre-v4 -> v4 -> expected v4 state -> v5 -> expected current state
```

No migration implementation changed.

## S46 root cause

S46 validates that the production profile uses production-oriented secret,
economic, settlement, identity, worker identity, and telemetry boundaries and
that the production-readiness endpoint reports the expected state. The
production implementation already enforces explicit runtime configuration.
The fixture supplied the removed `runtimeDatabasePath` option and omitted
`runtimeMode: "remote"`, so setup selected an invalid production path and
raised `WorkerIdentityConfigurationError` before the behavioral assertions.

The smallest correct change was test-fixture alignment with the accepted
configuration: `runtimeMode: "remote"` and `runtimeStatePath`.

## Fourth failure root cause

The fourth failure existed in the reported 705/701/4/0 snapshot as an earlier
IMP-02D1 schema expectation of `4 !== 5`. It was not present in the reproduced
705/702/3/0 baseline and did not appear in the final 705/705/0/0 run. Because
there is no deterministic current reproduction, no code or test change was
made for it. The historical observation is documented as a pre-existing,
unrelated stale snapshot rather than treated as a current defect.

## What changed

### Tests

- `tests/acs-v2-imp-03a.test.mjs`: latest-schema assertions now follow the
  canonical schema constant; v4 coverage remains explicit and v5 snapshot
  tables are verified after upgrade.
- `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`: the
  production fixture now uses the accepted remote runtime options.

### Fixtures

The S46 production-profile fixture was corrected. No PostgreSQL fixture
cleanup or global state reset was added.

### Production code

**NONE.** The S46 failure was caused by an obsolete test option and missing
explicit fixture mode, not by production behavior.

### Migrations

**NONE.** Canonical migration v5 was preserved unchanged.

### Documentation

- Added this blocker record.
- Updated the IMP-03B acceptance and PostgreSQL validation reports with final
  factual results.

## Why the changes are correct

The two migration edits change only stale expectations for tests whose intent
is the latest canonical schema. The v4 intermediate invariant remains
meaningfully covered, and the v5 snapshot table is checked after the upgrade.
The S46 edit makes the test construct the production configuration that the
existing implementation accepts. No accepted Workforce, Agent, Run,
event/outbox, idempotency, migration, legacy compatibility, or Usage/Cost
contract was changed.

## Files changed

- `tests/acs-v2-imp-03a.test.mjs`
- `tests/s46-epic-15-5-production-secrets-economic-adapters.test.mjs`
- `docs/architecture/acs-v2/blockers/acs-blocker-016/README.md`
- `docs/architecture/acs-v2/imp-03b/acceptance-report.md`
- `docs/architecture/acs-v2/imp-03b/postgresql-validation.md`

## Validation evidence

PostgreSQL was reachable through the ignored local `.env.local` configuration
at PostgreSQL 17.6. No PostgreSQL-gated test was skipped.

- IMP-03A PostgreSQL suite: **7 passed, 0 failed, 0 skipped**; repeated twice.
- IMP-03B focused suite: **4 passed, 0 failed, 0 skipped**.
- VAL-01 PostgreSQL: **1 passed, 0 failed, 0 skipped**.
- S46 focused suite: **6 passed, 0 failed**; repeated twice.
- Fourth-failure owning check: no current failure reproduced; canonical rerun
  remained green.
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.

The final canonical command was:

```text
bash -c 'set -a; source .env.local; set +a; exec npm test'
```

Final repository result: **705 total, 705 passed, 0 failed, 0 skipped**.

## Contract and scope review

- Contract changes: **NONE**.
- Usage/Cost changes: **NONE**; attempt attribution remains additive
  compatible in conclusion and deferred in implementation.
- IMP-03B immutable membership, exact Workforce and Agent revision binding,
  current-head admission resolution, member-slot snapshots, role-history
  validation, idempotency, event/outbox atomicity, migration v5, and legacy
  non-Workforce Run compatibility remain intact.
- No IMP-03C, coordination, assignment, scheduling, runtime compilation, UI,
  provider, topology, security, or deployment work was performed.
- CTO decisions required: **NONE**.
- CEO decisions required: **NONE**.

## Closure decision

All four reported failures were individually classified, the three current
failures were remediated at their actual cause, focused and repeated checks
passed, and the canonical repository suite reached zero failures and zero
skips.

**Recommendation: IMP-03B CAN BE CLOSED**
