import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReadinessChecklist } from "../dist/index.js";

test("reports the next blocked operational state from readiness checks", () => {
  const result = evaluateReadinessChecklist({
    walletConnected: true,
    academyCompleted: true,
    quizzesCompleted: false,
    proofOfKnowledgeValidated: false,
    neuronsEarned: false,
    licenseAttached: false,
    riskAcknowledged: false,
    apiConfigured: false,
    apiWithdrawalsDisabled: false,
    apiConnectionValidated: false,
  });

  assert.equal(result.completed, false);
  assert.equal(result.nextState, "CERTIFIED");
  assert.ok(result.blockedBy.includes("quizzes.completed"));
});

test("marks readiness complete only when every MVP gate passes", () => {
  const result = evaluateReadinessChecklist({
    walletConnected: true,
    academyCompleted: true,
    quizzesCompleted: true,
    proofOfKnowledgeValidated: true,
    neuronsEarned: true,
    licenseAttached: true,
    riskAcknowledged: true,
    apiConfigured: true,
    apiWithdrawalsDisabled: true,
    apiConnectionValidated: true,
  });

  assert.equal(result.completed, true);
  assert.equal(result.nextState, "READY");
  assert.deepEqual(result.blockedBy, []);
});

