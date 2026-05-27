import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createDirectExchangeCallValidationFixture,
  createLiveFlagValidationFixture,
  createNetworkShellValidationFixture,
  createSecretPatternStrategyValidationFixture,
  createValidHummingbotStrategyValidationFixture,
  renderHummingbotStrategyValidationMarkdown,
  validateHummingbotSandboxStrategy,
} from "../dist/index.js";

const sandboxRoot = join(process.cwd(), ".instructions", "acs", "trading", "hummingbot-sandbox");
const strategyPath = join(sandboxRoot, "strategies", "acs_rsi_sandbox_pilot.py");
const reportJsonPath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-validation-report.json");
const reportMarkdownPath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-validation-report.md");
const evidencePath = join(sandboxRoot, "proofs", "acs-rsi-sandbox-validation-evidence.json");
const docsPath = join(process.cwd(), ".instructions", "ACS_HUMMINGBOT_STRATEGY_VALIDATION_GATE.md");
const schemaPath = join(process.cwd(), "src", "schemas", "hummingbot-strategy-validation-gate.schema.yaml");

function failedCodes(report) {
  return report.failedChecks.map((issue) => issue.code);
}

test("valid sandbox strategy passes validation gate", () => {
  const fixture = createValidHummingbotStrategyValidationFixture();
  const report = validateHummingbotSandboxStrategy(fixture, "2026-05-27T13:00:00.000Z");

  assert.equal(report.valid, true);
  assert.equal(report.failedChecks.length, 0);
  assert.equal(report.promotionAllowed, false);
  assert.equal(report.realRuntimeTouched, false);
  assert.equal(report.passedChecks.includes("schema_validation"), true);
  assert.equal(report.passedChecks.includes("no_secrets"), true);
  assert.equal(report.passedChecks.includes("no_direct_exchange_calls"), true);
  assert.equal(report.passedChecks.includes("risk_metadata_present"), true);
  assert.equal(report.passedChecks.includes("rollback_plan_present"), true);
});

test("strategy with secret pattern fails validation gate", () => {
  const report = validateHummingbotSandboxStrategy(createSecretPatternStrategyValidationFixture());

  assert.equal(report.valid, false);
  assert.equal(failedCodes(report).includes("secret_pattern_detected"), true);
});

test("strategy with direct exchange API call fails validation gate", () => {
  const report = validateHummingbotSandboxStrategy(createDirectExchangeCallValidationFixture());

  assert.equal(report.valid, false);
  assert.equal(failedCodes(report).includes("direct_exchange_call_detected"), true);
});

test("strategy with network or shell call fails validation gate", () => {
  const report = validateHummingbotSandboxStrategy(createNetworkShellValidationFixture());
  const codes = failedCodes(report);

  assert.equal(report.valid, false);
  assert.equal(codes.includes("network_call_detected"), true);
  assert.equal(codes.includes("shell_call_detected"), true);
});

test("strategy with production/live flags fails validation gate", () => {
  const report = validateHummingbotSandboxStrategy(createLiveFlagValidationFixture());

  assert.equal(report.valid, false);
  assert.equal(failedCodes(report).includes("live_or_paper_trading_flag_enabled"), true);
});

test("missing rollback plan fails validation gate", () => {
  const report = validateHummingbotSandboxStrategy({
    ...createValidHummingbotStrategyValidationFixture(),
    rollbackPlanPresent: false,
  });

  assert.equal(report.valid, false);
  assert.equal(failedCodes(report).includes("rollback_plan_missing"), true);
});

test("validation reports and evidence records exist for sandbox strategy", () => {
  const report = JSON.parse(readFileSync(reportJsonPath, "utf8"));
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const markdown = readFileSync(reportMarkdownPath, "utf8");
  const rendered = renderHummingbotStrategyValidationMarkdown(validateHummingbotSandboxStrategy(createValidHummingbotStrategyValidationFixture()));

  assert.equal(existsSync(strategyPath), true);
  assert.equal(existsSync(reportJsonPath), true);
  assert.equal(existsSync(reportMarkdownPath), true);
  assert.equal(existsSync(evidencePath), true);
  assert.equal(report.valid, true);
  assert.equal(report.promotionAllowed, false);
  assert.equal(report.realRuntimeTouched, false);
  assert.equal(evidence.noGoChecks.secretsDetected, false);
  assert.equal(evidence.noGoChecks.directExchangeCallsDetected, false);
  assert.match(markdown, /Promotion Allowed: `false`/);
  assert.match(rendered, /Failed Checks/);
});

test("validation gate docs and schema are present", () => {
  const docs = readFileSync(docsPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  assert.equal(existsSync(docsPath), true);
  assert.equal(existsSync(schemaPath), true);
  assert.match(docs, /no secrets/);
  assert.match(docs, /no direct exchange calls/);
  assert.match(docs, /production\/live flag fails/);
  assert.match(schema, /no_network_calls/);
  assert.match(schema, /rollback_plan_present/);
});
