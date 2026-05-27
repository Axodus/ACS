import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sandboxRoot = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-sandbox");
const strategyPath = join(sandboxRoot, "strategies", "acs_rsi_sandbox_pilot.py");
const sidecarPath = join(sandboxRoot, "proposals", "acs-rsi-sandbox-pilot-sidecar.json");
const proofPath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-pilot-proof.md");
const evidencePath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-pilot-evidence-index.json");
const rollbackPath = join(sandboxRoot, "rollback", "acs-rsi-sandbox-pilot-rollback.json");
const consolePath = join(sandboxRoot, "console", "acs-rsi-sandbox-pilot-console.txt");
const docsPath = join(process.cwd(), ".instructions", "ACS_TRINITY_STRATEGY_SANDBOX_PILOT.md");
const expectedStrategyHash = "4757a96ee1bd6163fc332592bd8a255aa7c656fcd53b2705fe92289971fe2ed6";

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("Sprint 75 creates exactly one sandbox strategy file", () => {
  const strategyFiles = readdirSync(join(sandboxRoot, "strategies"))
    .filter((file) => file.endsWith(".py"));

  assert.deepEqual(strategyFiles, ["acs_rsi_sandbox_pilot.py"]);
  assert.equal(existsSync(strategyPath), true);
  assert.equal(sha256(strategyPath), expectedStrategyHash);
});

test("sandbox strategy artifact is not a live Hummingbot runtime file", () => {
  const body = readFileSync(strategyPath, "utf8");

  assert.match(body, /ACS sandbox-only Hummingbot strategy artifact/);
  assert.match(body, /live_execution_enabled: bool = False/);
  assert.match(body, /paper_trading_enabled: bool = False/);
  assert.doesNotMatch(body, /api_key\s*[:=]/i);
  assert.doesNotMatch(body, /api_secret\s*[:=]/i);
  assert.doesNotMatch(body, /connector_config\s*[:=]/i);
  assert.doesNotMatch(body, /hummingbot\.connector/);
  assert.doesNotMatch(body, /hummingbot\.client/);
});

test("sidecar, proof, rollback, evidence, and console artifacts exist", () => {
  for (const path of [sidecarPath, proofPath, evidencePath, rollbackPath, consolePath, docsPath]) {
    assert.equal(existsSync(path), true, path);
  }
});

test("sidecar and evidence confirm No-Go areas were not touched", () => {
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8"));
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

  assert.equal(sidecar.strategyArtifact.sha256, expectedStrategyHash);
  assert.equal(sidecar.strategyArtifact.runtimeMounted, false);
  assert.equal(sidecar.realHummingbotTouched, false);
  assert.equal(sidecar.hummingbotRuntimeTouched, false);
  assert.equal(sidecar.connectorConfigAccessed, false);
  assert.equal(sidecar.apiKeysAccessed, false);
  assert.equal(sidecar.secretsAccessed, false);
  assert.equal(sidecar.networkAccessed, false);
  assert.equal(sidecar.mcpAccessed, false);
  assert.equal(sidecar.paperTradingExecuted, false);
  assert.equal(sidecar.liveTradingExecuted, false);

  assert.equal(evidence.strategyFileCount, 1);
  assert.deepEqual(evidence.strategyFilesCreatedOrEdited, [
    ".instructions/acs/trading/hummingbot-sandbox/strategies/acs_rsi_sandbox_pilot.py",
  ]);
  assert.equal(evidence.noGoChecks.realHummingbotTouched, false);
  assert.equal(evidence.noGoChecks.runtimeTouched, false);
  assert.equal(evidence.noGoChecks.connectorConfigAccessed, false);
  assert.equal(evidence.noGoChecks.apiKeysAccessed, false);
  assert.equal(evidence.noGoChecks.secretsAccessed, false);
  assert.equal(evidence.noGoChecks.paperTradingExecuted, false);
  assert.equal(evidence.noGoChecks.liveTradingExecuted, false);
});

test("rollback manifest is sandbox-only and never targets live runtime", () => {
  const rollback = JSON.parse(readFileSync(rollbackPath, "utf8"));

  assert.equal(rollback.operation, "delete_new_sandbox_file");
  assert.equal(rollback.previousArtifactRef, "new_file");
  assert.equal(rollback.sandboxTargetPath, ".instructions/acs/trading/hummingbot-sandbox/strategies/acs_rsi_sandbox_pilot.py");
  assert.equal(rollback.liveRollbackTargetAllowed, false);
  assert.equal(rollback.rollbackMayTouchLiveRuntime, false);
  assert.equal(rollback.contentSha256After, expectedStrategyHash);
});

test("proof and console snapshot state runtime was not touched", () => {
  const proof = readFileSync(proofPath, "utf8");
  const consoleSnapshot = readFileSync(consolePath, "utf8");
  const docs = readFileSync(docsPath, "utf8");

  assert.match(proof, /No real runtime was touched/);
  assert.match(proof, /No Hummingbot API call was made/);
  assert.match(proof, /No Hummingbot MCP call was made/);
  assert.match(consoleSnapshot, /realHummingbotTouched=false/);
  assert.match(consoleSnapshot, /hummingbotRuntimeTouched=false/);
  assert.match(consoleSnapshot, /liveTradingExecuted=false/);
  assert.match(docs, /exactly one sandbox strategy file created/);
});
