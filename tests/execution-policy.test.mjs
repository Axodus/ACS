import assert from "node:assert/strict";
import test from "node:test";
import { DefaultExecutionPolicy, assessCommandRisk } from "../dist/index.js";

test("classifies critical command risk", () => {
  const risk = assessCommandRisk("run command rm -rf /tmp/example");

  assert.equal(risk.level, "critical");
  assert.equal(risk.requiresExplicitApproval, true);
  assert.match(risk.reasons[0], /rm -rf/);
});

test("blocks execution when execution is disabled even if allowlist and approval match", () => {
  const policy = new DefaultExecutionPolicy({
    executionEnabled: false,
    allowedActions: ["redhat.executeGuardedTask"],
    approvalTokens: ["approved"],
    sandbox: {
      mode: "workspace_write",
      workspaceRoot: "/tmp/workspace",
      filesystemWriteAllowed: true,
      networkAllowed: false,
      allowedPaths: ["/tmp/workspace"],
    },
  });

  const decision = policy.evaluate({
    task: "modify implementation plan",
    requestedAction: "redhat.executeGuardedTask",
    approvalToken: "approved",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.executionEnabled, false);
  assert.equal(decision.allowlistMatched, true);
  assert.equal(decision.approvalState, "satisfied");
  assert.ok(decision.reasons.includes("execution is disabled by policy"));
});

test("requires allowlist and approval for risky tasks", () => {
  const policy = new DefaultExecutionPolicy({
    executionEnabled: true,
    allowedActions: [],
    sandbox: {
      mode: "workspace_write",
      workspaceRoot: "/tmp/workspace",
      filesystemWriteAllowed: true,
      networkAllowed: false,
      allowedPaths: ["/tmp/workspace"],
    },
  });

  const decision = policy.evaluate({
    task: "deploy local test change",
    requestedAction: "redhat.executeGuardedTask",
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.allowlistMatched, false);
  assert.equal(decision.approvalState, "missing");
  assert.ok(decision.reasons.includes("requested action is not in the command allowlist"));
});
