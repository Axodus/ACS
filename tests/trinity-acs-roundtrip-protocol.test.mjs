import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createACSDecisionFromTradingIntent,
  createDefaultDenyACSDecision,
  createTelegramTradingIntentFixtures,
  createTrinityAcsRoundtripFixtures,
  createTrinityUserResponse,
  getACSDecisionReasonCodeTable,
  runTrinityAcsRoundtrip,
  validateACSDecision,
} from "../dist/index.js";

function fixtureByRequestId(requestId) {
  const fixture = createTelegramTradingIntentFixtures().find((item) => item.requestId === requestId);
  assert.ok(fixture, `missing fixture ${requestId}`);
  return fixture;
}

test("roundtrip allows research as report-only and never execution", () => {
  const result = runTrinityAcsRoundtrip(fixtureByRequestId("tg-research-001"));

  assert.equal(result.classification.classification, "research_only");
  assert.equal(result.acsDecision.decision, "allow_report_only");
  assert.deepEqual(result.acsDecision.allowedModes, ["report_only"]);
  assert.equal(result.acsDecision.executionTicketRequired, false);
  assert.equal(result.trinityUserResponse.responseType, "decision");
  assert.equal(result.trinityUserResponse.canExecute, false);
  assert.match(result.trinityUserResponse.message, /report-only/);
});

test("roundtrip allows strategy proposals only as diff-only without writes", () => {
  const result = runTrinityAcsRoundtrip(fixtureByRequestId("tg-diff-001"));

  assert.equal(result.classification.classification, "strategy_diff_proposal");
  assert.equal(result.acsDecision.decision, "allow_diff_only");
  assert.deepEqual(result.acsDecision.allowedModes, ["diff_only"]);
  assert.equal(result.acsDecision.executionTicketRequired, false);
  assert.equal(result.acsDecision.blockedActions.includes("write_file"), true);
  assert.equal(result.acsDecision.blockedActions.includes("mutate_runtime"), true);
  assert.equal(result.acsDecision.blockedActions.includes("call_hummingbot"), true);
  assert.equal(result.trinityUserResponse.responseType, "plan");
  assert.equal(result.trinityUserResponse.canExecute, false);
});

test("roundtrip requires approval and ticket for sandbox mutation requests", () => {
  const result = runTrinityAcsRoundtrip(fixtureByRequestId("tg-sandbox-write-001"));

  assert.equal(result.classification.classification, "strategy_sandbox_write");
  assert.equal(result.acsDecision.decision, "pending_approval");
  assert.equal(result.acsDecision.executionTicketRequired, true);
  assert.equal(result.trinityUserResponse.executionTicketPresent, false);
  assert.equal(result.trinityUserResponse.canExecute, false);
  assert.equal(result.trinityUserResponse.reasonCodes.includes("execution_ticket_missing"), true);
  assert.match(result.trinityUserResponse.message, /valid execution ticket/);
});

test("roundtrip sends high-risk Hummingbot removal to human review", () => {
  const result = runTrinityAcsRoundtrip(fixtureByRequestId("tg-remove-001"));

  assert.equal(result.classification.classification, "strategy_remove_request");
  assert.equal(result.acsDecision.decision, "requires_human_review");
  assert.equal(result.acsDecision.executionTicketRequired, true);
  assert.equal(result.trinityUserResponse.responseType, "plan");
  assert.equal(result.trinityUserResponse.reasonCodes.includes("human_review_required"), true);
  assert.equal(result.trinityUserResponse.canExecute, false);
});

test("roundtrip blocks live trading, secrets, and treasury by policy", () => {
  const live = runTrinityAcsRoundtrip(fixtureByRequestId("tg-live-001"));
  const secret = runTrinityAcsRoundtrip(fixtureByRequestId("tg-secret-001"));
  const treasury = runTrinityAcsRoundtrip(fixtureByRequestId("tg-treasury-001"));

  for (const result of [live, secret, treasury]) {
    assert.equal(result.acsDecision.decision, "blocked_by_policy");
    assert.deepEqual(result.acsDecision.allowedModes, []);
    assert.equal(result.trinityUserResponse.responseType, "block");
    assert.equal(result.trinityUserResponse.reasonCodes.includes("policy_denied"), true);
    assert.equal(result.trinityUserResponse.reasonCodes.includes("telegram_execution_channel_blocked"), true);
    assert.equal(result.trinityUserResponse.canExecute, false);
  }
});

test("missing ACS response defaults to deny", () => {
  const request = fixtureByRequestId("tg-research-001");
  const decision = validateACSDecision(undefined, request.requestId);
  const response = createTrinityUserResponse({ request });

  assert.equal(decision.decision, "deny");
  assert.equal(decision.reasonCodes.includes("acs_missing_decision"), true);
  assert.equal(response.decision, "deny");
  assert.equal(response.responseType, "block");
  assert.equal(response.canExecute, false);
  assert.match(response.message, /Absence of a valid ACS decision is not permission/);
});

test("incomplete ACSDecision defaults to deny", () => {
  const decision = validateACSDecision({
    requestId: "tg-incomplete-001",
    decision: "allow_report_only",
    agentId: "trinity",
  });

  assert.equal(decision.decision, "deny");
  assert.equal(decision.reasonCodes.includes("acs_required_field_missing"), true);
  assert.equal(decision.auditRequired, true);
  assert.equal(decision.evidenceRequired, true);
});

test("valid ticket is only acknowledged by contract and still does not enable execution in this sprint", () => {
  const request = fixtureByRequestId("tg-sandbox-write-001");
  const classification = runTrinityAcsRoundtrip(request).classification;
  const decision = createACSDecisionFromTradingIntent(classification);
  const response = createTrinityUserResponse({
    request,
    decision,
    executionTicket: {
      ticketId: "acs-ticket-001",
      requestId: request.requestId,
      issuedBy: "acs",
      valid: true,
      approvedMode: "approval_required",
      expiresAt: "2026-05-27T23:59:59.000Z",
    },
  });

  assert.equal(response.executionTicketPresent, true);
  assert.equal(response.executionTicketRequired, true);
  assert.equal(response.canExecute, false);
  assert.equal(response.reasonCodes.includes("execution_ticket_missing"), false);
  assert.match(response.message, /does not enable real execution/);
});

test("roundtrip fixtures cover allowed, planned, and blocked requester responses", () => {
  const fixtures = createTrinityAcsRoundtripFixtures();
  const responseTypes = new Set(fixtures.map((fixture) => fixture.trinityUserResponse.responseType));

  assert.equal(fixtures.length, 12);
  assert.equal(responseTypes.has("decision"), true);
  assert.equal(responseTypes.has("plan"), true);
  assert.equal(responseTypes.has("block"), true);
});

test("reason code table and YAML schema document default deny and ticket requirements", () => {
  const reasonCodes = getACSDecisionReasonCodeTable().map((entry) => entry.code);
  const schemaPath = join(process.cwd(), "src", "schemas", "trinity-acs-roundtrip.schema.yaml");
  const schema = readFileSync(schemaPath, "utf8");

  assert.equal(existsSync(schemaPath), true);
  assert.equal(reasonCodes.includes("acs_default_deny"), true);
  assert.equal(reasonCodes.includes("execution_ticket_required"), true);
  assert.match(schema, /ACSDecision/);
  assert.match(schema, /TrinityUserResponse/);
  assert.match(schema, /blocked_by_policy/);
  assert.match(schema, /canExecute/);
});

test("default deny decision is serializable", () => {
  const decision = createDefaultDenyACSDecision("tg-default-deny-001");
  const parsed = JSON.parse(JSON.stringify(decision));

  assert.equal(parsed.requestId, "tg-default-deny-001");
  assert.equal(parsed.decision, "deny");
  assert.equal(parsed.agentId, "trinity");
  assert.equal(parsed.nucleus, "trading");
});
