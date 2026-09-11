import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/api/product-api.ts", import.meta.url), "utf8");

function sectionBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, "missing source marker: " + startMarker);
  assert.notEqual(end, -1, "missing source marker: " + endMarker);
  return appSource.slice(start, end);
}

test("IMP-02D Usage & Cost uses bounded server-scoped Usage records without browser accounting", () => {
  const usage = sectionBetween("function AgentUsageCostView()", "function AgentAdvancedView()");
  assert.match(usage, /productApi\.listUsageRecords\(\{ agentId, limit: AGENT_OPERATIONAL_PAGE_LIMIT \}\)/);
  assert.match(usage, /Agent-scoped cost totals and a canonical ordering contract are unavailable/);
  assert.match(usage, /record\.executionRunId/);
  assert.match(usage, /record\.reservationId/);
  assert.match(usage, /record\.quoteId/);
  assert.match(usage, /record\.settlementId/);
  assert.doesNotMatch(usage, /reduce\(/);
  assert.doesNotMatch(usage, /\.filter\(/);
});

test("IMP-02D preserves explicit Runs and Evidence gaps until Agent-scoped contracts are bounded and correct", () => {
  const unsupported = sectionBetween("function AgentScopedUnsupportedView", "const AGENT_OPERATIONAL_PAGE_LIMIT");
  assert.match(unsupported, /does not provide a bounded, verified Agent-scoped query/);
  assert.match(unsupported, /Agent-specific \{subject\.toLowerCase\(\)\} are not fabricated from global records/);
  assert.match(appSource, /path="\/agents\/:agentId\/runs"/);
  assert.match(appSource, /subject="Runs"/);
  assert.match(appSource, /path="\/agents\/:agentId\/evidence"[\s\S]*?subject="Evidence"/);
  assert.match(appSource, /path="\/agents\/:agentId\/usage-cost"[\s\S]*?AgentUsageCostView/);
  assert.doesNotMatch(appSource, /function AgentEvidenceView/);
});

test("Product API client forwards Agent identifiers and bounds for the verified economic contract", () => {
  assert.match(apiSource, /async listUsageRecords\(query\?: \{ agentId\?: string; executionRunId\?: string; limit\?: number \}\)/);
  assert.match(apiSource, /`\/economics\/usage\?\$\{params\.toString\(\)\}`/);
  assert.doesNotMatch(apiSource, /getAgentEconomics/);
});
