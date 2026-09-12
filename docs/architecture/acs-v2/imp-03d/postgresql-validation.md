# PostgreSQL validation

The acceptance run used the canonical `.env.local` value `ACS_SH_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/acs_imp_03a` and isolated PostgreSQL schemas created by the existing tests. The endpoint was reachable through the repository PostgreSQL container.

Migration 7 is additive after schema 6. It creates `acs_runtime_execution_intents` and `acs_runtime_attempts`, with foreign keys to the accepted Run, assignment, and intent records; positive generation/revision checks; assignment and task indexes; and uniqueness for one intent per assignment and one Attempt per intent. Immutable member-slot, Agent revision, and Workforce revision values are retained in the canonical JSON payload alongside the indexed scalar bindings.

The combined durable focused run passed with zero skips: 25/25 tests passed, comprising IMP-03A 7/7, IMP-03B 4/4, IMP-03C 5/5, IMP-03D 8/8 (5 contract and 3 PostgreSQL), and VAL-01 1/1. The IMP-03D PostgreSQL and VAL-01 subset was repeated with 4/4 passed and zero skips. The run covered migration initialization and upgrade paths already present in the repository, restart reload, exact historical identity after head advance, idempotency, CAS/concurrency, rollback, event/outbox behavior, checkpoint recovery, leases, and fencing.

The full PostgreSQL-backed repository run on September 12, 2026 reported 718 total, 718 passed, 0 failed, and 0 skipped.
