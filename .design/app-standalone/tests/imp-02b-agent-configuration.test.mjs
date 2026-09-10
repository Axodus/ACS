import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/operational.css", import.meta.url), "utf8");

function sectionBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return appSource.slice(start, end);
}

test("IMP-02B groups Agent creation and configuration into progressive sections", () => {
  const form = sectionBetween("function AgentForm(", "function AgentCreate()");
  for (const label of ["Identity", "Functional configuration", "Technical composition", "Advanced"]) {
    assert.match(form, new RegExp(`title=\\"${label}\\"`));
  }
  assert.match(form, /title=\{mode === "create" \? "Review and create" : "Review and save"\}/);
  assert.match(form, /title="Identity"[\s\S]*?tier="required" open/);
  assert.match(form, /title="Technical composition"[\s\S]*?tier="technical"/);
  assert.match(form, /title="Advanced"[\s\S]*?tier="advanced"/);
  assert.match(form, /Provider selection is technical composition, not Agent identity/);
});

test("unsupported Agent metadata and prompt concepts remain absent from the persisted form", () => {
  const form = sectionBetween("function AgentForm(", "function AgentCreate()");
  assert.match(form, /Purpose and description are not shown because the current Agent contract has no durable ACS-owned field/);
  assert.doesNotMatch(form, /<label>Purpose/);
  assert.doesNotMatch(form, /<label>Description/);
  assert.doesNotMatch(form, /<label>Instructions/);
  assert.doesNotMatch(form, /<label>Variables/);
});

test("technical credential selection uses existing connection references and never accepts secrets", () => {
  const form = sectionBetween("function AgentForm(", "function AgentCreate()");
  assert.match(form, /productApi\.listProviderConnections\(\)/);
  assert.match(form, /Credential references/);
  assert.match(form, /Secrets never appear in this form/);
  assert.doesNotMatch(form, /Credential connections<input/);
});

test("create and revision-aware update preserve the canonical Product API commands", () => {
  const form = sectionBetween("function AgentForm(", "function AgentCreate()");
  assert.match(form, /if \(submitting\) return;/);
  assert.match(form, /productApi\.createAgent\(\{ definition, createdBy: "control-plane-ui" \}\)/);
  assert.match(form, /navigate\(`\/agents\/\$\{result\.entityId\}`\)/);
  assert.match(form, /productApi\.updateAgent\(agentId, \{ definition, expectedRevision, updatedBy: "control-plane-ui" \}\)/);
  assert.match(form, /productApi\.createAgentRevision\(agentId, \{ definition, expectedRevision, actor: "control-plane-ui" \}\)/);
  assert.match(form, /Reload current configuration/);
  assert.match(form, /disabled=\{submitting\}/);
});

test("IMP-02B form layout remains responsive and uses existing disclosure semantics", () => {
  assert.match(appSource, /function AgentFormSection/);
  assert.match(cssSource, /\.agent-form-panel/);
  assert.match(cssSource, /\.agent-form-flow/);
  assert.match(cssSource, /\.agent-form-section/);
  assert.match(cssSource, /@media \(max-width: 720px\)/);
});
