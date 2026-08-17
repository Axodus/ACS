# AEES-SH Regression Inventory

## Added coverage

| Artifact | Coverage |
| --- | --- |
| `tests/s59-post-15-5-aees-sh-shared-state.test.mjs` | fail-closed config, unavailable DB health, transaction rollback, cross-connection CAS and shared rate bucket |
| `scripts/aees-sh-control-plane-instance.mjs` | independent process/HTTP acceptance instance |
| `scripts/certify-aees-sh.mjs` | dual-process state, contention, fencing, failover, DB outage/reconnect and evidence |

## SH execution

| Check | Result |
| --- | --- |
| S59 | `3/3 PASS` |
| SH03 process scenarios | `20/20 PASS` |
| sensitive evidence scan | `0 matches` |
| no-emit TypeScript | `PASS` |
| writable `/tmp` build | `PASS` |
| official repository backend build | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` writing `dist/` |
| official repository frontend build | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` writing `tsconfig.app.tsbuildinfo` |
| writable `/tmp` frontend build | `PASS` |
| integrated regression inventory | `92/92 PASS` after correction of the disposable database test credential |

## Final regressions

The final validation executed:

- `git diff --check`: `PASS`;
- `npx tsc -p tsconfig.json --noEmit`: `PASS`;
- backend build in writable `/tmp`: `PASS`;
- frontend build in writable `/tmp`: `PASS`;
- B01/B02/C01/C02/D/E/F/G-related suites: `PASS`;
- Tenant/governance/audit/isolation: `PASS`;
- runtime/recovery/economics/deployment: `PASS`;
- S58 MH preflight: `PASS`;
- S59 SH: `3/3 PASS`;
- SH03 final process acceptance: `20/20 PASS`.

The first aggregate run reported `90/92 PASS` because its PostgreSQL URL used a username/password different from the already-created disposable container. After normalizing that isolated acceptance role, the two database-backed S59 cases passed. Classification: `TEST_ENV_CONFIGURATION`, not a product defect or retry-dependent race.
