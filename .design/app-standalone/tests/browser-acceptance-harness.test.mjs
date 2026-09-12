import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const appRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(appRoot, "package.json"), "utf8"));
const harnessSource = readFileSync(resolve(appRoot, "tools/browser-acceptance.mjs"), "utf8");

test("browser acceptance command is declared", () => {
  assert.equal(packageJson.scripts["test:browser"], "node tools/browser-acceptance.mjs");
});

test("browser acceptance harness files exist", () => {
  assert.ok(existsSync(resolve(appRoot, "tools/browser-acceptance.mjs")));
  assert.ok(existsSync(resolve(appRoot, "../../docs/epics/epic-14/browser-acceptance.md")));
});

test("EPIC-14 browser evidence roots are configurable", () => {
  assert.match(harnessSource, /ACS_BROWSER_EVIDENCE_ROOT/);
  assert.match(harnessSource, /ACS_BROWSER_PROFILE_ROOT/);
  assert.match(harnessSource, /node:playwright-api/);
  assert.match(harnessSource, /chromium\.launch/);
  assert.doesNotMatch(harnessSource, /--dump-dom/);
});

test("IMP-03F Workforce direct routes are in the browser route matrix", () => {
  for (const route of [
    '"/workforces"',
    '"/workforces/new"',
    '"/workforces/workforce-browser-check"',
    '"/workforces/workforce-browser-check/members"',
    '"/workforces/workforce-browser-check/revisions"',
    '"/workforces/workforce-browser-check/revisions/1"',
    '"/workforces/workforce-browser-check/runs"',
    '"/workforces/workforce-browser-check/operations"',
  ]) assert.ok(harnessSource.includes(route), `missing browser route ${route}`);
});
