import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const capabilitiesPath = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-capabilities.yaml");
const policyPath = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-strategy-policy.yaml");
const docsPath = join(process.cwd(), ".instructions", "ACS_HUMMINGBOT_STRATEGY_POLICY.md");

const capabilityIds = [
  "trading.hummingbot.strategy.research",
  "trading.hummingbot.strategy.diff_proposal",
  "trading.hummingbot.strategy.create_sandboxed",
  "trading.hummingbot.strategy.edit_sandboxed",
  "trading.hummingbot.strategy.disable_sandboxed",
  "trading.hummingbot.strategy.remove_sandboxed",
  "trading.hummingbot.strategy.backtest_design",
  "trading.hummingbot.strategy.backtest_dry_run",
  "trading.hummingbot.strategy.paper_trade",
  "trading.hummingbot.strategy.live_trade",
];

function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return readFileSync(path, "utf8");
}

test("Hummingbot capability registry documents every required capability", () => {
  const registry = read(capabilitiesPath);

  assert.match(registry, /registryId: acs\.trading\.hummingbot\.capabilities/);
  assert.match(registry, /executionEnabled: false/);
  assert.match(registry, /secretAccessEnabled: false/);
  assert.match(registry, /connectorConfigAccessEnabled: false/);

  for (const capabilityId of capabilityIds) {
    assert.match(registry, new RegExp(`id: ${capabilityId.replaceAll(".", "\\.")}`), capabilityId);
  }
});

test("Hummingbot policy YAML keeps dangerous actions No-Go", () => {
  const policy = read(policyPath);

  assert.match(policy, /liveTradingEnabled: false/);
  assert.match(policy, /paperTradingEnabled: false/);
  assert.match(policy, /secretAccessEnabled: false/);
  assert.match(policy, /connectorConfigAccessEnabled: false/);
  assert.match(policy, /capabilityId: trading\.hummingbot\.strategy\.paper_trade[\s\S]*?decision: blocked_by_policy/);
  assert.match(policy, /capabilityId: trading\.hummingbot\.strategy\.paper_trade[\s\S]*?status: no_go/);
  assert.match(policy, /capabilityId: trading\.hummingbot\.strategy\.live_trade[\s\S]*?decision: blocked_by_policy/);
  assert.match(policy, /capabilityId: trading\.hummingbot\.strategy\.live_trade[\s\S]*?status: no_go/);
  assert.match(policy, /forbiddenActions:[\s\S]*?- paper_trade/);
  assert.match(policy, /forbiddenActions:[\s\S]*?- live_trade/);
  assert.match(policy, /forbiddenActions:[\s\S]*?- access_secret/);
  assert.match(policy, /forbiddenActions:[\s\S]*?- access_connector_config/);
});

test("sandboxed Hummingbot mutations require approval and execution ticket", () => {
  const policy = read(policyPath);

  for (const capability of ["create_sandboxed", "edit_sandboxed", "disable_sandboxed"]) {
    const pattern = new RegExp(
      `capabilityId: trading\\.hummingbot\\.strategy\\.${capability}[\\s\\S]*?decision: pending_approval[\\s\\S]*?requiresApproval: true[\\s\\S]*?requiresExecutionTicket: true`,
    );
    assert.match(policy, pattern, capability);
  }

  assert.match(
    policy,
    /capabilityId: trading\.hummingbot\.strategy\.remove_sandboxed[\s\S]*?decision: requires_human_review[\s\S]*?requiresHumanReview: true[\s\S]*?requiresRollbackPlan: true[\s\S]*?requiresExecutionTicket: true/,
  );
});

test("Trinity is registered only as conditional executor", () => {
  const registry = read(capabilitiesPath);
  const policy = read(policyPath);
  const docs = read(docsPath);

  assert.match(registry, /agentId: trinity[\s\S]*?role: conditional_executor/);
  assert.match(registry, /requiresExecutionTicketForMutation: true/);
  assert.match(registry, /mayExecuteWithoutTicket: false/);
  assert.match(policy, /agentId: trinity[\s\S]*?role: conditional_executor/);
  assert.match(policy, /mayMutateSandboxWithoutTicket: false/);
  assert.match(policy, /mayMutateLiveRuntime: false/);
  assert.match(policy, /mayAccessSecrets: false/);
  assert.match(docs, /conditional executor/);
});

test("Hummingbot strategy policy documentation states hard constraints", () => {
  const docs = read(docsPath);

  assert.match(docs, /Paper trading remains blocked/);
  assert.match(docs, /Live trading remains blocked/);
  assert.match(docs, /Secrets remain blocked/);
  assert.match(docs, /Connector configs remain blocked/);
  assert.match(docs, /No real file is edited/);
});
