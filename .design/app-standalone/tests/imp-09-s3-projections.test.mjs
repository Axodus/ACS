import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [appSource, sharedSource, agentsSource, operationsSource, governanceSource, apiSource, routeSource] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/shared.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/agents/Agents.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/OperationalUx.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/governance/Governance.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/api/product-api.ts", import.meta.url), "utf8"),
  readFile(new URL("../../../src/http/routes/product-api-routes.ts", import.meta.url), "utf8"),
]);

test("S3 exposes Genome as an Agent-local read-only projection", () => {
  assert.match(appSource, /path="\/agents\/:agentId\/genome" element=\{<AgentGenomeView \/>\}/);
  assert.match(sharedSource, /label: "Genome"/);
  assert.match(sharedSource, /\/genome/);
  assert.match(agentsSource, /View Agent Genome/);
  assert.match(agentsSource, /getAgentGenome\(agentId/);
  assert.match(apiSource, /async getAgentGenome\(agentId/);
  assert.match(apiSource, /\/genomes\/agents\//);
  assert.match(agentsSource, /No trait mutation \/ Genome write UI/);
  assert.doesNotMatch(apiSource, /async (createGenome|updateGenome|deleteGenome|mutateGenome|verifyGenome)\(/);
});

test("S3 preserves authoritative Genome availability, redaction and historical reconstruction states", () => {
  assert.match(agentsSource, /meta\.freshness/);
  assert.match(agentsSource, /meta\.reconstruction_state === "GAP"/);
  assert.match(agentsSource, /RECONSTRUCTION GAP/);
  assert.match(agentsSource, /meta\.redacted_fields/);
  assert.match(agentsSource, /revision !== undefined && fingerprint !== undefined/);
  assert.match(agentsSource, /Missing or redacted values are shown as reported; no state is synthesized/);
});

test("S3 positions Automations and Activations under Operations using existing Product API seams", () => {
  assert.match(sharedSource, /label: "Automations", to: "\/operations#operations-automations"/);
  assert.match(operationsSource, /id="operations-automations"/);
  assert.match(operationsSource, /productApi\.listAutomations\(\)/);
  assert.match(operationsSource, /productApi\.getActivation\(activationId\)/);
  assert.match(operationsSource, /Automation & activation/);
  assert.match(routeSource, /apiPath === "automations" && request\.method === "GET"/);
  assert.match(routeSource, /segments\[2\] === "activations"/);
});

test("S3 positions Delegation under Governance while retaining tenant-sensitive projections", () => {
  assert.match(sharedSource, /label: "Delegations", to: "\/governance#governance-delegations"/);
  assert.match(governanceSource, /id="governance-delegations"/);
  assert.match(governanceSource, /Api\.productApi\.listDelegationGrants\(\)/);
  assert.match(governanceSource, /Tenant: \{source\.tenant_id\}/);
  assert.match(governanceSource, /Redacted fields/);
  assert.match(routeSource, /apiPath === "delegation\/grants" && request\.method === "GET"/);
});

test("S3 retains Agent and Workforce navigation and adds no client-side Product API authority", () => {
  assert.match(appSource, /path="\/workforces" element=\{<WorkforceInventory \/>\}/);
  assert.match(sharedSource, /label: "Workforces", to: "\/workforces"/);
  assert.match(agentsSource, /AgentLocalHeader agentId=\{agentId\}/);
  assert.match(governanceSource, /getSystemTenants\(\)/);
  assert.doesNotMatch(agentsSource, /fetch\(/);
  assert.doesNotMatch(operationsSource, /fetch\(/);
  assert.doesNotMatch(governanceSource, /fetch\(/);
  assert.doesNotMatch(apiSource, /async (createGenome|updateGenome|deleteGenome|mutateGenome|verifyGenome)\(/);
});
