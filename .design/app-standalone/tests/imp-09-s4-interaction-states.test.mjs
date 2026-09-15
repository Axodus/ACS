import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [appSource, sharedSource, agentsSource, governanceSource, operationsSource, runtimeSource, apiSource] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/shared.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/agents/Agents.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/governance/Governance.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/OperationalUx.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/domains/runtime/Runtime.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/api/product-api.ts", import.meta.url), "utf8"),
]);

test("S4 defines explicit presentation states without conflating loading, empty, error, unavailable or recovery", () => {
  for (const state of ["loading", "empty", "ready", "warning", "blocked", "error", "pending", "recovering", "stale", "unavailable", "redacted"]) {
    assert.match(sharedSource, new RegExp('"' + state + '"'));
  }
  assert.match(sharedSource, /function isApiUnavailable/);
  assert.match(sharedSource, /status === 503 \|\| status === 504/);
  assert.match(sharedSource, /state === "refreshing".*state="recovering"/s);
  assert.match(sharedSource, /if \(unavailable\) return <InteractionStateNotice state="unavailable"/);
  assert.match(sharedSource, /return <InteractionStateNotice state="empty"/);
});

test("S4 keeps Genome source truth separate from client presentation", () => {
  assert.match(agentsSource, /Shared\.staleBanner\(genome, "Genome projections"\)/);
  assert.match(agentsSource, /Shared\.ProjectionStateBadges freshness=\{meta\.freshness\} redactedFields=\{meta\.redacted_fields\} reconstructionState=\{meta\.reconstruction_state\}/);
  assert.match(agentsSource, /state="redacted" message="The Product API withheld the listed fields/);
  assert.match(agentsSource, /unavailable=\{genome\.unavailable\}/);
  assert.match(agentsSource, /source\.addressing === "EXACT"/);
  assert.doesNotMatch(agentsSource, /fieldName\.includes\("status"\)/);
});

test("S4 distinguishes unavailable and redacted Delegation projections while retaining Tenant identity", () => {
  assert.match(governanceSource, /Shared\.staleBanner\(delegations, "delegation grants"\)/);
  assert.match(governanceSource, /Tenant: \{source\.tenant_id\}/);
  assert.match(governanceSource, /Shared\.ProjectionStateBadges freshness=\{metadata\.freshness\}/);
  assert.match(governanceSource, /state="redacted" message="The Product API withheld the listed fields/);
  assert.match(governanceSource, /unavailable=\{delegations\.unavailable\}/);
});

test("S4 preserves Operations and Evidence failures as explicit states rather than empty data", () => {
  assert.match(operationsSource, /unavailable: isUnavailable\(error\)/);
  assert.match(operationsSource, /<Shared\.InteractionStateNotice state=\{unavailable \? "unavailable" : "error"\}/);
  assert.match(runtimeSource, /Shared\.staleBanner\(\{ stale, loadState, loadError, unavailable \}, "evidence"\)/);
  assert.match(runtimeSource, /unavailable=\{unavailable\} emptyMessage="No Evidence records reported by the Product API\."/);
  assert.match(runtimeSource, /unavailable=\{diagnosticsUnavailable\} emptyMessage="No diagnostics reported by the Product API\."/);
  assert.match(runtimeSource, /unavailable=\{unavailable\} emptyMessage="No events reported by the Product API\."/);
});

test("S4 introduces no client-side Product API authority or backend contract", () => {
  assert.doesNotMatch(agentsSource, /fetch\(/);
  assert.doesNotMatch(governanceSource, /fetch\(/);
  assert.doesNotMatch(operationsSource, /request</);
  assert.doesNotMatch(runtimeSource, /request</);
  assert.doesNotMatch(apiSource, /async (createGenome|updateGenome|deleteGenome|mutateGenome|verifyGenome)\(/);
});

test("S4 retains canonical drill-down identity and existing routes", () => {
  assert.match(appSource, /path="\/agents\/:agentId\/genome" element=\{<AgentGenomeView \/>\}/);
  assert.match(appSource, /path="\/agents\/:agentId\/evidence" element=\{<AgentEvidenceView \/>\}/);
  assert.match(appSource, /path="\/operations" element=\{<OperationsStatusPage \/>\}/);
  assert.match(appSource, /path="\/governance" element=\{<GovernanceView \/>\}/);
  assert.match(agentsSource, /Router\.useParams\(\)/);
  assert.match(agentsSource, /Router\.useSearchParams\(\)/);
  assert.match(agentsSource, /revision !== undefined && fingerprint !== undefined/);
  assert.match(agentsSource, /Open Evidence/);
  assert.match(governanceSource, /source\.tenant_id/);
  assert.match(operationsSource, /productApi\.getActivation\(activationId\)/);
});
