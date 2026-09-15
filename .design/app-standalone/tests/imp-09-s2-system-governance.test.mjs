import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const [appSource, administrationSource, governanceSource, systemSource, apiSource] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/administration/Administration.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/governance/Governance.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/system/System.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/api/product-api.ts", import.meta.url), "utf8"),
]);

test("S2 provides canonical Governance and System modules without a second administration authority", async () => {
  await Promise.all([
    access(new URL("../src/domains/governance/Governance.tsx", import.meta.url)),
    access(new URL("../src/domains/system/System.tsx", import.meta.url)),
  ]);
  assert.match(appSource, /from "\.\/domains\/governance\/Governance"/);
  assert.match(appSource, /from "\.\/domains\/system\/System"/);
  assert.match(appSource, /path="\/governance" element=\{<GovernanceView \/>\}/);
  assert.match(appSource, /path="\/system" element=\{<SystemView \/>\}/);
  assert.match(appSource, /path="\/administration" element=\{<AdministrationOverview \/>\}/);
  assert.match(administrationSource, /export \{ GovernanceView/);
  assert.match(administrationSource, /export \{ OperationalReliabilityView, Settings, SystemView \}/);
});

test("System owns readiness, diagnostics and class-owned settings visibility", () => {
  assert.match(systemSource, /export function SystemView\(\)/);
  assert.match(systemSource, /getProductionReadinessReport\(\)/);
  assert.match(systemSource, /getSystemGuardrails\(\)/);
  assert.match(systemSource, /getSystemConfiguration\(\)/);
  assert.match(systemSource, /Class-owned settings index/);
  assert.match(systemSource, /does not create a global settings aggregate/);
  assert.match(systemSource, /\/system\/operational-reliability/);
  assert.match(systemSource, /export function OperationalReliabilityView\(\)/);
  assert.match(systemSource, /export function Settings\(\)/);
  assert.doesNotMatch(systemSource, /GlobalSettings/);
  assert.doesNotMatch(systemSource, /<form/);
});

test("Governance retains tenant-sensitive Product API projections and governed boundary language", () => {
  assert.match(governanceSource, /getGovernanceBoundaryReport\(\)/);
  assert.match(governanceSource, /getSystemTenants\(\)/);
  assert.match(governanceSource, /Tenant boundary/);
  assert.match(governanceSource, /tenantAdministrationUrl|Tenant Administration/);
  assert.match(governanceSource, /mutations are governed by the Product API/);
  assert.match(governanceSource, /Policy visibility|Read-only policy inventory/);
});

test("S2 uses existing Product API seams and does not add a route-level backend contract", () => {
  for (const method of [
    "getProductionReadinessReport",
    "getSystemGuardrails",
    "getSystemConfiguration",
    "getOperationalReliabilityReport",
    "getGovernanceBoundaryReport",
    "getSystemTenants",
  ]) assert.match(apiSource, new RegExp(`async ${method}\\(`));

  assert.doesNotMatch(systemSource, /fetch\(/);
  assert.doesNotMatch(governanceSource, /fetch\(/);
  assert.doesNotMatch(systemSource, /request</);
  assert.doesNotMatch(governanceSource, /request</);
  assert.doesNotMatch(systemSource, /GlobalSettings/);
});
