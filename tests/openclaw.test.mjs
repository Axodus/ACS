import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverOpenClawAgents } from "../dist/index.js";

test("discovers OpenClaw agents without executing agent code", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-openclaw-"));

  try {
    mkdirSync(join(workspace, "redhat"), { recursive: true });
    mkdirSync(join(workspace, "custom"), { recursive: true });
    writeFileSync(join(workspace, "custom", "AGENTS.md"), "# Custom Agent\n", "utf8");

    const agents = discoverOpenClawAgents({ rootPath: workspace });

    assert.deepEqual(
      agents.map((agent) => agent.id),
      ["custom", "redhat"],
    );
    assert.equal(agents.find((agent) => agent.id === "redhat")?.name, "RedHat Dev");
    assert.equal(agents.find((agent) => agent.id === "custom")?.name, "Custom Agent");
    assert.ok(agents.find((agent) => agent.id === "redhat")?.permissions.some((scope) => scope.name === "mcp.coordinate"));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("normalizes OpenClaw main and trinity directories into the Trinity core agent", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-openclaw-alias-"));

  try {
    mkdirSync(join(workspace, "main"), { recursive: true });
    mkdirSync(join(workspace, "trinity"), { recursive: true });
    writeFileSync(join(workspace, "main", "AGENTS.md"), "# AGENTS.md - Trinity's Workspace\n", "utf8");

    const agents = discoverOpenClawAgents({ rootPath: workspace });
    const trinity = agents.find((agent) => agent.id === "trinity");

    assert.deepEqual(agents.map((agent) => agent.id), ["trinity"]);
    assert.deepEqual(trinity?.sourceIds, ["main", "trinity"]);
    assert.equal(trinity?.agentClass, "axodus_core");
    assert.equal(trinity?.audience, "axodus_ecosystem");
    assert.equal(trinity?.canSpawnSubAgents, true);
    assert.ok(trinity?.permissions.some((scope) => scope.name === "subagents.spawn.trading"));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
