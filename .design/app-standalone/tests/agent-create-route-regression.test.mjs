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
  assert.match(entityNav, /Composition/);
  assert.match(entityNav, /Manage/);
  assert.doesNotMatch(entityNav, /label: "Operations"/);
  assert.doesNotMatch(entityNav, /label: "Evidence"/);
  assert.doesNotMatch(entityNav, /label: "Economics"/);
});

test("page-level DomainNav is removed", () => {
  assert.doesNotMatch(appSource, /function DomainNav/);
  assert.match(appSource, /function SidebarNavigation/);
});
