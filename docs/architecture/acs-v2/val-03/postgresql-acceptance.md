# PostgreSQL acceptance

| Item | Value |
| --- | --- |
| Container | `acs-imp03a-pg` |
| Image / server | `postgres:17.6-alpine` / PostgreSQL 17.6 |
| Host publication | `127.0.0.1:55433 → 5432/tcp` |
| Database | `acs_imp_03a` |
| Schema strategy | a fresh `val03_<timestamp>_<pid>` schema per test; dropped in `finally` |
| State configuration | `ACS_STATE_BACKEND=shared` |
| Database configuration | `ACS_SH_DATABASE_URL` from `.env.local`; credentials intentionally omitted |

The validation target is the accepted loopback endpoint `127.0.0.1:55433`, not the unrelated `5433` endpoint. PostgreSQL was reachable and reported the `public` default schema before each isolated test schema was created.

`npm run check` with this configuration completed in 107633 ms with 731 passing, 1 failing, and 0 skipped tests. The failure is VAL-03-DEFECT-001.

No migration was created. The existing `acs_native_runs_workforce_idx` index is defined on `(workforce_id, workforce_revision, run_id)`.
