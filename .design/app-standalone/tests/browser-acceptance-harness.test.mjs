import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const appRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(appRoot, "package.json"), "utf8"));

test("browser acceptance command is declared", () => {
  assert.equal(packageJson.scripts["test:browser"], "node tools/browser-acceptance.mjs");
});

test("browser acceptance harness files exist", () => {
  assert.ok(existsSync(resolve(appRoot, "tools/browser-acceptance.mjs")));
  assert.ok(existsSync(resolve(appRoot, "../../docs/epics/epic-13/browser-acceptance.md")));
});
