import test from "node:test";
import assert from "node:assert/strict";
import { ProductApiClient } from "../dist/control-plane/product-api-client.js";
import { AgentService } from "../dist/control-plane/agent-service.js";
import { DeploymentService } from "../dist/control-plane/deployment-service.js";
import { RuntimeLifecycleService } from "../dist/control-plane/runtime-lifecycle-service.js";
import { AuditService } from "../dist/control-plane/audit-service.js";
import { ExecutionPlanResolver } from "../dist/control-plane/execution-plan-resolver.js";
import { ExecutionTargetService } from "../dist/targets/execution-target-service.js";
import { EngineRegistry } from "../dist/engines/engine-registry.js";
import { EngineSandboxOnlyError } from "../dist/engines/engine-errors.js";
import { ModelProviderRegistry } from "../dist/intelligence/model-provider-registry.js";
import { CredentialConnectionRegistry } from "../dist/intelligence/credential-registry.js";
import { AgentRunnerRegistry } from "../dist/intelligence/agent-runner-registry.js";
import { AxodusManagedModelProvider } from "../dist/intelligence/axodus-managed-provider.js";
import { StaticAxodusModelGateway } from "../dist/intelligence/axodus-model-gateway.js";

function createMockEngine() {
  const runtimes = new Map();
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
    async startRuntime(request) {
      if (request.deploymentMode !== "sandbox") {
        throw new EngineSandboxOnlyError("Only sandbox supported");
      }
      const runtimeInstanceId = `run_${request.agentId || "agent"}_123`;
      const data = {
        runtimeInstanceId,
        deploymentId: request.deploymentId,
        agentId: request.agentId,
        status: "running",
        startedAt: Date.now(),
        timestamp: Date.now(),
      };
      runtimes.set(runtimeInstanceId, data);
      return data;
    },
    async inspectRuntime(id) {
      const data = runtimes.get(id);
      if (!data) throw new Error("not found");
      return { ...data, timestamp: Date.now() };
    },
    async stopRuntime(id) {
      const data = runtimes.get(id);
      if (!data) throw new Error("not found");
      data.status = "stopped";
      data.stoppedAt = Date.now();
      return { ...data, timestamp: Date.now() };
    },
    async terminateRuntime(id) {
      const data = runtimes.get(id);
      if (!data) throw new Error("not found");
      data.status = "terminated";
      data.terminatedAt = Date.now();
      return { ...data, timestamp: Date.now() };
    },
    async close() {},
  };
}

test("ProductApiClient queries agents, targets, providers, runners, and audit events", async () => {
  const providers = new ModelProviderRegistry();
  const credentials = new CredentialConnectionRegistry();
  const runners = new AgentRunnerRegistry();
  const agentService = new AgentService({ providers, credentials, runners });

  agentService.create({
    definition: {
      agentId: "mazikeen",
      name: "Mazikeen",
      status: "draft",
      capabilityIds: [],
      skillIds: [],
      toolIds: [],
      credentialConnectionIds: [],
      runnerPreferences: [],
    },
    createdAt: Date.now(),
  });

  const auditService = new AuditService();
  auditService.recordEvent({ eventType: "agent.created", correlationId: "c1", agentId: "mazikeen" });

  const client = new ProductApiClient({ agentService, auditService });

  const agents = await client.listAgents();
  assert.equal(agents.length, 1);
  assert.equal(agents[0].agentId, "mazikeen");

  const agent = await client.getAgent("mazikeen");
  assert.equal(agent?.agentId, "mazikeen");

  const events = await client.queryAuditEvents({ agentId: "mazikeen" });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "agent.created");
});

test("ProductApiClient deploys governed agent to sandbox mode and rejects live mode", async () => {
  const engine = createMockEngine();
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
      modelStrategy: { primary: { providerId: "axodus", modelId: "default" }, fallbacks: [] },
    },
    createdAt: Date.now(),
  });
  const resolver = new ExecutionPlanResolver({ targetService, providers, credentials, runners, engines: engineRegistry });
  const deploymentService = new DeploymentService({ engine, targetService, agentService, resolver });
  const client = new ProductApiClient({ deploymentService });

  const deployed = await client.deployAgent({
    agentId: "mazikeen",
    revision: 1,
    composition: { role: "analyst" },
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });

  assert.equal(deployed.status, "deployed");
  assert.equal(deployed.agentId, "mazikeen");

  const deployments = await client.listDeployments();
  assert.equal(deployments.length, 1);

  await assert.rejects(
    async () => {
      await client.deployAgent({
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

test("ProductApiClient starts and stops runtime instances", async () => {
  const engine = createMockEngine();
  const runtimeService = new RuntimeLifecycleService({ engine });
  const client = new ProductApiClient({ runtimeService });

  const runtime = await client.startRuntime({
    deploymentId: "dep_mazikeen_123",
    agentId: "mazikeen",
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });

  assert.equal(runtime.status, "running");
  assert.equal(runtime.agentId, "mazikeen");

  const stopped = await client.stopRuntime(runtime.runtimeInstanceId);
  assert.equal(stopped.status, "stopped");

  await assert.rejects(
    async () => {
      await client.startRuntime({
        deploymentId: "dep_mazikeen_123",
        agentId: "mazikeen",
        deploymentMode: "live",
        targetId: "local-wsl",
      });
    },
    (err) => err instanceof EngineSandboxOnlyError
  );
});
