import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DefaultExecutionPolicy, InMemoryTelemetrySink, RedHatMcpAdapter } from "../dist/index.js";

test("lists, describes, and plans with RedHat skills without execution", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-redhat-"));
  const skillRoot = join(workspace, "skills", "implementation-planner");

  try {
    mkdirSync(skillRoot, { recursive: true });
    writeFileSync(
      join(skillRoot, "SKILL.md"),
      `---
name: implementation-planner
description: Build implementation plans safely.
---

# Implementation Planner
`,
      "utf8",
    );

    const adapter = new RedHatMcpAdapter({ redHatRoot: workspace });

    assert.deepEqual(adapter.listSkills().map((skill) => skill.id), ["implementation-planner"]);
    assert.match(adapter.describeSkill("implementation-planner").body, /Implementation Planner/);

    const plan = adapter.planTask({ task: "create implementation plan" });
    assert.equal(plan.executionAllowed, false);
    assert.equal(plan.recommendedSkills[0].id, "implementation-planner");
    assert.match(plan.boundary, /does not execute commands/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("executeGuardedTask classifies risk and blocks execution by contract", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-redhat-guarded-"));
  const skillRoot = join(workspace, "skills", "command-execution");

  try {
    mkdirSync(skillRoot, { recursive: true });
    writeFileSync(
      join(skillRoot, "SKILL.md"),
      `---
name: command-execution
description: Execute terminal commands safely with gates.
---

# Command Execution
`,
      "utf8",
    );

    const telemetry = new InMemoryTelemetrySink();
    const adapter = new RedHatMcpAdapter({ redHatRoot: workspace, telemetry });
    const result = adapter.executeGuardedTask({ task: "run command rm -rf /tmp/example" });

    assert.equal(result.status, "blocked");
    assert.equal(result.executionAllowed, false);
    assert.equal(result.dryRun, true);
    assert.equal(result.risk.level, "critical");
    assert.equal(result.allowlistMatched, false);
    assert.equal(result.policy.executionEnabled, false);
    assert.equal(result.policy.sandbox.mode, "blocked");
    assert.equal(telemetry.list()[0].type, "redhat.task.blocked");
    assert.match(result.boundary, /never executes commands/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("executeGuardedTask stays blocked when policy pieces are satisfied but execution is disabled", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-redhat-policy-"));
  const skillRoot = join(workspace, "skills", "implementation-planner");

  try {
    mkdirSync(skillRoot, { recursive: true });
    writeFileSync(
      join(skillRoot, "SKILL.md"),
      `---
name: implementation-planner
description: Build implementation plans safely.
---

# Implementation Planner
`,
      "utf8",
    );

    const adapter = new RedHatMcpAdapter({
      redHatRoot: workspace,
      executionPolicy: new DefaultExecutionPolicy({
        executionEnabled: false,
        allowedActions: ["redhat.executeGuardedTask"],
        sandbox: {
          mode: "read_only",
          networkAllowed: false,
          filesystemWriteAllowed: false,
          allowedPaths: [workspace],
        },
      }),
    });

    const result = adapter.executeGuardedTask({ task: "create implementation plan" });

    assert.equal(result.status, "blocked");
    assert.equal(result.policy.allowlistMatched, true);
    assert.equal(result.policy.approvalState, "not_required");
    assert.equal(result.policy.sandbox.mode, "read_only");
    assert.ok(result.policy.reasons.includes("execution is disabled by policy"));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
