import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const reviewPath = join(
  process.cwd(),
  ".instructions",
  "OPENCLAW_ACS_TRINITY_HUMMINGBOT_READINESS_REVIEW.md",
);
const backlogPath = join(process.cwd(), ".instructions", "ACS_MVP_BACKLOG.md");

function readReview() {
  return readFileSync(reviewPath, "utf8");
}

test("Sprint 79 readiness review document exists and is tracked in backlog", () => {
  assert.equal(existsSync(reviewPath), true);

  const backlog = readFileSync(backlogPath, "utf8");
  assert.match(backlog, /# Sprint 79 - Trinity ACS\/Hummingbot Readiness Review/);
  assert.match(backlog, /Keep Hummingbot real runtime mutation, paper trading, live trading, MCP, network, secrets and production as No-Go/);
});

test("readiness review references evidence from Sprints 68 through 78", () => {
  const review = readReview();

  for (const sprint of ["68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78"]) {
    assert.match(review, new RegExp(`\\| ${sprint} \\|`));
  }

  assert.match(review, /ACS_TRINITY_INTAKE_BOUNDARY\.md/);
  assert.match(review, /ACS_TRADING_INTENT_CLASSIFIER\.md/);
  assert.match(review, /ACS_TRINITY_ROUNDTRIP_PROTOCOL\.md/);
  assert.match(review, /ACS_HUMMINGBOT_STRATEGY_VALIDATION_GATE\.md/);
  assert.match(review, /ACS_TRINITY_TELEGRAM_RESPONSE_CONTRACT\.md/);
});

test("readiness decision matrix allows only controlled Trinity and sandbox capabilities", () => {
  const review = readReview();

  assert.match(review, /\| Telegram intake \| Go \|/);
  assert.match(review, /\| ACS roundtrip \| Go \|/);
  assert.match(review, /\| research report \| Go \|/);
  assert.match(review, /\| artifact request \| Limited Go \|/);
  assert.match(review, /\| Hummingbot diff-only proposal \| Go \|/);
  assert.match(review, /\| Hummingbot sandbox create\/edit \| Limited Go \|/);
  assert.match(review, /\| Hummingbot sandbox disable\/remove \| Limited Go \|/);
  assert.match(review, /\| Hummingbot strategy validation \| Go \|/);
});

test("readiness review preserves runtime, trading, network and secret No-Go areas", () => {
  const review = readReview();

  assert.match(review, /\| Hummingbot real runtime mutation \| No-Go \|/);
  assert.match(review, /\| paper trading \| No-Go \|/);
  assert.match(review, /\| live trading \| No-Go \|/);
  assert.match(review, /\| MCP \| No-Go \|/);
  assert.match(review, /\| network \| No-Go \|/);
  assert.match(review, /\| secrets \| No-Go \|/);
  assert.match(review, /\| production \| No-Go \|/);
  assert.match(review, /API keys/);
  assert.match(review, /connector configs/);
});

test("readiness review recommends report-only backtest dry-run design as next block", () => {
  const review = readReview();

  assert.match(review, /Backtest dry-run design contract, report-only/);
  assert.match(review, /Backtest input manifest, sandbox-only and no execution/);
  assert.match(review, /Do not start paper trading, live trading or real Hummingbot integration in the next block/);
  assert.match(review, /ACS must not treat Trinity as a real Hummingbot runtime actor yet/);
});
