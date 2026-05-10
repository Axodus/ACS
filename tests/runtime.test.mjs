import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertRequiredAgents,
  createAcsRuntime,
  createDevelopmentCoordinationWorkflow,
} from "../dist/index.js";

test("bootstraps ACS runtime with OpenClaw discovery, default policy, telemetry, and JSONL receipts", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-runtime-"));
  const openClawRoot = join(workspace, "openclaw", "agents");

  try {
    for (const agentId of ["redhat", "morpheus", "agentsmith"]) {
      mkdirSync(join(openClawRoot, agentId), { recursive: true });
      writeFileSync(join(openClawRoot, agentId, "AGENTS.md"), `# ${agentId}\n`, "utf8");
    }

    const runtime = createAcsRuntime({ workspaceRoot: workspace, openClawRoot });

    assert.equal(runtime.agents.list().length, 3);
    assert.equal(runtime.agents.require("redhat").agentClass, "owner_product");
    assert.equal(runtime.providers.list().length, 1);
    assert.equal(runtime.receipts.list().length, 0);
    assert.ok(runtime.telemetry.list().some((event) => event.type === "agent.registered"));
    assert.ok(runtime.telemetry.list().some((event) => event.type === "provider.registered"));

    const receipt = runtime.execute(createDevelopmentCoordinationWorkflow());

    assert.equal(receipt.status, "completed");
    assert.equal(receipt.workflowRunId, "dev-coordination:local");
    assert.equal(receipt.steps.length, 3);
    assert.equal(runtime.receipts.list().length, 1);
    assert.equal(runtime.receiptPath, join(workspace, ".acs", "receipts", "execution.jsonl"));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("runtime returns existing receipt for duplicate workflowRunId unless forced", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-runtime-idempotent-"));
  const openClawRoot = join(workspace, "openclaw", "agents");

  try {
    for (const agentId of ["redhat", "morpheus", "agentsmith"]) {
      mkdirSync(join(openClawRoot, agentId), { recursive: true });
      writeFileSync(join(openClawRoot, agentId, "AGENTS.md"), `# ${agentId}\n`, "utf8");
    }

    const runtime = createAcsRuntime({ workspaceRoot: workspace, openClawRoot });
    const workflow = createDevelopmentCoordinationWorkflow("duplicate-check");

    const first = runtime.execute(workflow);
    const duplicate = runtime.execute(workflow);
    const forced = runtime.execute(workflow, { force: true });

    assert.equal(first.id, duplicate.id);
    assert.notEqual(first.id, forced.id);
    assert.equal(runtime.receipts.query({ workflowRunId: "duplicate-check" }).length, 2);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("required agent assertion fails closed with a clear missing-agent error", () => {
  assert.throws(
    () => assertRequiredAgents([{ id: "redhat", name: "RedHat Dev", role: "dev", status: "active", telemetryEnabled: true, permissions: [] }], ["redhat", "morpheus"]),
    /missing required OpenClaw agents: morpheus/,
  );
});
