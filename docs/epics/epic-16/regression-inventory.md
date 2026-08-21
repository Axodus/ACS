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

## Runtime topology guardrails

- LOCAL may use localhost in browser-facing `VITE_*` values;
- DEVELOPMENT browser-facing `VITE_*` values must use a public Railway HTTPS origin;
- `.railway.internal` is server-side only and must not be emitted to the browser;
- production browser-facing values must use production HTTPS origins;
- OpenClaw Worker terminology is canonical across docs, diagnostics and readiness;
- product HTTP boot must remain independent from worker availability.
- canonical environment identities are LOCAL, DEVELOPMENT and PRODUCTION only;
- canonical worker modes are `local`, `cloud`, `remote` and `disabled`;
- canonical runtime variables are `ACS_ENVIRONMENT`, `ACS_DISPATCH_MODE`,
  `ACS_OPENCLAW_WORKER_MODE` and `ACS_OPENCLAW_TRANSPORT`;
- `.env.development` is the canonical development root env file; browser-facing
  development origins must use `https://acs-axodus.up.railway.app/api/v1` or
  another public Railway HTTPS origin approved by the deployment baseline;
- `.env.develop` is not a canonical environment identity and should not be used
  in new docs or runtime wiring.

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

## AEES-16-03 regression focus

- preserve truthful usage and settlement evidence on /operations/overview;
- do not fabricate usage histories, settlement histories or receipt evidence;
- preserve AEES-16-01 financial truth surfaces and Dashboard hierarchy;
- preserve AEES-16-02 authorization and reservation semantics while usage and
  settlement projections are added;
- keep Tenant isolation, idempotency and shared-state behavior authoritative;
- browser acceptance is local-first for unpublished code; deployment fidelity is
  secondary and must record any environment limitation separately from product
  failure.

## AEES-16-03 / ACCEPTANCE-RECOVERY-01

- remote Playwright ran against https://acs-hl29hhkoe-axodus.vercel.app/operations/overview
- SHA da89456 produced accessibility/overflow/console/page/request PASS
- usage, settlement and receipt operator surfaces were absent from the certified artifact
- result remains FAIL until a SHA containing those surfaces is certified

## AEES-16-03 local product acceptance

- local Vite + Playwright against http://127.0.0.1:5173/operations/overview PASS
- Usage, Settlements and Receipts are present without fabricated financial history
- prior remote FAILs against older or mismatched deployments remain chronology
  evidence, not local product defects

## AEES-16-03 / HOTFIX-02

- previous local /static acceptance is INVALIDATED — WRONG APPLICATION BOUNDARY
- valid operator UI: .design/app-standalone
- EPIC-16 UI changes under /static: FORBIDDEN
- standalone local Playwright against http://127.0.0.1:3000/operations/overview PASS

## AEES-16-04 S04 remediation regressions

- EPIC-16 UI changes under `/static` remain forbidden; canonical operator UI is `.design/app-standalone`.
- Remediation must not introduce credits, debits, refunds, invoices, tax, ledger postings or unrestricted settlement edits.
- Unsupported remediation actions remain `UNSUPPORTED / REQUIRES_FUTURE_POLICY`.
- Replay of the same remediation idempotency key must not duplicate economic effects.
- Failed or unauthorized remediation must preserve original exception/mismatch evidence.
