# EPIC-15.5 Regression Inventory

**Updated:** 2026-08-16 for AEES-G.

| Coverage | Suites/evidence | Latest result |
| --- | --- | --- |
| Tenant domain/lifecycle | `tenant-domain-lifecycle` | PASS |
| Membership/authority | `tenant-membership-authority` | PASS |
| Governance decisions/enforcement | `tenant-governance-decision-evaluation`, `s30`, `s34` | PASS |
| Tenant isolation | `s22`, `s44` | PASS |
| B01 durability/HTTP | `s45` | PASS |
| B02 secrets/economics | `s46` | PASS |
| C01 identity | `s47` | PASS |
| C02 edge | `s48` | PASS against current temporary emit |
| D01 durable runtime | `s49` | PASS |
| D02 remote worker | `s50` | PASS 3/3 isolated; one parallel contention failure recorded |
| D03 process acceptance | `s51` | PASS |
| E01 telemetry | `s52` | PASS |
| E02 diagnostics/readiness | `s53` | PASS |
| E03 incident acceptance | `s54` | PASS |
| Control Plane hardening/current projections | `s28` | PASS against current temporary emit |
| F01/F02 contracts | `s55` | PASS against current temporary emit |
| F03 browser | AEES-F manifest | 56/56 route-viewports; journeys A–G PASS |
| G01/G02/G03 | `s56-epic-15-5-production-deployment-gate.test.mjs` | durable revisions, aggregate denials/allows, health, degradation and rollback |
| G UX | standalone typecheck/build plus `aees-g-production-deployment-ux.test.mjs` | backend-authoritative decision, confirmation and rollback wiring |
| G browser regression | AEES-G browser manifest | four-viewports AEES-F route matrix with the production gate present |

## AEES-F validation commands

```bash
npx tsc -p tsconfig.json --noEmit
npm run build
npx tsc -p tsconfig.json \
  --outDir /tmp/acs-epic15-5-aees-f-final \
  --declaration false \
  --emitDeclarationOnly false \
  --rootDir src

ACS_TEST_DIST_ROOT=/tmp/acs-epic15-5-aees-f-final \
  node --test \
  tests/s48-epic-15-5-distributed-rate-limiting-http-edge.test.mjs \
  tests/s55-epic-15-5-operational-ux-contract.test.mjs

npm --prefix .design/app-standalone run typecheck
npm --prefix .design/app-standalone run lint
npm --prefix .design/app-standalone run build
npx tsc -p static/tsconfig.app.json --noEmit
npm --prefix static run build
```

## Build environment classification

The official backend emit fails with `TS5033`/`EROFS` while writing `dist`. The official static build similarly fails writing `tsconfig.*.tsbuildinfo`. These are **ENVIRONMENT BLOCKERS**, not hidden PASS results. Backend no-emit typecheck, temporary backend emission, both frontend typechecks and the main Control Plane build pass. A temporary static Vite build is used to validate bundling when the official composite build cannot write its build-info files.

## Browser evidence

Manifest: `/tmp/acs-epic15-5-aees-f-evidence/manifest.json`.

The manifest is intentionally external evidence and is not committed. It records topology, routes, viewports, process IDs, mutations, runtime IDs, diagnostics and sensitive-data review.
