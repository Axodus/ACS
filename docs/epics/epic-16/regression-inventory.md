# EPIC-16 Regression Inventory

## Purpose

EPIC-16 extends a mature operational platform. Regression acceptance must prove financial operations do not weaken existing authority or UX.

## Protected domains

### EPIC-13 financial boundary
- preserve no-claim discipline;
- preserve existing economic evidence semantics;
- do not imply billing/payment readiness from settlement primitives.

### EPIC-14 Control Plane
- preserve navigation/information architecture;
- preserve responsive shell and accessibility;
- no new manual-API normal path.

### EPIC-15 Tenant/governance
- Tenant isolation remains authoritative;
- membership/authority is not inferred from financial records;
- governance/entitlements/limits remain the source for authorization inputs.

### EPIC-15.5 operational baseline
- trusted identity remains mandatory;
- shared PostgreSQL authority remains supported;
- runtime ownership/fencing/recovery semantics are unchanged;
- readiness/telemetry/deployment governance remain authoritative.

### Post-15.5 Dashboard baseline `9005e3a`
- preserve visual hierarchy and expressive KPI language;
- preserve light/dark/responsive behavior;
- preserve truthful empty/zero states;
- do not fabricate financial histories.

## Required regression suites

For affected areas, run and report:

- backend typecheck/build/tests;
- app typecheck/lint/build/tests;
- Product API contract tests;
- Tenant isolation tests;
- economic idempotency/reconciliation tests;
- shared-state/PostgreSQL tests when repository behavior changes;
- browser route acceptance;
- accessibility/horizontal-overflow/console checks;
- `git diff --check`.

## High-risk regression scenarios

1. retrying the same reservation/settlement/remediation request;
2. concurrent operators acting on the same exception;
3. shared-store outage during financial mutation;
4. provider timeout/ambiguous settlement response;
5. Tenant context switch while financial detail is open;
6. stale UI attempting a no-longer-authorized remediation;
7. Dashboard with no execution/economic history;
8. zero-valued economic state versus unavailable state;
9. reconciliation rerun against already-resolved items;
10. audit/telemetry redaction of sensitive provider data.

## Closure requirement

Every regression affecting financial authority, Tenant isolation, idempotency, audit evidence or truthful UX is release-blocking until resolved or explicitly reclassified by normative review.

## AEES-16-01 browser acceptance evidence

- route: `/operations/overview`
- matrix: desktop, tablet, mobile × light, dark
- result: PASS
- accessibility: PASS
- horizontal overflow: 0
- console errors: 0
- page errors: 0
- no-fake-data: PASS
- manifest: `/tmp/acs-aees-16-01-browser-recovery/manifest.json`
AEES-16-02 / Browser Acceptance Recovery
Route: /operations/overview
Manifest: /tmp/acs-aees-16-02-browser-recovery/manifest.json
