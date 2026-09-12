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
  assert.match(sharedSource, /Workforce \/ \$\{workforceId\}/);
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
});

test("IMP-03F reads only from accepted Workforce Product API endpoints", () => {
  for (const method of ["listWorkforces", "getWorkforce", "getWorkforceRevisions", "getRunWorkforce", "getWorkforceCoordination", "getWorkforceRuntime"]) assert.match(apiSource, new RegExp(`async ${method}`));
  assert.match(apiSource, /`\/workforces\/\$\{encodeURIComponent\(workforceId\)\}`/);
  assert.doesNotMatch(apiSource, /createWorkforce|updateWorkforce|createWorkforceRevision|archiveWorkforce/);
  assert.match(workforceSource, /Workforce creation unavailable/);
  assert.match(workforceSource, /does not create local state, call repository internals, or write directly to persistence/);
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
