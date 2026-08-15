# EPIC-15 Regression Inventory

## Status

~~~text
Status: COMPLETE
Result: PASS
~~~

## Backend and API regression suites

| Suite | Result | Notes |
| --- | --- | --- |
| tenant-domain-lifecycle | PASS | Canonical tenant lifecycle and archive semantics |
| tenant-membership-authority | PASS | Membership, owner invariants, authority scope |
| tenant-governance-decision-evaluation | PASS | Governance, entitlements, limits, decision receipts |
| boundary-enforcement | PASS | C02 enforcement boundaries |
| tenant-consumption | PASS | Tenant-scoped consumer paths |
| operational-hardening | PASS | Isolation and hardening coverage |
| s22-isolation | PASS | Cross-tenant isolation regressions |
| s30-governance-boundary | PASS | Governance boundary regressions |
| s34-epic-15-governance-enforcement-boundaries | PASS | Enforcement adapter and gate ordering |
| s44-epic-15-tenant-administration-product-api | PASS | Administrative Product API and audit routes |

## Build and typecheck validation

| Check | Result | Notes |
| --- | --- | --- |
| `npx tsc -p tsconfig.json --outDir /tmp/epic15-e02-dist --declaration false --emitDeclarationOnly false --rootDir src` | PASS | Temporary backend emit used for verification |
| `npm run build` | PASS | Official backend build completed |
| `npx tsc -p static/tsconfig.app.json --noEmit` | PASS | Frontend typecheck completed |
| `npm --prefix static run build` | PASS | Official static build completed |

## Browser acceptance

| Check | Result | Notes |
| --- | --- | --- |
| Browser acceptance manifest | PASS | `/tmp/acs-epic15-browser-evidence/manifest.json` |
| Routes certified | PASS | 33 tested, 33 passed |
| Viewports certified | PASS | 4 viewports |
| Accessibility checks | PASS | 33 checks |
| Horizontal overflow | PASS | 0 failures |
| Page errors | PASS | 0 |
| Console errors | PASS | 0 |
