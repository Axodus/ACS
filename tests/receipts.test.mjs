import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  AcsOrchestrator,
  AgentRegistry,
  BoundedGovernancePolicy,
  InMemoryTelemetrySink,
  JsonlReceiptStore,
  ProviderRegistry,
} from "../dist/index.js";

test("persists execution receipts as local JSONL audit records", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-receipts-"));
  const receiptPath = join(workspace, "receipts", "execution.jsonl");

  try {
    const agents = new AgentRegistry();
    const providers = new ProviderRegistry();
    const telemetry = new InMemoryTelemetrySink();
    const receipts = new JsonlReceiptStore(receiptPath);
    const orchestrator = new AcsOrchestrator({
      agents,
      providers,
      telemetry,
      receipts,
      policy: new BoundedGovernancePolicy(),
    });

    agents.register({
      id: "redhat-dev",
      name: "RedHat Dev",
      role: "development orchestration",
      status: "active",
      telemetryEnabled: true,
      permissions: [{ name: "workflow.plan" }],
    });

    const receipt = orchestrator.execute({
      id: "wf-audit",
      workflowRunId: "wf-audit:run-1",
      name: "Audit persistence",
      createdBy: "codex",
      steps: [
        {
          id: "plan",
          agentId: "redhat-dev",
          action: "plan",
          requiredPermissions: ["workflow.plan"],
        },
      ],
    });

    assert.equal(receipt.status, "completed");
    assert.equal(receipts.list().length, 1);
    assert.equal(receipts.list()[0].id, receipt.id);
    assert.equal(receipts.findByWorkflowRunId("wf-audit:run-1")?.id, receipt.id);
    assert.equal(receipts.query({ agentId: "redhat-dev", status: "completed" }).length, 1);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
