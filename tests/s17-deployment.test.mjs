import test from "node:test";
import assert from "node:assert/strict";
import { DeploymentService } from "../dist/control-plane/deployment-service.js";
import { EngineSandboxOnlyError } from "../dist/engines/engine-errors.js";
import { EconomicService } from "../dist/control-plane/neurons-economic-contract.js";

const devPolicy = {
  policyId: "policy_dev",
  revision: 1,
  pricing: {
    "agent.runtime": 1n,
    "llm.inference": 1n,
    "compute": 1n,
    "memory": 1n,
    "storage": 1n,
    "tools": 1n,
    "network": 1n,
    "premium.capability": 1n,
    "scheduled.execution": 1n,
    "autonomous.duration": 1n,
  },
};

function createMockEngine(options = {}) {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] };
    },
    async version() {
      return { identity: this.identity, supportedProtocols: ["acs-engine/1"] };
    },
    async capabilities() {
      return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] };
    },
    async listExecutionTargets() {
      return [];
    },
    async inspectExecutionTarget() {
      throw new Error("not implemented");
    },
    async deployAgent(request) {
      if (options.failDeploy) {
        throw new Error("Engine deployment failed");
      }
      if (request.deploymentMode !== "sandbox") {
        throw new EngineSandboxOnlyError("Only sandbox supported");
      }
      return {
        deploymentId: `dep_${request.agentId}_r${request.revision}_123`,
        agentId: request.agentId,
        revision: request.revision,
        targetId: request.targetId,
        deploymentMode: request.deploymentMode,
        executionPlanId: request.executionPlanId,
        status: "deployed",
        artifactPath: "/tmp/artifact.json",
        timestamp: Date.now(),
      };
    },
    async close() {},
  };
}

test("DeploymentService deploys governed agent to sandbox target", async () => {
  const engine = createMockEngine();
  const service = new DeploymentService({ engine });
  const result = await service.deploy({
    agentId: "mazikeen",
    revision: 1,
    composition: { role: "analyst" },
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });
  assert.equal(result.status, "deployed");
  assert.equal(result.agentId, "mazikeen");
  assert.equal(result.deploymentMode, "sandbox");
  assert.ok(result.deploymentId.startsWith("dep_mazikeen"));
});

test("DeploymentService rejects live deployment mode", async () => {
  const engine = createMockEngine();
  const service = new DeploymentService({ engine });
  await assert.rejects(
    async () => {
      await service.deploy({
        agentId: "mazikeen",
        revision: 1,
        composition: { role: "analyst" },
        deploymentMode: "live",
        targetId: "local-wsl",
      });
    },
    (err) => err instanceof EngineSandboxOnlyError
  );
});

test("DeploymentService releases reservation if deployment fails", async () => {
  const engine = createMockEngine({ failDeploy: true });
  const economicService = new EconomicService({ policy: devPolicy });
  const service = new DeploymentService({ engine, economicService });

  await assert.rejects(
    async () => {
      await service.deploy({
        agentId: "mazikeen",
        revision: 1,
        composition: { role: "analyst" },
        deploymentMode: "sandbox",
        targetId: "local-wsl",
        accountId: "user_123",
      });
    },
    { message: "Engine deployment failed" }
  );
});
