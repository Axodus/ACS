import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/operational.css", import.meta.url), "utf8");

function sectionBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, "missing source marker: " + startMarker);
  assert.notEqual(end, -1, "missing source marker: " + endMarker);
  return appSource.slice(start, end);
}

test("IMP-02C Overview prioritizes identity, lifecycle, current revision, readiness, and one next action", () => {
  const detail = sectionBetween("function AgentDetail()", "function AgentLocalHeader");
  for (const label of [
    "AGENT OVERVIEW",
    "Current state",
    "Current revision",
    "Readiness",
    "Next safe action",
  ]) {
    assert.match(detail, new RegExp(label));
  }
  assert.match(detail, /function renderNextSafeAction/);
  assert.match(detail, /Validate configuration/);
  assert.match(detail, /Edit configuration/);
  assert.match(detail, /Restore Agent/);
});

test("technical bindings are secondary in Overview and rendered in Agent Advanced", () => {
  const detail = sectionBetween("function AgentDetail()", "function AgentLocalHeader");
  const advanced = sectionBetween("function AgentAdvancedView()", "type AgentFormMode");
  assert.match(detail, /Technical context/);
  assert.match(detail, /secondary to Agent identity/);
  assert.doesNotMatch(detail, /Model strategy/);
  assert.match(advanced, /Provider and model binding/);
  assert.match(advanced, /Credentials and runner preferences/);
  assert.match(advanced, /secret values are never displayed/);
});

test("IMP-02C revision hierarchy distinguishes the canonical head from read-only history", () => {
  const revisions = sectionBetween("function AgentRevisionsView()", "const AGENT_OPERATIONAL_PAGE_LIMIT");
  assert.match(revisions, /sort\(\(left, right\) => right\.revisionNumber - left\.revisionNumber\)/);
  assert.match(revisions, /CURRENT/);
  assert.match(revisions, /HISTORICAL/);
  assert.match(revisions, /Historical records cannot be edited directly/);
  assert.match(revisions, /revision comparison is deferred/);
  assert.doesNotMatch(revisions, /Restore this revision/);
});

test("existing lifecycle mutations remain Product API-backed and guarded", () => {
  const detail = sectionBetween("function AgentDetail()", "function AgentLocalHeader");
  assert.match(detail, /productApi\.archiveAgent/);
  assert.match(detail, /productApi\.restoreAgent/);
  assert.match(detail, /productApi\.deleteAgent/);
  assert.match(detail, /productApi\.adoptAgentRevision/);
  assert.match(detail, /productApi\.restoreAgentRevision/);
  assert.match(detail, /Confirm \{confirming\.label\}/);
  assert.match(detail, /Product API validates dependencies before deletion/);
});

test("Agent-local detail routes and responsive Overview styles remain present", () => {
  for (const route of [
    "/agents/:agentId",
    "/agents/:agentId/configuration",
    "/agents/:agentId/validate",
    "/agents/:agentId/revisions",
    "/agents/:agentId/advanced",
    "/agents/:agentId/edit",
    "/agents/:agentId/composition",
  ]) {
    assert.match(appSource, new RegExp(route.replace(/[/:]/g, "\\$&")));
  }
  assert.match(cssSource, /\.overview-hero/);
  assert.match(cssSource, /\.overview-grid/);
  assert.match(cssSource, /\.overview-action-grid/);
  assert.match(cssSource, /@media \(max-width: 720px\)/);
});
