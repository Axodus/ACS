import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const api = readFileSync(resolve(import.meta.dirname, "../src/api/product-api.ts"), "utf8");
const ux = readFileSync(resolve(import.meta.dirname, "../src/OperationalUx.tsx"), "utf8");

test("production deployment UX consumes server-owned readiness and rollback contracts", () => {
  assert.match(api, /production-readiness\?targetId=/);
  assert.match(api, /mode: data\.mode \?\? "sandbox"/);
  assert.match(api, /deployments\/\$\{deploymentId\}\/rollback/);
  assert.match(ux, /Production gate/);
  assert.match(ux, /productionReadiness\.allowed/);
  assert.match(ux, /will be re-evaluated by the server/);
  assert.match(ux, /Rollback production/);
  assert.doesNotMatch(ux, /productionReadiness\.allowed\s*=|localStorage.*production/i);
});
