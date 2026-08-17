# HOTFIX-05 — Dashboard Information Architecture

**Result:** PASS — VISUAL REMEDIATION ACCEPTED

**Date:** August 17, 2026

## Decision

```text
/
  CUSTOMER-FACING ACS OPERATIONAL HOME

/administration
  PLATFORM READINESS / COMPOSITION / CERTIFICATION
```

The canonical surface remains `.design/app-standalone`. The approved mockup guides Dashboard hierarchy and density; the accepted ACS shell governs navigation, theme and responsive behavior.

## Visual-remediation closure

The first implementation correctly delivered IA, profile-aware semantics, real-data behavior, navigation preservation and technical browser gates, but did not yet satisfy the approved mockup's visual language. Its equal-weight administrative containers, weak KPI hierarchy, oversized health region, low semantic color use and missing visualization canvases were classified as a HOTFIX-05 visual-fidelity failure.

The same HOTFIX was reopened and corrected on the Dashboard content canvas only:

- overall health is compact and integrated into the welcome row;
- all six KPIs use icons, dominant metrics, supporting context and semantic accents;
- execution activity, execution success, agent/worker health and financial activity retain stable visual regions even with zero data;
- Requires Attention is a priority panel with explicit severity iconography;
- service health, recent activity and quick access are visually scannable rather than generic administrative blocks;
- desktop width and information density now materially follow the approved cockpit composition;
- light and dark themes preserve the same visual richness.

The protected shell, navigation mechanics, breakpoints, theme architecture and readiness semantics were not replaced.

## Protected shell baseline

Reviewed baselines:

- `be1d1834558f463a4f679e6f66b76f58304295e0` — operator navigation and visual acceptance remediation;
- `cf0d382b5a94568e1de4906f88365816c647a031` — mobile/light-theme/navigation polish.

Preserved behavior:

- fixed 238px desktop sidebar and existing visual language;
- mobile drawer, overlay, close action, Escape close and route-change close;
- body scroll lock and 44px menu target;
- topbar, breadcrumb and overflow behavior;
- existing breakpoints, typography, radius and theme tokens;
- link, focus, active navigation and status primitives.

No accepted shell behavior was deliberately changed. Dashboard-specific grids and navigation taxonomy were extended inside the existing shell.

## Route and navigation reconciliation

| Current route | Previous label/group | Target group | Action |
| --- | --- | --- | --- |
| `/` | Overview / Attention | Dashboard | RENAME / REWORK |
| `/agents*` | Agents | Agents | KEEP |
| `/executions*` | Operations | Executions | MOVE / KEEP |
| `/workers*` | Operations | Workers | MOVE / KEEP |
| `/economics` | Economics | Financial Operations | RENAME / KEEP |
| financial boundary routes | Economics | Financial Operations / Boundaries | GROUP / COMPATIBILITY |
| Tenant Administration URL | Administration | Customers | MOVE / EXTERNAL KEEP |
| `/operations`, `/runtime`, `/logs`, `/operational-evidence`, `/audit` | Operations / Evidence | Operations | GROUP / KEEP |
| `/readiness` | System | Administration | MOVE / KEEP |
| `/composition`, catalogs, providers | Capabilities | Administration | GROUP / KEEP |
| `/system*`, `/settings` | Governance / System | Administration | GROUP / KEEP |
| `/administration` | not present | Administration / Overview | CREATE |

No functional route was removed. Compatibility routes remain directly addressable.

## Dashboard blocks and provenance

| UI block | API/service | Completeness |
| --- | --- | --- |
| Overall Health | `/api/v1/dashboard`: operational blockers, execution/deployment failure counts, worker availability | LIVE |
| Active Agents | `/api/v1/dashboard.agents` | LIVE |
| Executions | `/api/v1/dashboard.executionRuns` | LIVE |
| Customers/Tenants | Tenant Administration route; count is not exposed | NOT_AVAILABLE / HONEST EMPTY |
| Workers | `/api/v1/dashboard.workers` | LIVE |
| Requires Attention | operational-category Dashboard findings only | LIVE |
| Execution Activity / Success | `/api/v1/dashboard.executionRuns` lifecycle counts | PARTIAL; no historical series |
| Financial Activity | `/api/v1/economics` | PARTIAL / EPIC-16 boundary |
| Service Health | Dashboard system/runtime/worker/deployment summaries | LIVE |
| Recent Activity | `/api/v1/events` | LIVE |
| Quick Access | existing supported routes only | LIVE |

No mock numbers are used. Missing Tenant count and execution history are represented explicitly. Financial reconciliation and exception workflows are `DEFERRED_TO_EPIC16`.

## Health semantics

Overall Health is customer-impact oriented:

- `DEGRADED`: operational blockers or failed execution/deployment outcomes;
- `ATTENTION`: actionable operational warnings or unavailable/degraded worker capacity;
- `HEALTHY`: none of the above;
- `UNAVAILABLE`: Dashboard Product API data is unavailable.

Profile facts and certification caveats do not create customer incidents. They remain in Administration Overview. The root page only links to Administration when advisory notices exist.

## Theme and severity

The existing theme token architecture is reused. Error findings use red, warnings/attention use amber, healthy/ready use green and informational states remain distinct. `unavailable` is evaluated before `available` to avoid false green status.

## Acceptance

Evidence root: `/tmp/acs-aees-rp-hotfix05-evidence/manifest.json`

- Dashboard: 4 viewports × light/dark = 8 states;
- Administration Overview: desktop/mobile × light/dark = 4 states;
- route regressions: Agents, Executions, Workers, Capabilities, Operations, Administration, Readiness and Providers;
- screenshots: 21 post-change plus 4 baseline captures and the supplied visual reference;
- accessibility failures: 0;
- horizontal overflow: 0;
- page errors: 0;
- console errors: 0;
- API/request failures: 0;
- sensitive matches: 0;
- drawer interaction matrix: PASS;
- real browser Dashboard API observation: PASS.
- explicit visual-fidelity browser checks: PASS;
- reference comparison in `.design/app-standalone/design-qa.md`: PASS with no actionable P0/P1/P2 mismatch.

Design comparison: `.design/app-standalone/design-qa.md` (`final result: passed`).

## Parallel surface

`static/src/operations/DashboardOverviewApp.tsx` is retained as a non-canonical secondary surface. It is not acceptance authority for the customer Dashboard. Current Product API profile semantics remain shared, but future Dashboard IA work must target `.design/app-standalone` first to avoid divergence.

## Preservation record

```text
Existing shell/navigation UX: PRESERVED
Dashboard content architecture: REWORKED
Navigation taxonomy: EVOLVED WITH COMPATIBILITY
Global design system: PRESERVED / EXTENDED, NOT REPLACED
```

## EPIC-16 handoff

Deferred capabilities:

- pricing/cost time series;
- reservations operational workflow;
- settlement lifecycle workflow;
- reconciliation and exception handling;
- customer financial activity details.

HOTFIX-05 does not implement those domains and does not block the EPIC-16 normative package.
