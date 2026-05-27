import assert from "node:assert/strict";
import test from "node:test";
import {
  createACSIntentRequest,
  createTrinityIntentCapture,
  evaluateTrinityIntentBoundary,
  getTelegramAllowedResponseMatrix,
  TRINITY_TELEGRAM_HARD_CONSTRAINTS,
} from "../dist/index.js";

test("captures Telegram intent as Trinity intake without side effects", () => {
  const capture = createTrinityIntentCapture({
    requestId: "telegram-intent-001",
    source: "telegram_dm",
    requesterRef: "telegram:user:123",
    intentType: "indicator_study",
    requestedAction: "study RSI divergence for BTC strategy",
    rawUserPromptRef: "prompt:telegram-intent-001",
    requiresArtifact: false,
    requiresStrategyMutation: false,
    requiresExecution: false,
    requiresNetwork: false,
    requiresSecrets: false,
  });

  assert.equal(capture.agentId, "trinity");
  assert.equal(capture.nucleus, "trading");
  assert.equal(capture.source, "telegram_dm");
});

test("routes Telegram Hummingbot strategy creation through ACS and blocks direct mutation", () => {
  const capture = createTrinityIntentCapture({
    requestId: "telegram-intent-002",
    source: "telegram_group",
    requesterRef: "telegram:group:trading",
    intentType: "hummingbot_strategy_create",
    requestedAction: "create a Hummingbot strategy",
    rawUserPromptRef: "prompt:telegram-intent-002",
    requiresArtifact: true,
    requiresStrategyMutation: true,
    requiresExecution: false,
    requiresNetwork: false,
    requiresSecrets: false,
  });
  const request = createACSIntentRequest(capture, "2026-01-01T00:00:00.000Z");

  assert.equal(request.responseMode, "acs_routed");
  assert.equal(request.directSideEffectsAllowed, false);
  assert.ok(request.blockReasons.includes("telegram_direct_file_write_no_go"));
  assert.ok(request.blockReasons.includes("telegram_direct_hummingbot_mutation_no_go"));
  assert.ok(request.requiredAcsGates.includes("hummingbot_diff_only_review"));
  assert.ok(request.requiredAcsGates.includes("sandbox_write_approval"));
});

test("blocks direct Telegram backtest, shell, MCP, network, provider, exchange, and secret access", () => {
  const capture = createTrinityIntentCapture({
    requestId: "telegram-intent-003",
    source: "telegram_dm",
    requesterRef: "telegram:user:456",
    intentType: "backtest_design",
    requestedAction: "run backtest and fetch exchange data",
    rawUserPromptRef: "prompt:telegram-intent-003",
    requiresArtifact: false,
    requiresStrategyMutation: false,
    requiresExecution: true,
    requiresNetwork: true,
    requiresSecrets: true,
  });
  const decision = evaluateTrinityIntentBoundary(capture);

  assert.equal(decision.allowedResponseMode, "acs_routed");
  assert.equal(decision.directSideEffectsAllowed, false);
  assert.ok(decision.blockReasons.includes("telegram_direct_backtest_no_go"));
  assert.ok(decision.blockReasons.includes("telegram_direct_shell_no_go"));
  assert.ok(decision.blockReasons.includes("telegram_direct_mcp_no_go"));
  assert.ok(decision.blockReasons.includes("telegram_direct_network_no_go"));
  assert.ok(decision.blockReasons.includes("telegram_direct_provider_or_exchange_no_go"));
  assert.ok(decision.blockReasons.includes("telegram_direct_secret_access_no_go"));
});

test("allows non-Telegram research intake as report-only without direct side effects", () => {
  const capture = createTrinityIntentCapture({
    requestId: "console-intent-001",
    source: "acs_console",
    requesterRef: "operator:local",
    intentType: "research_request",
    requestedAction: "summarize market microstructure note",
    rawUserPromptRef: "prompt:console-intent-001",
    requiresArtifact: false,
    requiresStrategyMutation: false,
    requiresExecution: false,
    requiresNetwork: false,
    requiresSecrets: false,
  });
  const decision = evaluateTrinityIntentBoundary(capture);

  assert.equal(decision.allowedResponseMode, "report_only");
  assert.equal(decision.directSideEffectsAllowed, false);
  assert.equal(decision.acsRoutingRequired, false);
});

test("Telegram response matrix keeps all direct side effects disabled", () => {
  const matrix = getTelegramAllowedResponseMatrix();
  const create = matrix.find((entry) => entry.requestClass === "hummingbot_strategy_create");
  const research = matrix.find((entry) => entry.requestClass === "research_request");

  assert.equal(create.allowedResponseMode, "acs_routed");
  assert.equal(research.allowedResponseMode, "report_only");
  assert.ok(matrix.every((entry) => entry.directSideEffectsAllowed === false));
  assert.ok(TRINITY_TELEGRAM_HARD_CONSTRAINTS.includes("do_not_touch_real_hummingbot"));
  assert.ok(TRINITY_TELEGRAM_HARD_CONSTRAINTS.includes("do_not_call_shell"));
});
