import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [appSource, sharedSource, runtimeSource, operationalSource, compositionSource] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/shared.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/runtime/Runtime.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/OperationalUx.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/composition/Composition.tsx", import.meta.url), "utf8"),
]);

const [economicsSource, administrationSource, cssSource] = await Promise.all([
  readFile(new URL("../src/domains/economics/Economics.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/administration/Administration.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/operational.css", import.meta.url), "utf8"),
]);

test("domain-root breadcrumbs omit the duplicated view and operational details keep entity context", () => {
  assert.match(appSource, /const isDomainRoot = location\.pathname === domainDef\.to;/);
  assert.match(appSource, /\{!isDomainRoot && <>/);
  assert.match(appSource, /agents\|workforces\|roles\|profiles\|capabilities\|skills\|plugins\|tools\|engines\|providers\|executions\|workers/);

  for (const mapping of [
    'Executions: "/executions"',
    'Workers: "/workers"',
    'Operations: "/operations"',
    '"Secret references": "/credentials"',
    '"Operational Reliability": "/system/operational-reliability"',
  ]) assert.match(sharedSource, new RegExp(mapping.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("shared domain headers retain operational context without repeating the full API URL", () => {
  const start = sharedSource.indexOf("function DomainHeader(");
  const end = sharedSource.indexOf("function ContextTabs(", start);
  const header = sharedSource.slice(start, end);
  assert.match(header, /Workspace:/);
  assert.match(header, /Entity:/);
  assert.doesNotMatch(header, /productApiConfig\.baseUrl/);
});

test("catalog and operational page headers use the shared domain hierarchy", () => {
  assert.match(sharedSource, /function CatalogPage\(\{ domain,/);
  assert.match(sharedSource, /<DomainHeader domain=\{domain\}/);
  assert.match(operationalSource, /return <Shared\.DomainHeader domain=\{domain\}/);
  assert.match(compositionSource, /<Shared\.DomainHeader domain="Composition" title="Tools & Plugins"/);
  assert.match(compositionSource, /<Shared\.DomainHeader domain="Composition" title="Engines, Providers & Models"/);
});

test("Memory is presented as an unavailable read-only surface without a decorative primary action", () => {
  const start = runtimeSource.indexOf("export function GenericView");
  const end = runtimeSource.indexOf("export function Runtime", start);
  const memorySurface = runtimeSource.slice(start, end);
  assert.match(memorySurface, /Product API integration is pending/);
  assert.match(memorySurface, /records can be inspected until/);
  assert.doesNotMatch(memorySurface, /<button/);
});

test("long Governance and Economics reports expose intra-view section navigation", () => {
  assert.match(sharedSource, /function ReportSectionNav\(/);
  assert.match(economicsSource, /ReportSectionNav sections=/);
  assert.match(economicsSource, /id="economics-primary"/);
  assert.match(administrationSource, /ReportSectionNav sections=/);
  assert.match(administrationSource, /id="governance-guardrails"/);
  assert.match(administrationSource, /id="governance-configuration"/);
  assert.match(cssSource, /\.report-section-nav/);
  assert.doesNotMatch(economicsSource, /<Router\.Link[^>]+#economics/);
});

test("Product API connectivity is presented in the topbar only", () => {
  assert.match(appSource, /<Shared\.Status status=\{connectivity\.status/);
  assert.doesNotMatch(appSource, /className="connection"/);
  assert.doesNotMatch(appSource, /footer><span><i \/>.*Product API/);
});
