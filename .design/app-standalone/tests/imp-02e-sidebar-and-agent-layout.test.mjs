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
const indexCss = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
const operationalCss = await readFile(new URL("../src/operational.css", import.meta.url), "utf8");

function sectionBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return appSource.slice(start, end);
}

test("IMP-02E persists an accessible collapsible sidebar preference", () => {
  assert.match(appSource, /acs\.sidebar\.collapsed/);
  assert.match(appSource, /Collapse sidebar/);
  assert.match(appSource, /Expand sidebar/);
  assert.match(appSource, /aria-expanded=\{!sidebarCollapsed\}/);
  assert.match(appSource, /collapsed=\{sidebarCollapsed\}/);
  assert.match(indexCss, /\.sidebar-collapsed \.sidebar/);
  assert.match(indexCss, /\.sidebar-collapsed \.main/);
});

test("IMP-02E keeps collapsed navigation semantic and understandable", () => {
  const navigation = sectionBetween("function SidebarNavigation(", "function EntityContextNav(");
  assert.match(navigation, /title=\{collapsed \? domain\.id : undefined\}/);
  assert.match(navigation, /!collapsed && expanded && <div className="sidebar-children">/);
  assert.match(navigation, /className="domain-label"/);
  assert.match(indexCss, /\.sidebar-collapsed \.domain-link \.domain-label/);
  assert.match(indexCss, /\.sidebar-collapsed \.domain-link \.sidebar-chevron/);
  assert.match(indexCss, /\.sidebar-toggle:focus-visible/);
});

test("IMP-02E places review and create beside the canonical configuration flow", () => {
  const form = sectionBetween("function AgentForm(", "function AgentCreate()");
  assert.match(form, /className="agent-form-layout"/);
  assert.match(form, /className="agent-form-review"/);
  assert.match(form, /className="agent-form-configuration"/);
  assert.match(form, /title=\{mode === "create" \? "Review and create" : "Review and save"\}/);
  assert.match(form, /onClick=\{\(\) => void handleSubmit\(\)\}/);
  for (const field of ["Capabilities", "Provider \/ model", "Credential references", "Role \/ profile", "Skills", "Tools", "Runner preferences"]) {
    assert.match(form, new RegExp(`<dt>${field}</dt>`));
  }
  assert.match(operationalCss, /\.agent-form-layout[\s\S]*grid-template-columns/);
  assert.match(operationalCss, /\.agent-form-review[\s\S]*position: sticky/);
});

test("IMP-02E preserves mobile drawer behavior and stacks configuration before review", () => {
  assert.match(indexCss, /\.sidebar-collapsed \.sidebar \{[\s\S]*width: 238px/);
  assert.match(indexCss, /\.sidebar-collapsed \.main \{[\s\S]*margin-left: 0/);
  assert.match(operationalCss, /\.agent-form-configuration \{[\s\S]*order: 1/);
  assert.match(operationalCss, /\.agent-form-review \{[\s\S]*order: 2/);
});
