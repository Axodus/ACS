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

test("IMP-02D Agent Runs uses the bounded direct Agent contract with URL-backed paging", () => {
  const runs = sectionBetween("function AgentRunsView()", "function AgentEvidenceView()");

  assert.match(runs, /productApi\.listAgentExecutionRuns\(agentId, \{ limit: AGENT_OPERATIONAL_PAGE_LIMIT, offset \}\)/);
  assert.match(runs, /Up to \{AGENT_OPERATIONAL_PAGE_LIMIT\} records in Product API order: started time descending, then Run ID descending/);
  assert.match(runs, /<AgentOperationalPagination offset=\{offset\} returned=\{runs\.data\.length\} onPage=\{onPage\}/);
  assert.match(runs, /No Runs have been recorded for this Agent/);
  assert.match(runs, /Unable to load Agent-scoped Runs from Product API/);
  assert.match(runs, /Run execution revision provenance is not supplied by this query/);
  assert.doesNotMatch(runs, /listExecutionRuns\(/);
  assert.doesNotMatch(runs, /runs\.data\.filter\(/);
  assert.doesNotMatch(runs, /revisionId/);
});

test("IMP-02D Agent Evidence uses the bounded direct Agent contract without synthesizing provenance", () => {
  const evidence = sectionBetween("function AgentEvidenceView()", "function AgentUsageCostView()");

  assert.match(evidence, /productApi\.listAgentEvidence\(agentId, \{ limit: AGENT_OPERATIONAL_PAGE_LIMIT, offset \}\)/);
  assert.match(evidence, /created time descending, then Evidence ID descending/);
  assert.match(evidence, /record\.source/);
  assert.match(evidence, /record\.entityRefs\?\.map/);
  assert.match(evidence, /record\.correlationId/);
  assert.match(evidence, /No Evidence has been recorded for this Agent/);
  assert.match(evidence, /Unable to load Agent-scoped Evidence from Product API/);
  assert.match(evidence, /Evidence is distinct from Events, Audit, and Runtime Events/);
  assert.doesNotMatch(evidence, /listEvidence\(/);
  assert.doesNotMatch(evidence, /evidence\.data\.filter\(/);
  assert.doesNotMatch(evidence, /verified/);
});

test("IMP-02D Usage & Cost retains bounded Usage and withholds zero-valued operational totals", () => {
  const usage = sectionBetween("function AgentUsageCostView()", "function AgentAdvancedView()");

  assert.match(usage, /productApi\.listUsageRecords\(\{ agentId, limit: AGENT_OPERATIONAL_PAGE_LIMIT \}\)/);
  assert.match(usage, /productApi\.getAgentOperationalEconomicSummary\(agentId\)/);
  assert.match(usage, /zero-valued operational projections do not define a cost total, so no economic total is displayed/);
  assert.match(usage, /Usage records remain independently available/);
  assert.match(usage, /record\.executionRunId/);
  assert.match(usage, /record\.reservationId/);
  assert.match(usage, /record\.quoteId/);
  assert.match(usage, /record\.settlementId/);
  assert.doesNotMatch(usage, /getEconomicSummary\(/);
  assert.doesNotMatch(usage, /reduce\(/);
  assert.doesNotMatch(usage, /usage\.data\.filter\(/);
});

test("IMP-02D Product API client uses encoded Agent routes with bounded limit and offset", () => {
  assert.match(apiSource, /async listAgentExecutionRuns\(agentId: string, query: \{ limit: number; offset: number \}\)/);
  assert.match(apiSource, /`\/agents\/\$\{encodeURIComponent\(agentId\)\}\/execution-runs\?\$\{params\.toString\(\)\}`/);
  assert.match(apiSource, /async listAgentEvidence\(agentId: string, query: \{ limit: number; offset: number \}\)/);
  assert.match(apiSource, /`\/agents\/\$\{encodeURIComponent\(agentId\)\}\/evidence\?\$\{params\.toString\(\)\}`/);
  assert.match(apiSource, /async getAgentOperationalEconomicSummary\(agentId: string\)/);
  assert.match(apiSource, /`\/agents\/\$\{encodeURIComponent\(agentId\)\}\/economics`/);
  assert.match(apiSource, /async listUsageRecords\(query\?: \{ agentId\?: string; executionRunId\?: string; limit\?: number \}\)/);
});

test("IMP-02D keeps the frozen Agent routes while replacing stale unavailable views", () => {
  assert.match(appSource, /path="\/agents\/:agentId\/runs" element=\{<AgentRunsView \/>\}/);
  assert.match(appSource, /path="\/agents\/:agentId\/evidence" element=\{<AgentEvidenceView \/>\}/);
  assert.match(appSource, /path="\/agents\/:agentId\/usage-cost"[\s\S]*?AgentUsageCostView/);
  assert.doesNotMatch(appSource, /function AgentScopedUnsupportedView/);
  assert.match(appSource, /const AGENT_OPERATIONAL_PAGE_LIMIT = 50/);
  assert.match(appSource, /const AGENT_OPERATIONAL_MAX_OFFSET = 10_000/);
});
