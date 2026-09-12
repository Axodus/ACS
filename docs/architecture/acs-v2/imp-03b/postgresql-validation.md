# PostgreSQL validation

On September 11–12, 2026, `ACS_SH_DATABASE_URL` was configured locally through
ignored `.env.local` against the existing PostgreSQL 17.6 disposable instance.
The database was reachable and PostgreSQL-gated tests ran without skips.

Observed final results:

- IMP-03A PostgreSQL suite: 7 passed, 0 failed, 0 skipped; repeated twice.
- IMP-03B focused contract tests: 4 passed, 0 failed, 0 skipped.
- VAL-01 PostgreSQL durable acceptance: 1 passed, 0 failed, 0 skipped.
- S46 production configuration suite: 6 passed, 0 failed; repeated twice.
- Full repository suite: 705 total, 705 passed, 0 failed, 0 skipped.

The migration tests preserve v4 intermediate coverage and verify the canonical
v5 snapshot table after upgrade. The IMP-03B tests preserve the accepted
immutable admission, revision binding, snapshot, idempotency, event/outbox,
and legacy compatibility contracts. No production code, migration, or
Usage/Cost semantics changed during this remediation.

The original reported 705/701/4/0 snapshot is documented in
`docs/architecture/acs-v2/blockers/acs-blocker-016/README.md`, including the
three reproduced failures, the non-reproduced fourth report, and their causal
classifications.
