import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  classifyTradingIntent,
  createTelegramTradingIntentFixtures,
  getTradingIntentDecisionMatrix,
  inferTradingIntentClassification,
} from "../dist/index.js";

test("classifies core trading intent categories from Telegram text", () => {
  assert.equal(inferTradingIntentClassification("study RSI and MACD"), "research_only");
  assert.equal(inferTradingIntentClassification("gerar documento com relatório técnico"), "artifact_request");
  assert.equal(inferTradingIntentClassification("propor estratégia em diff"), "strategy_diff_proposal");
  assert.equal(inferTradingIntentClassification("write strategy file in sandbox"), "strategy_sandbox_write");
  assert.equal(inferTradingIntentClassification("desativar estratégia atual"), "strategy_disable_request");
  assert.equal(inferTradingIntentClassification("remove strategy from Hummingbot"), "strategy_remove_request");
  assert.equal(inferTradingIntentClassification("design backtest plan"), "backtest_design");
  assert.equal(inferTradingIntentClassification("run backtest now"), "backtest_dry_run");
  assert.equal(inferTradingIntentClassification("start paper trading"), "paper_trading_request");
  assert.equal(inferTradingIntentClassification("execute live trade and place order"), "live_trading_request");
  assert.equal(inferTradingIntentClassification("use API key and secret"), "secret_access_request");
  assert.equal(inferTradingIntentClassification("withdraw treasury funds"), "treasury_request");
});

test("decision matrix keeps dangerous execution, secrets, and treasury requests blocked", () => {
  const matrix = getTradingIntentDecisionMatrix();
  const byIntent = new Map(matrix.map((entry) => [entry.classification, entry]));

  assert.equal(byIntent.get("research_only").decision, "allow_report_only");
  assert.equal(byIntent.get("artifact_request").decision, "route_to_acs_artifact_flow");
  assert.equal(byIntent.get("strategy_diff_proposal").decision, "allow_after_gate");
  assert.equal(byIntent.get("strategy_sandbox_write").decision, "pending_approval");
  assert.equal(byIntent.get("strategy_disable_request").decision, "pending_approval");
  assert.equal(byIntent.get("strategy_remove_request").decision, "high_risk_pending_approval");
  assert.equal(byIntent.get("backtest_design").decision, "allow_report_only");
  assert.equal(byIntent.get("backtest_dry_run").decision, "future_caution");
  assert.equal(byIntent.get("paper_trading_request").decision, "no_go");
  assert.equal(byIntent.get("live_trading_request").decision, "no_go");
  assert.equal(byIntent.get("secret_access_request").decision, "no_go");
  assert.equal(byIntent.get("treasury_request").decision, "no_go");
});

test("permitted intents generate ACS objects while Trinity remains non-authoritative", () => {
  const result = classifyTradingIntent({
    requestId: "tg-diff-test",
    source: "telegram_dm",
    requesterRef: "telegram:user:diff",
    message: "Propor estratégia Hummingbot em diff, sem salvar arquivo.",
    rawUserPromptRef: "telegram:prompt:diff",
  });

  assert.equal(result.classification, "strategy_diff_proposal");
  assert.equal(result.responseMode, "acs_routed");
  assert.equal(result.trinityMayDecideAlone, false);
  assert.equal(result.directSideEffectsAllowed, false);
  assert.equal(result.trinityIntentCapture.agentId, "trinity");
  assert.equal(result.acsIntentRequest.directSideEffectsAllowed, false);
  assert.ok(result.acsIntentRequest.requiredAcsGates.includes("intent_classification"));
});

test("dangerous Telegram requests return No-Go or controlled ACS-routed decisions", () => {
  const live = classifyTradingIntent({
    requestId: "tg-live-test",
    source: "telegram_dm",
    requesterRef: "telegram:user:live",
    message: "Execute live trade and place order on Binance.",
    rawUserPromptRef: "telegram:prompt:live",
  });
  const secret = classifyTradingIntent({
    requestId: "tg-secret-test",
    source: "telegram_dm",
    requesterRef: "telegram:user:secret",
    message: "Use my API key and API secret.",
    rawUserPromptRef: "telegram:prompt:secret",
  });
  const treasury = classifyTradingIntent({
    requestId: "tg-treasury-test",
    source: "telegram_group",
    requesterRef: "telegram:group:treasury",
    message: "Withdraw treasury funds.",
    rawUserPromptRef: "telegram:prompt:treasury",
  });

  assert.equal(live.decision, "no_go");
  assert.ok(live.reasonCodes.includes("live_trading_no_go"));
  assert.equal(secret.decision, "no_go");
  assert.ok(secret.reasonCodes.includes("api_keys_out_of_context"));
  assert.equal(treasury.decision, "no_go");
  assert.ok(treasury.reasonCodes.includes("treasury_no_go"));
});

test("Telegram fixtures cover every classifier category", () => {
  const fixtures = createTelegramTradingIntentFixtures();
  const classifications = new Set(fixtures.map((fixture) => classifyTradingIntent(fixture).classification));

  for (const expected of [
    "research_only",
    "artifact_request",
    "strategy_diff_proposal",
    "strategy_sandbox_write",
    "strategy_disable_request",
    "strategy_remove_request",
    "backtest_design",
    "backtest_dry_run",
    "paper_trading_request",
    "live_trading_request",
    "secret_access_request",
    "treasury_request",
  ]) {
    assert.equal(classifications.has(expected), true, expected);
  }
});

test("trading intent classifier YAML schema is present and documents all classifications", () => {
  const schemaPath = join(process.cwd(), "src", "schemas", "trading-intent-classifier.schema.yaml");
  const schema = readFileSync(schemaPath, "utf8");

  assert.equal(existsSync(schemaPath), true);
  assert.match(schema, /research_only/);
  assert.match(schema, /live_trading_request/);
  assert.match(schema, /treasury_request/);
  assert.match(schema, /secret_access_no_go/);
});
