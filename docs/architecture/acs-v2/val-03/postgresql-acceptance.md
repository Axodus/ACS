# PostgreSQL acceptance

| Item | Value |
| --- | --- |
| Container | `acs-imp03a-pg` |
| PostgreSQL | 17.6 (`postgres:17.6-alpine`) |
| Host publication | `127.0.0.1:55433 → 5432/tcp` |
| Database | `acs_imp_03a` |
| Configuration | `ACS_STATE_BACKEND=shared`; `ACS_SH_DATABASE_URL` from `.env.local`, credential redacted |
| Schema strategy | fresh `val03_<timestamp>_<pid>` schema per scenario, dropped in `finally` |

The canonical endpoint is `127.0.0.1:55433`, not `5433`. The historical
host-capable baseline recorded 732 / 732 with 0 skips before the
`ACS-BLOCKER-020` application boundary remediation. The blocker then recorded
the canonical Agent inventory correction and its integrated regression evidence.
The former `VAL-03-DEFECT-003` failure was an Application/Product API boundary
issue, not a PostgreSQL durability failure, and is now resolved.

No migration was required. Workforce-scoped Run reads retain the existing `acs_native_runs_workforce_idx` relationship index.
