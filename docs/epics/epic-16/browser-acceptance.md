# EPIC-16 Browser Acceptance

## Purpose

Browser acceptance proves that financial operations are usable through supported Control Plane surfaces and remain faithful to the accepted `9005e3a` UX/dashboard baseline.

Browser topology for EPIC-16:

- LOCAL may use localhost browser and API origins;
- DEVELOPMENT uses the public Railway HTTPS API origin
  `https://acs-axodus.up.railway.app/api/v1`;
- PRODUCTION uses production HTTPS origins;
- private Railway DNS names are server-side only and must never appear in browser-facing configuration.

## Required coverage

For every new or changed EPIC-16 route, test:

- desktop, tablet and mobile supported viewports;
- light and dark themes where supported;
- loading, ready, empty, error and degraded dependency states;
- keyboard accessibility and visible focus;
- accessible names for controls/status;
- zero horizontal overflow;
- zero unexpected console errors;
- navigation/back/deep-link behavior;
- Tenant-scoped data separation where the harness supports multiple Tenants.

## Financial truth assertions

Browser evidence must explicitly prove:

1. zero is rendered as zero, not unavailable;
2. unavailable data is not rendered as zero when that changes meaning;
3. historical charts are not populated with synthetic data;
4. provider outage is not displayed as successful settlement;
5. estimates, reservations, metered usage and settled values are visually distinguishable;
6. remediation controls appear only when the server-authorized state permits them;
7. decision-gated invoice/payment/tax capabilities are not implied by labels or actions.

## Dashboard baseline

The main Dashboard must preserve the hierarchy accepted at `9005e3a`: expressive KPI cards, clear execution/attention priority, stable visualization regions, lower operational summaries, activity and quick access. EPIC-16 may enrich financial content but must not revert the Dashboard to equal-weight administrative boxes or fabricate time-series detail.

## Evidence manifest

Final milestone evidence should record:

- routes tested;
- viewport dimensions;
- theme;
- certified Git SHA;
- deployment/base URL and source;
- screenshots;
- accessibility result;
- overflow result;
- console result;
- financial-truth assertions;
- failures/waivers with exact rationale.

## Browser acceptance chronology

EPIC-16 separates product acceptance from deployment verification.

PRIMARY — implementation acceptance:

- local Vite + Playwright;
- certifies the working tree before commit/push;
- proves Usage, Settlements, Receipts and no-fake-data on the implementation under test.

The implementation acceptance target may also be an explicit
`AEES_BROWSER_BASE_URL` when that URL already points at the implementation
under test.

SECONDARY — deployment verification:

- Vercel exact-SHA deployment;
- proves the already-certified implementation was published correctly;
- requires deployment SHA == certified implementation SHA and READY status.

FALLBACK:

- remote browser acceptance may replace local acceptance only when the execution
  environment genuinely cannot host Vite/Chromium.

Canonical target order for S05 product acceptance:

1. explicit `AEES_BROWSER_BASE_URL` when it already points at the implementation under test;
2. local Vite URL, typically `http://127.0.0.1:5173`, when the standalone app is reachable;
3. Vercel exact-SHA deployment only as deployment verification, or as fallback when local
   Vite/Chromium cannot run.

Browser-facing environment rules:

- LOCAL may use localhost origins in `VITE_*` values;
- DEVELOPMENT browser values must use a public Railway HTTPS origin such as
  `https://acs-axodus.up.railway.app/api/v1`;
- PRODUCTION browser values must use production HTTPS origins;
- `.railway.internal` values are server-side only and must not appear in
  browser-facing `VITE_*` configuration.

A remote FAIL against a SHA that does not yet contain the implementation is historical
chronology evidence, not a product defect.

The browser manifest should record the base URL source so certification evidence stays
tied to the certified artifact.

## Certified AEES-16-01 evidence

- manifest: `/tmp/acs-aees-16-01-browser-recovery/manifest.json`
- route: `/operations/overview`
- viewports: desktop, tablet, mobile
- themes: light, dark
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- no-fake-data: PASS

## AEES-16-03 browser acceptance target

AEES-16-03 uses local Vite + Playwright as the S05 product-acceptance gate.
Vercel exact-SHA verification remains a secondary deployment gate.

Target route:

- /operations/overview

Target matrix:

- desktop, tablet, mobile
- light and dark themes

Required evidence categories:

- usage correlation visibility;
- settlement lifecycle visibility;
- receipt evidence visibility;
- no fabricated usage or settlement history;
- accessibility, overflow, console, page-error and request-failure checks.

## AEES-16-03 / ACCEPTANCE-RECOVERY-01 evidence

- certified Git SHA: da89456525f50a8e94f06784446332df85399363
- deployment URL: https://acs-hl29hhkoe-axodus.vercel.app
- route: /operations/overview
- matrix: desktop, tablet, mobile x light, dark
- manifest: /tmp/acs-aees-16-03-browser-recovery/manifest.json
- screenshots: /tmp/acs-aees-16-03-browser-recovery/screenshots/
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data on displayed content: PASS
- usage/settlement/receipt surfaces: ABSENT
- result: FAIL
- classification: certified SHA does not include the AEES-16-03 operator surfaces

## AEES-16-03 local product acceptance

- server mode: local-vite
- base URL: http://127.0.0.1:5173
- route: /operations/overview
- matrix: desktop, tablet, mobile x light, dark
- manifest: /tmp/acs-aees-16-03-local/manifest.json
- screenshots: /tmp/acs-aees-16-03-local/screenshots/
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data: PASS
- Usage: PRESENT
- Settlements: PRESENT
- Receipts: PRESENT
- classification: local implementation acceptance PASS; Vercel exact-SHA
  verification remains outstanding

## AEES-16-03 Vercel exact-SHA verification

- deployment URL: https://acs-hixywhj62-axodus.vercel.app
- route: /operations/overview
- matrix: desktop, tablet, mobile x light, dark
- manifest: /tmp/acs-aees-16-03-browser-recovery-final/manifest.json
- screenshots: /tmp/acs-aees-16-03-browser-recovery-final/screenshots/
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data on displayed content: PASS
- usage/settlement/receipt surfaces: PRESENT
- classification: exact-SHA deployment now matches the AEES-16-03 operator surfaces

## AEES-16-03 / HOTFIX-02 — Correct Operations Surface Boundary

The previous local PASS against http://127.0.0.1:5173 is INVALIDATED.
Reason: WRONG APPLICATION BOUNDARY. That evidence certified unauthorized
/static implementation, not .design/app-standalone.

Valid local product acceptance:

- app: .design/app-standalone
- base URL: http://127.0.0.1:3000
- route: /operations/overview
- matrix: desktop, tablet, mobile x light, dark
- manifest: /tmp/acs-aees-16-03-standalone/manifest.json
- screenshots: /tmp/acs-aees-16-03-standalone/screenshots/
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data: PASS
- Usage: PRESENT

## AEES-16-05 local product acceptance

- app: .design/app-standalone
- base URL: http://127.0.0.1:45927
- route matrix: /, /readiness, /system, /system/operational-reliability, /agents, /composition, /operational-execution, /operational-evidence, /economics, /runtime, /logs, /audit, /settings
- viewports: 1440x900, 1280x800, 768x1024, 390x844
- manifest: /tmp/acs-epic14-browser-evidence/manifest.json
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data: PASS

## AEES-16-05 remote development fidelity

- target deployment: https://acs-hixywhj62-axodus.vercel.app/operations/overview
- validation result: PASS

## AEES-16-06 local product acceptance

- app: .design/app-standalone
- base URL: local preview manifest / browser harness evidence
- manifest: /tmp/acs-epic14-browser-evidence/manifest.json
- route matrix: /economics, /operations/overview
- viewports: desktop, tablet, mobile x light, dark
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data: PASS
- workspace consolidation: PASS
- operator journeys: PASS

The acceptance above is historical evidence from the superseded closure at `a7c07f6`. It does not certify the Accounts/SIWX amendment.

## AEES-16-06 Accounts/SIWX amendment — truthful NOT_CONFIGURED acceptance

- checked at: August 23, 2026;
- app: `.design/app-standalone`;
- base URL: `http://127.0.0.1:3000`;
- routes: `/`, `/economics`, `/operations/overview`;
- matrix: desktop/light, desktop/dark, tablet/light, tablet/dark, mobile/light, mobile/dark;
- checks: 18/18 PASS;
- account state: `NOT_CONFIGURED` / `REOWN_DISABLED`;
- account control visible and disabled: PASS;
- structural accessibility baseline: PASS;
- horizontal overflow: 0;
- console errors: 0;
- page errors: 0;
- request failures: 0;
- manifest: `/tmp/acs-s75-account-browser-evidence/manifest.json`;
- screenshots: `/tmp/acs-s75-account-browser-evidence/screenshots/`;
- authenticated SIWX journey: NOT RUN;
- reason: the Reown DEVELOPMENT project environment is provisioned, but its domain allowlist, Railway verifier/shared PostgreSQL configuration, post-configuration deployment and interactive signed-wallet exchange remain uncertified;
- result: PASS for truthful unavailable-state UX; not sufficient for S05 closure.

## AEES-16-02 remote browser recovery

- deployment URL: https://acs-hixywhj62-axodus.vercel.app/economics
- manifest: /tmp/acs-aees-16-02-browser-recovery-remote/manifest.json
- route: /economics
- matrix: desktop, tablet, mobile x light, dark
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- no-fake-data: PASS

## AEES-16-04 remote deployment fidelity

- deployment URL: https://acs-hixywhj62-axodus.vercel.app/operations/overview
- route: /operations/overview
- matrix: desktop, tablet, mobile x light, dark
- result: PASS
- reconciliation, mismatches, exceptions, settlements, usage and receipts: PRESENT
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- request failures: 0
- Settlements: PRESENT
- Receipts: PRESENT

Canonical operator UI for EPIC-16: .design/app-standalone
EPIC-16 UI changes under /static: FORBIDDEN

## Closure gate

EPIC-16 cannot close with an unresolved P0/P1 financial-truth or authorization UX defect. P2/P3 visual deviations require explicit disposition and must not weaken the 9005e3a hierarchy or accessibility.
