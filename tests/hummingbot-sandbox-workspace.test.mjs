import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sandboxRoot = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-sandbox");
const docsPath = join(process.cwd(), ".instructions", "ACS_HUMMINGBOT_STRATEGY_SANDBOX_WORKSPACE.md");

function readSandboxFile(name) {
  const path = join(sandboxRoot, name);
  assert.equal(existsSync(path), true, `missing ${path}`);
  return readFileSync(path, "utf8");
}

test("Hummingbot sandbox workspace structure exists", () => {
  assert.equal(existsSync(docsPath), true);
  assert.equal(existsSync(sandboxRoot), true);

  for (const dir of ["strategies", "proposals", "proofs", "rollback", "console"]) {
    assert.equal(existsSync(join(sandboxRoot, dir, ".gitkeep")), true, dir);
  }
});

test("sandbox manifest keeps runtime, network, secrets, and trading disabled", () => {
  const manifest = readSandboxFile("manifest.yaml");

  assert.match(manifest, /status: defined_not_runtime/);
  assert.match(manifest, /runtimeAuthority: false/);
  assert.match(manifest, /liveHummingbotMounted: false/);
  assert.match(manifest, /networkAllowed: false/);
  assert.match(manifest, /hummingbotApiAllowed: false/);
  assert.match(manifest, /hummingbotRuntimeAllowed: false/);
  assert.match(manifest, /backtestAllowed: false/);
  assert.match(manifest, /paperTradingAllowed: false/);
  assert.match(manifest, /liveTradingAllowed: false/);
  assert.match(manifest, /secretStorageAllowed: false/);
  assert.match(manifest, /connectorConfigAllowed: false/);
  assert.match(manifest, /botRestartAllowed: false/);
});

test("allowed paths are limited to sandbox directories", () => {
  const allowed = readSandboxFile("allowed-paths.yaml");

  for (const dir of ["strategies", "proposals", "proofs", "rollback", "console"]) {
    assert.match(allowed, new RegExp(`hummingbot-sandbox/${dir}`), dir);
  }

  assert.match(allowed, /pathTraversalAllowed: false/);
  assert.match(allowed, /symlinksAllowed: false/);
  assert.match(allowed, /absoluteLiveRuntimePathsAllowed: false/);
});

test("forbidden paths explicitly block live Hummingbot, secrets, connectors, databases, and trading actions", () => {
  const forbidden = readSandboxFile("forbidden-paths.yaml");

  assert.match(forbidden, /\/mnt\/d\/Rede\/Github\/Axodus\/tradingbot/);
  assert.match(forbidden, /\/mnt\/d\/Rede\/Github\/Axodus\/hummingbot-api/);
  assert.match(forbidden, /hummingbot\/connector/);
  assert.match(forbidden, /conf\/connectors/);
  assert.match(forbidden, /api_key/);
  assert.match(forbidden, /api_secret/);
  assert.match(forbidden, /\.db/);
  assert.match(forbidden, /\.sqlite/);
  assert.match(forbidden, /restart_bot/);
  assert.match(forbidden, /paper_trade/);
  assert.match(forbidden, /live_trade/);
});

test("proof, rollback, and evidence rules require hashes and block secrets", () => {
  const proof = readSandboxFile("proof-rules.yaml");
  const rollback = readSandboxFile("rollback-rules.yaml");
  const evidence = readSandboxFile("evidence-rules.yaml");

  assert.match(proof, /hashAlgorithm: sha256/);
  assert.match(proof, /contentSha256/);
  assert.match(proof, /no_secret_access/);
  assert.match(proof, /no_hummingbot_runtime_call/);

  assert.match(rollback, /liveRollbackTargetAllowed: false/);
  assert.match(rollback, /removeRequiresHumanReview: true/);
  assert.match(rollback, /rollbackMayTouchLiveRuntime: false/);

  assert.match(evidence, /sidecar_json/);
  assert.match(evidence, /proof_report/);
  assert.match(evidence, /console_snapshot/);
  assert.match(evidence, /api_key/);
  assert.match(evidence, /live_runtime_state/);
});

test("sandbox documentation states it is not runtime and forbids secrets", () => {
  const docs = readFileSync(docsPath, "utf8");

  assert.match(docs, /not a Hummingbot runtime/);
  assert.match(docs, /Sandbox does not contain API keys/);
  assert.match(docs, /Sandbox does not contain real connector configs/);
  assert.match(docs, /Sandbox has no network authority/);
  assert.match(docs, /Sandbox is not used by Hummingbot live/);
});
