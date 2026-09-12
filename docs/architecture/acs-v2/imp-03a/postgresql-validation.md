# PostgreSQL validation

The durable acceptance environment used for IMP-03A is PostgreSQL through the
repository's `ACS_SH_DATABASE_URL`. The focused suite creates isolated schemas
for clean initialization and upgrade checks, then validates:

- migration 1 through 4 and repeat migration idempotence;
- create and reload of Workforce identity and revisions;
- role v1/v2 historical resolution;
- pinned and unresolved admission selectors;
- stale-head and concurrent-write rejection;
- idempotent replay and conflicting key reuse;
- atomic event/outbox/idempotency writes under injected failures; and
- lifecycle persistence through archive.

The final run result is recorded in `acceptance-report.md`. No external
framework or process-local cache is required for reconstruction. The
disposable PostgreSQL resource could not be inspected or stopped from this
execution context because access to the Docker socket was denied.
