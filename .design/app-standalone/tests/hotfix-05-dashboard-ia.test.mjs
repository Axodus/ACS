import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/operational.css", import.meta.url), "utf8");

test("root Dashboard and Administration Overview are separate canonical routes", () => {
  assert.match(appSource, /<Route path="\/" element=\{<CustomerDashboard \/>\} \/>/);
  assert.match(appSource, /<Route path="\/administration" element=\{<AdministrationOverview \/>\} \/>/);
  assert.match(appSource, /function CustomerDashboard\(\)/);
  assert.match(appSource, /function AdministrationOverview\(\)/);
});

test("customer Dashboard presents operational health without technical composition cards", () => {
  const start = appSource.indexOf("function CustomerDashboard()");
  const end = appSource.indexOf("function AdministrationOverview()", start);
  const dashboard = appSource.slice(start, end);
  assert.match(dashboard, /Overall health/);
  assert.match(dashboard, /Execution Activity/);
  assert.match(dashboard, /Requires Attention/);
  assert.match(dashboard, /Financial Activity/);
  assert.match(dashboard, /Service Health/);
  assert.match(dashboard, /Recent Activity/);
  assert.doesNotMatch(dashboard, /title="Active composition"/);
  assert.doesNotMatch(dashboard, /title="Critical blockers"/);
  assert.match(dashboard, /\(\) => productApi\.getDashboardSummary\(\)/);
  assert.match(dashboard, /\(\) => productApi\.getEconomicSummary\(\)/);
  assert.match(dashboard, /\(\) => productApi\.listEvents\(\)/);
  assert.match(dashboard, /Financial data unavailable/);
  assert.match(dashboard, /Unable to load recent activity/);
  assert.match(dashboard, /Welcome back, Operator/);
  assert.match(dashboard, /<DashboardMetric label="Active Agents"/);
  assert.match(dashboard, /className="execution-chart"/);
  assert.match(dashboard, /className=\{`success-orbit/);
  assert.match(dashboard, /className="financial-visual"/);
  assert.match(dashboard, /className="quick-access visual"/);
});

test("Administration Overview preserves profile-aware readiness semantics", () => {
  const start = appSource.indexOf("function AdministrationOverview()");
  const end = appSource.indexOf("function AgentCard", start);
  const administration = appSource.slice(start, end);
  assert.match(administration, /title="Active environment"/);
  assert.match(administration, /title="Active composition"/);
  assert.match(administration, /title="Critical blockers"/);
  assert.match(administration, /title="Certified platform capability"/);
  assert.match(administration, /title="Global caveats"/);
});

test("navigation keeps supported customer and administration destinations reachable", () => {
  for (const label of ["Dashboard", "Agents", "Executions", "Workers", "Financial Operations", "Customers", "Operations", "Administration"]) {
    assert.match(appSource, new RegExp(`id: "${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"`));
  }
  for (const path of ["/agents", "/executions", "/workers", "/economics", "/operations", "/administration", "/readiness", "/composition", "/system"]) {
    assert.match(appSource, new RegExp(`to: "${path.replaceAll("/", "\\/")}"`));
  }
});

test("Dashboard styles include responsive customer grids and semantic severities", () => {
  assert.match(cssSource, /\.dashboard-cockpit-grid/);
  assert.match(cssSource, /\.dashboard-kpis/);
  assert.match(cssSource, /\.dashboard-metric-icon/);
  assert.match(cssSource, /\.cockpit-attention/);
  assert.match(cssSource, /\.financial-bars/);
  assert.match(cssSource, /\.quick-access\.visual/);
  assert.match(cssSource, /\.finding-severity-error \{ color: var\(--red\); \}/);
  assert.match(cssSource, /\.finding-severity-warning \{ color: var\(--amber\); \}/);
  assert.match(cssSource, /@media \(max-width: 430px\)/);
});
