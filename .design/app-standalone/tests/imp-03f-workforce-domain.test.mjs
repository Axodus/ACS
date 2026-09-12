import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const sharedSource = await readFile(new URL("../src/shared.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../src/api/product-api.ts", import.meta.url), "utf8");
const workforceSource = await readFile(new URL("../src/domains/workforces/Workforces.tsx", import.meta.url), "utf8");

test("IMP-03F exposes Workforces as a global application domain", () => {
  assert.match(sharedSource, /id: "Workforces"[\s\S]*?to: "\/workforces"/);
  assert.match(sharedSource, /if \(path\.startsWith\("\/workforces"\)\) return "Workforces"/);
  assert.match(sharedSource, /label: "Overview \/ List", to: "\/workforces"/);
  for (const label of ["Members", "Revisions", "Runs", "Operations"]) assert.match(sharedSource, new RegExp(`label: "${label}", to: "\\/workforces", available: false`));
});

test("IMP-03F registers direct Workforce routes and contextual navigation", () => {
  for (const route of [
    "/workforces",
    "/workforces/new",
    "/workforces/:workforceId/members",
    "/workforces/:workforceId/revisions/:revision",
    "/workforces/:workforceId/revisions",
    "/workforces/:workforceId/runs",
    "/workforces/:workforceId/operations",
    "/workforces/:workforceId",
  ]) assert.match(appSource, new RegExp(`path=\\"${route.replaceAll("/", "\\/").replaceAll(":", "\\:")}\\"`));
  for (const label of ["Overview", "Members", "Revisions", "Runs", "Operations"]) assert.match(sharedSource, new RegExp(`label: "${label}"`));
  assert.match(sharedSource, /Workforce: \$\{workforceContext\.name \?\? workforceContext\.workforceId\}/);
  assert.match(sharedSource, /title=\{`Workforce: \$\{workforceContext\?\.name \?\? workforceId\}`\}/);
  assert.match(sharedSource, /child\.to === "\/workforces"[\s\S]*?pathname === child\.to/);
  assert.match(sharedSource, /Select a Workforce/);
  assert.match(sharedSource, /sort\(\(left, right\) => right\.to\.length - left\.to\.length\)[\s\S]*?find\(child => childActive\(pathname, child\.to\)\)/);
  assert.match(appSource, /Api\.productApi\.getWorkforce\(workforceId\)/);
  assert.match(sharedSource, /pathname === "\/workforces\/new"\) return null/);
});

test("IMP-03F-FIX-02 creates the initial Workforce only through the Product API", () => {
  for (const method of ["listWorkforces", "getWorkforce", "getWorkforceRevisions", "getRunWorkforce", "getWorkforceCoordination", "getWorkforceRuntime"]) assert.match(apiSource, new RegExp(`async ${method}`));
  assert.match(apiSource, /async createWorkforce/);
  assert.match(apiSource, /request<WorkforceDetail>\("\/workforces", \{ method: "POST"/);
  assert.match(apiSource, /`\/workforces\/\$\{encodeURIComponent\(workforceId\)\}`/);
  assert.match(workforceSource, /export function WorkforceCreate\(\)/);
  assert.match(workforceSource, /Create draft r1/);
  assert.match(workforceSource, /Api\.productApi\.createWorkforce/);
  assert.match(workforceSource, /navigate\(`\/workforces\/\$\{encodeURIComponent\(created\.identity\.workforce_id\)\}`\)/);
  assert.match(workforceSource, /Canonical policies/);
  assert.doesNotMatch(workforceSource, /localStorage|fetch\(/);
  assert.ok(appSource.indexOf('path="/workforces/new"') < appSource.indexOf('path="/workforces"'));
});

test("IMP-03F preserves revision, admission, assignment and attempt semantics", () => {
  assert.match(workforceSource, /Slot identity is distinct from Agent identity/);
  assert.match(workforceSource, /current Agent head at Run admission/);
  assert.match(workforceSource, /Historical revisions remain separately addressable and read-only/);
  assert.match(workforceSource, /Admitted Workforce snapshot/);
  assert.match(workforceSource, /Proposals are advisory; decisions are canonical/);
  assert.match(workforceSource, /Attempt references are explicit Product API projections/);
  assert.doesNotMatch(workforceSource, /localStorage|fetch\(/);
});
