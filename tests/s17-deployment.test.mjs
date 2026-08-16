import test from "node:test";
import assert from "node:assert/strict";
import { DeploymentService } from "../dist/control-plane/deployment-service.js";
import { AgentService } from "../dist/control-plane/agent-service.js";
import { ExecutionPlanResolver } from "../dist/control-plane/execution-plan-resolver.js";
import { ExecutionTargetService } from "../dist/targets/execution-target-service.js";
import { EngineRegistry } from "../dist/engines/engine-registry.js";
import { ModelProviderRegistry } from "../dist/intelligence/model-provider-registry.js";
import { CredentialConnectionRegistry } from "../dist/intelligence/credential-registry.js";
import { AgentRunnerRegistry } from "../dist/intelligence/agent-runner-registry.js";
import { AxodusManagedModelProvider } from "../dist/intelligence/axodus-managed-provider.js";
import { StaticAxodusModelGateway } from "../dist/intelligence/axodus-model-gateway.js";
import { EconomicService } from "../dist/control-plane/neurons-economic-contract.js";
import { PolicyRejectedError } from "../dist/errors.js";

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
      return [{ id: "local-wsl", type: "local", environment: "dev", engineId: "openclaw", status: "ready", health: { status: "ready", observedAt: 1, checks: [], findings: [] }, capabilities: ["deployment.sandbox"], deploymentModes: ["sandbox"], schedulingEligible: true, schedulingReasons: [], supportedRunners: [], supportedProviders: [], isolationModes: ["sandbox"] }];
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

async function createSetup(options = {}) {
  const engine = createMockEngine(options);
  const engineRegistry = new EngineRegistry();
  engineRegistry.register(engine);
  const targetService = new ExecutionTargetService(engineRegistry);
  await targetService.refresh();
  const providers = new ModelProviderRegistry();
  providers.register(new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({ models: [{ modelId: "default", displayName: "Default", availability: "available", capabilities: { supports: ["text"] } }] }),
  }));
  const credentials = new CredentialConnectionRegistry();
  const runners = new AgentRunnerRegistry();
  const agentService = new AgentService({ providers, credentials, runners });
  agentService.create({
    definition: {
      agentId: "mazikeen",
      name: "Mazikeen",
      status: "draft",
      capabilityIds: ["deployment.sandbox"],
      skillIds: [],
      toolIds: [],
      credentialConnectionIds: [],
      runnerPreferences: [],
      modelStrategy: {
        primary: { providerId: "axodus", modelId: "default" },
        fallbacks: [],
      },
    },
    createdAt: Date.now(),
  });
  const resolver = new ExecutionPlanResolver({ targetService, providers, credentials, runners, engines: engineRegistry });
  const service = new DeploymentService({ engine, targetService, agentService, resolver, economicService: options.economicService });
  return service;
}

test("DeploymentService deploys governed agent to sandbox target", async () => {
  const service = await createSetup();
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
  assert.ok(result.deploymentId.startsWith("deployment_"));
});

test("DeploymentService rejects live deployment mode", async () => {
  const service = await createSetup();
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
    (err) => err instanceof PolicyRejectedError
      && err.message === "Production deployment requires an explicit deployment.production allow rule."
  );
});

test("DeploymentService releases reservation if deployment fails", async () => {
  const economicService = new EconomicService({ policy: devPolicy });
  const service = await createSetup({ failDeploy: true, economicService });

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
