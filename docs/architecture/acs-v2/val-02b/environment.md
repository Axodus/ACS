# VAL-02B Environment

| Item | Value |
| --- | --- |
| Date | 2026-09-10 |
| Repository | `/opt/Axodus/ACS` |
| Branch / commit | `dev` / `67dba463ca651f8b38e0ce1c3f4887e25f924a1d` |
| OS | Linux 7.0.0-31-generic, x86_64 |
| Node.js | v24.20.0 |
| npm / pnpm | 12.0.2 / 12.3.4 |
| Backend build | `npm run build` |
| Product API | `npm run http`, `0.0.0.0:8788` (`127.0.0.1:8788` used by clients) |
| Standalone frontend | `pnpm dev:local`, Vite port 3000 |
| Database mode | Local durable SQLite runtime; no `ACS_SH_DATABASE_URL` |
| PostgreSQL | Not configured; four explicit PostgreSQL tests skipped |
| Host constraints | Restricted sandbox rejects loopback binds with `EPERM`; host reruns were required for loopback/process acceptance tests |

The validation used no production credentials or production records. Relevant
environment configuration was the local API origin
`http://127.0.0.1:8788/api/v1`; secret values are omitted.

## Commands

```text
npm run build
node tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs
node tests/s50-epic-15-5-remote-worker-dispatch.test.mjs
node tests/s51-epic-15-5-distributed-runtime-acceptance.test.mjs
node tests/s52-epic-15-5-structured-telemetry.test.mjs
node tests/s54-epic-15-5-observability-incident-acceptance.test.mjs
node tests/s55-epic-15-5-operational-ux-contract.test.mjs
node tests/s56-epic-15-5-production-deployment-gate.test.mjs
node tests/s57-epic-15-5-production-target-process-acceptance.test.mjs
ACS_RUNTIME_DATABASE_PATH=/tmp/acs-val-02b-runtime.sqlite \
  node --test --test-concurrency=1 tests/*.test.mjs
npm test
pnpm --dir .design/app-standalone typecheck
pnpm --dir .design/app-standalone lint
pnpm --dir .design/app-standalone build
pnpm --dir .design/app-standalone test
node --test tests/s20-http-integration.test.mjs
```
