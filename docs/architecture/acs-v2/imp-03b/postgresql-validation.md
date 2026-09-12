# PostgreSQL validation

The focused IMP-03B contract tests and build pass locally. PostgreSQL acceptance requires `ACS_SH_DATABASE_URL`; that environment was not configured during this implementation turn, so migration, reload, concurrency, idempotent replay, and failure-injection acceptance remain pending.
