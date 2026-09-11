import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceFiles = [
  "../src/shared.tsx",
  "../src/App.tsx",
  "../src/domains/dashboard/Dashboard.tsx",
  "../src/domains/agents/Agents.tsx",
  "../src/domains/composition/Composition.tsx",
  "../src/domains/runtime/Runtime.tsx",
  "../src/domains/economics/Economics.tsx",
  "../src/domains/administration/Administration.tsx",
];
const appSource = (await Promise.all(sourceFiles.map(file => readFile(new URL(file, import.meta.url), "utf8")))).join("\n");

function sectionBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return appSource.slice(start, end);
}

test("IMP-02A defines the frozen global navigation order", () => {
  const domainSource = sectionBetween("const domainDefs", "const domainByPath");
  const labels = [...domainSource.matchAll(/id: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(labels, ["Dashboard", "Agents", "Runs", "Evidence", "Usage & Cost", "Runtime", "Administration"]);
  for (const legacyLabel of ["Executions", "Workers", "Financial Operations", "Customers", "Operations"]) {
    assert.doesNotMatch(domainSource, new RegExp(`id: "${legacyLabel}"`));
  }
});

test("global routes retain their canonical domains", () => {
  const routingSource = sectionBetween("const domainByPath", "const viewOfPath");
  assert.match(routingSource, /executions.*return "Runs"/);
  assert.match(routingSource, /operational-evidence.*return "Evidence"/);
  assert.match(routingSource, /economics.*return "Usage & Cost"/);
  assert.match(routingSource, /runtime.*return "Runtime"/);
});

test("Agent-local navigation exposes the frozen labels and direct targets", () => {
  const entityNav = sectionBetween("function EntityContextNav", "/* ---------------------------------------------------------------------------");
  const expected = [
    ["Overview", "/agents/${agentId}"],
    ["Configuration", "/agents/${agentId}/configuration"],
    ["Validate", "/agents/${agentId}/validate"],
    ["Runs", "/agents/${agentId}/runs"],
    ["Revisions", "/agents/${agentId}/revisions"],
    ["Evidence", "/agents/${agentId}/evidence"],
    ["Usage & Cost", "/agents/${agentId}/usage-cost"],
    ["Advanced", "/agents/${agentId}/advanced"],
  ];
  let previousIndex = -1;
  for (const [label, target] of expected) {
    const index = entityNav.indexOf(`label: "${label}"`);
    assert.ok(index > previousIndex, `${label} should follow the previous Agent-local tab`);
    assert.ok(entityNav.includes(`to: \`${target}\``), `${label} should target ${target}`);
    previousIndex = index;
  }
  assert.match(entityNav, /pathname === "\/agents\/new"\) return null/);
});

test("Agent-local routes preserve compatibility and their frozen direct targets", () => {
  assert.match(appSource, /path="\/agents\/:agentId\/edit" element={<AgentEdit \/>}/);
  assert.match(appSource, /path="\/agents\/:agentId\/composition" element={<AgentCompositionView \/>}/);
  for (const route of ["configuration", "validate", "runs", "revisions", "evidence", "usage-cost", "advanced"]) {
    assert.match(appSource, new RegExp(`path=\\"/agents/:agentId/${route}\\"`));
  }
  assert.match(appSource, /path="\/agents\/:agentId\/runs" element=\{<AgentRunsView \/>\}/);
  assert.match(appSource, /path="\/agents\/:agentId\/evidence" element=\{<AgentEvidenceView \/>\}/);
});

test("longest Agent tab destination wins active-state matching", () => {
  assert.match(appSource, /tabs\]\.sort\(\(left, right\) => right\.to\.length - left\.to\.length\)/);
});
