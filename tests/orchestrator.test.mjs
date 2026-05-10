import assert from "node:assert/strict";
import test from "node:test";
import {
  AcsOrchestrator,
  AgentRegistry,
  BoundedGovernancePolicy,
  InMemoryTelemetrySink,
  ProviderRegistry,
} from "../dist/index.js";

function createRuntime() {
  const agents = new AgentRegistry();
  const providers = new ProviderRegistry();
  const telemetry = new InMemoryTelemetrySink();
  const policy = new BoundedGovernancePolicy(["treasury.transfer"], 3);
  const orchestrator = new AcsOrchestrator({ agents, providers, policy, telemetry });

  agents.register({
    id: "redhat-dev",
    name: "RedHat Dev",
    role: "development orchestration",
    status: "active",
    telemetryEnabled: true,
    permissions: [{ name: "workflow.plan" }, { name: "code.generate" }],
  });

  providers.register({
    id: "local-mock-provider",
    name: "Local Mock Provider",
    status: "available",
    capabilities: [{ name: "code-generation" }],
    pricing: { unit: "execution", currency: "USD", amount: 0 },
  });

  return { orchestrator, telemetry };
}

test("executes a bounded workflow with telemetry and provider visibility", () => {
  const { orchestrator, telemetry } = createRuntime();

  const receipt = orchestrator.execute({
    id: "wf-bootstrap-core",
    name: "Bootstrap ACS core",
    createdBy: "codex",
    steps: [
      {
        id: "plan",
        agentId: "redhat-dev",
        action: "plan-core",
        requiredPermissions: ["workflow.plan"],
      },
      {
        id: "generate",
        agentId: "redhat-dev",
        action: "generate-code",
        requiredPermissions: ["code.generate"],
        providerCapability: "code-generation",
      },
    ],
  });

  assert.equal(receipt.status, "completed");
  assert.equal(receipt.workflowRunId, "wf-bootstrap-core");
  assert.equal(receipt.steps.length, 2);
  assert.equal(receipt.steps[1].providerId, "local-mock-provider");
  assert.deepEqual(
    telemetry.list().map((event) => event.type),
    ["workflow.accepted", "workflow.started", "workflow.completed"],
  );
});

test("rejects workflows that violate governance bounds", () => {
  const { orchestrator } = createRuntime();

  const receipt = orchestrator.execute({
    id: "wf-empty",
    name: "Empty workflow",
    createdBy: "codex",
    steps: [],
  });

  assert.equal(receipt.status, "rejected");
  assert.match(receipt.rejectionReason, /at least one step/);
});

test("fails closed when an agent lacks a required permission", () => {
  const { orchestrator } = createRuntime();

  const receipt = orchestrator.execute({
    id: "wf-missing-permission",
    name: "Missing Permission",
    createdBy: "codex",
    steps: [
      {
        id: "execute",
        agentId: "redhat-dev",
        action: "unknown-action",
        requiredPermissions: ["billing.settle"],
      },
    ],
  });

  assert.equal(receipt.status, "failed");
  assert.match(receipt.rejectionReason, /missing permission/);
});
