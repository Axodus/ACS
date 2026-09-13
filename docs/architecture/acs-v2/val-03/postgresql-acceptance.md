# PostgreSQL acceptance

| Item | Value |
| --- | --- |
| Container | `acs-imp03a-pg` |
| PostgreSQL | 17.6 (`postgres:17.6-alpine`) |
| Host publication | `127.0.0.1:55433 → 5432/tcp` |
| Database | `acs_imp_03a` |
| Configuration | `ACS_STATE_BACKEND=shared`; `ACS_SH_DATABASE_URL` from `.env.local`, credential redacted |
| Schema strategy | fresh `val03_<timestamp>_<pid>` schema per scenario, dropped in `finally` |

The canonical endpoint is `127.0.0.1:55433`, not `5433`. The Core/PostgreSQL baseline passed 732 / 732 with 0 skips in 117498.785661 ms before the current Application selector change. The current repository run is 731 / 732, with the sole failure `VAL-03-DEFECT-003`; PostgreSQL durability is not the failing boundary.

No migration was required. Workforce-scoped Run reads retain the existing `acs_native_runs_workforce_idx` relationship index.
