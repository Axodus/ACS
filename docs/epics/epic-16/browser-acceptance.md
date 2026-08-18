# EPIC-16 Browser Acceptance

## Purpose

Browser acceptance proves that financial operations are usable through supported Control Plane surfaces and remain faithful to the accepted `9005e3a` UX/dashboard baseline.

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
- screenshots;
- accessibility result;
- overflow result;
- console result;
- financial-truth assertions;
- failures/waivers with exact rationale.

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

## Closure gate

EPIC-16 cannot close with an unresolved P0/P1 financial-truth or authorization UX defect. P2/P3 visual deviations require explicit disposition and must not weaken the `9005e3a` hierarchy or accessibility.
AEES-16-02 / Browser Acceptance Recovery
Route: /operations/overview
Base URL: http://localhost:3000
Manifest: /tmp/acs-aees-16-02-browser-recovery/manifest.json
