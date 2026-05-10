import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RedHatMcpAdapter } from "../dist/index.js";

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
