import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("/agents/new is excluded from entity-context navigation", () => {
  assert.match(appSource, /if \(pathname === "\/agents\/new"\) return null;/);
});

test("agent entity tabs contain only same-entity contexts", () => {
  const start = appSource.indexOf("function EntityContextNav");
  const end = appSource.indexOf("/* ---------------------------------------------------------------------------", start);
  const entityNav = appSource.slice(start, end);
  assert.match(entityNav, /Overview/);
  assert.match(entityNav, /Configuration/);
  assert.match(entityNav, /Validate/);
  assert.match(entityNav, /Runs/);
  assert.match(entityNav, /Revisions/);
  assert.match(entityNav, /Evidence/);
  assert.match(entityNav, /Usage & Cost/);
  assert.match(entityNav, /Advanced/);
  assert.doesNotMatch(entityNav, /label: "Operations"/);
});

test("page-level DomainNav is removed", () => {
  assert.doesNotMatch(appSource, /function DomainNav/);
  assert.match(appSource, /function SidebarNavigation/);
});

test("DomainHeader owns page-level actions", () => {
  assert.match(appSource, /function DomainHeader\(\{ domain, title, description, entityLabel, actions, children \}/);
  assert.match(appSource, /className="domain-header-actions"/);
  assert.match(appSource, /<DomainHeader domain="Agents" title="Agent Inventory"[\s\S]*?actions=\{/);
});
