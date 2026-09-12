# Application acceptance

The running application at `http://localhost:3000/workforces/new` was inspected against its connected Product API on September 12, 2026. It presented the Create Workforce form, required canonical policy references, and displayed the local Workforce tree with unavailable detail sections until a Workforce is selected.

No form was submitted against the user's persistent local host. Initial creation is already proven through the schema-isolated real HTTP acceptance test.

Standalone validation:

| Check | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm test` | 13 pass, 0 fail, 0 skip |
| `pnpm lint` | 0 errors; 10 pre-existing Fast Refresh warnings |
| `pnpm build` | PASS |
| `pnpm test:browser` | 88 `PASS_WITH_CAVEAT`, 0 failures |

The browser matrix uses static preview without Product API and therefore does not replace an integrated browser proof. Full integrated Workforces → Runs → runtime presentation is blocked by VAL-03-DEFECT-001.

Static inspection found no Workforce application import of `nativeCore`, PostgreSQL, SQLite, CAMEL, or Eigent. The application uses `product-api.ts` and HTTP fetches.
