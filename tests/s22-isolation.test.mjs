import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AcsCapabilityRegistry,
  AgentService,
  AuditService,
  CredentialConnectionRegistry,
  EconomicService,
  EngineRegistry,
  ExecutionTargetService,
  InMemorySecretStore,
  IsolationRootError,
  IsolationScopeError,
  LocalExecutionWorker,
  ModelProviderRegistry,
  StaticAxodusModelGateway,
  AxodusManagedModelProvider,
  AgentRunnerRegistry,
  DeploymentService,
  RuntimeLifecycleService,
  isPathInsideRoot,
  normalizeIsolationRoots,
  WorkerAssignmentService,
  ExecutionWorkerRegistry,
} from "../dist/index.js";
import { ExecutionPlanResolver } from "../dist/control-plane/execution-plan-resolver.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

function createMockEngine(options = {}) {
  const runtimes = new Map();
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] };
    },
    async version() {
      return { identity: this.identity, packageVersion: "0.0.1", sourceRevision: "rev-1", supportedProtocols: ["acs-engine/1"] };
    },
    async capabilities() {
      return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: ["runtime"], deploymentModes: ["sandbox"] };
    },
    async listExecutionTargets() {
      return [{
        id: "local-wsl",
        type: "local",
        environment: "dev",
        engineId: "openclaw",
        status: "ready",
        health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] },
        capabilities: ["deployment.sandbox"],
        deploymentModes: ["sandbox"],
        schedulingEligible: true,
        schedulingReasons: [],
        supportedRunners: ["opencode"],
        supportedProviders: ["axodus-managed"],
        isolationModes: ["sandbox"],
      }];
    },
    async inspectExecutionTarget() {
      return (await this.listExecutionTargets())[0];
    },
    async deployAgent(request) {
      return {
        deploymentId: `dep_${request.agentId}_r${request.revision}_123`,
        agentId: request.agentId,
        revision: request.revision,
        targetId: request.targetId,
        deploymentMode: request.deploymentMode,
        executionPlanId: request.executionPlanId,
        status: "deployed",
        artifactPath: options.artifactPath ?? "/tmp/artifact.json",
        timestamp: Date.now(),
      };
    },
    async startRuntime(request) {
      if (options.failRuntime) {
        throw new Error("runtime boom");
      }
      const runtimeInstanceId = `run_${request.agentId || "agent"}_123`;
      const record = {
        runtimeInstanceId,
        deploymentId: request.deploymentId,
        agentId: request.agentId,
        status: "running",
        startedAt: Date.now(),
        timestamp: Date.now(),
      };
      runtimes.set(runtimeInstanceId, record);
      return record;
    },
    async inspectRuntime(id) {
      const record = runtimes.get(id);
      if (!record) throw new Error("runtime not found");
      return { ...record, timestamp: Date.now() };
    },
    async stopRuntime(id) {
      const record = runtimes.get(id);
      if (!record) throw new Error("runtime not found");
      record.status = "stopped";
      record.stoppedAt = Date.now();
      return { ...record, timestamp: Date.now() };
    },
    async terminateRuntime(id) {
      const record = runtimes.get(id);
      if (!record) throw new Error("runtime not found");
      record.status = "terminated";
      record.terminatedAt = Date.now();
      return { ...record, timestamp: Date.now() };
    },
    async close() {},
  };
}

async function createAgentSetup(scope) {
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
  credentials.register({
    id: "cred_dev_axodus_managed",
    providerId: "axodus",
    type: "managed",
    status: "configured",
    owner: { tenantId: scope.tenantId },
    scopes: ["model:inference"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const runners = new AgentRunnerRegistry();
  const agentService = new AgentService({ providers, credentials, runners });
  agentService.create({
    definition: {
      agentId: `agent-${scope.tenantId}`,
      name: "Scoped Agent",
      status: "draft",
      capabilityIds: ["deployment.sandbox"],
      skillIds: [],
      toolIds: [],
      credentialConnectionIds: ["cred_dev_axodus_managed"],
      runnerPreferences: [],
      modelStrategy: { primary: { providerId: "axodus", modelId: "default" }, fallbacks: [] },
    },
    createdAt: Date.now(),
  });
  const audit = new AuditService();
  const economic = new EconomicService({
    policy: {
      policyId: "policy_dev",
      revision: 1,
      pricing: {
        "llm.inference": 0n,
        "agent.runtime": 0n,
        compute: 0n,
        memory: 0n,
        storage: 0n,
        tools: 0n,
        network: 0n,
        "premium.capability": 0n,
        "scheduled.execution": 0n,
        "autonomous.duration": 0n,
      },
    },
  });
  const resolver = new ExecutionPlanResolver({
    targetService,
    providers,
    credentials,
    runners,
    engines: engineRegistry,
  });
  const deploymentService = new DeploymentService({
    engine,
    targetService,
    economicService: economic,
    agentService,
    resolver,
    auditService: audit,
    scope,
  });
  const runtimeService = new RuntimeLifecycleService({
    engine,
    deploymentLookup: (deploymentId) => deploymentService.getDeployment(deploymentId, scope),
    auditService: audit,
    scope,
  });

  return { engine, targetService, providers, credentials, runners, agentService, audit, economic, resolver, deploymentService, runtimeService };
}

function createPlan(scope, overrides = {}) {
  return {
    planId: overrides.planId ?? `plan_${scope.tenantId}_${scope.workloadId}_1`,
    agentId: `agent-${scope.tenantId}`,
    agentRevision: 1,
    compositionFingerprint: "fp_scope",
    tenantId: scope.tenantId,
    workloadId: scope.workloadId,
    engineId: "openclaw",
    executionTargetId: "local-wsl",
    deploymentMode: "sandbox",
    createdAt: Date.now(),
    correlationId: overrides.correlationId ?? `corr_${scope.tenantId}_${scope.workloadId}`,
    isolationMode: "sandbox",
    providerId: "axodus",
    modelId: "default",
    credentialConnectionId: "cred_dev_axodus_managed",
  };
}

test("unsafe root overlap and path escape are rejected", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-isolation-"));
  try {
    assert.throws(
      () => normalizeIsolationRoots({
        sourceRoot: join(workspace, "source"),
        runtimeRoot: join(workspace, "runtime"),
        stateRoot: join(workspace, "runtime", "..", "escape"),
        configRoot: join(workspace, "runtime", "config"),
        artifactsRoot: join(workspace, "runtime", "artifacts"),
        workspaceRoot: join(workspace, "runtime", "workspace"),
      }),
      (error) => error instanceof IsolationRootError,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("tenant and workload isolation remain explicit in the control-plane context", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-context-"));
  try {
    const context = createControlPlaneContext({
      acsRoot: workspace,
      runtimeRoot: join(workspace, "runtime"),
      tenantId: "tenant-a",
      workloadId: "workload-a",
      engine: createMockEngine(),
      startLocalWorker: false,
    });

    assert.equal(context.isolation.scope.tenantId, "tenant-a");
    assert.equal(context.isolation.scope.workloadId, "workload-a");
    assert.equal(isPathInsideRoot(context.isolation.roots.workspaceRoot, context.isolation.roots.runtimeRoot), true);
    await context.close();
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("cross-tenant deployment and runtime access are rejected", async () => {
  const scopeA = { tenantId: "tenant-a", workloadId: "workload-a" };
  const scopeB = { tenantId: "tenant-b", workloadId: "workload-b" };
  const setup = await createAgentSetup(scopeA);

  const deployment = await setup.deploymentService.deploy({
    agentId: `agent-${scopeA.tenantId}`,
    revision: 1,
    composition: { role: "analyst" },
    deploymentMode: "sandbox",
    targetId: "local-wsl",
    accountId: "acct-a",
    scope: scopeA,
  });

  const runtime = await setup.runtimeService.start({
    deploymentId: deployment.deploymentId,
    agentId: deployment.agentId,
    deploymentMode: "sandbox",
    targetId: "local-wsl",
    scope: scopeA,
  });

  assert.throws(() => setup.deploymentService.getDeployment(deployment.deploymentId, scopeB), IsolationScopeError);
  assert.equal(setup.deploymentService.listDeployments(scopeB).length, 0);
  await assert.rejects(() => setup.runtimeService.inspect(runtime.runtimeInstanceId, scopeB), IsolationScopeError);
  await assert.rejects(() => setup.runtimeService.stop(runtime.runtimeInstanceId, scopeB), IsolationScopeError);
});

test("credential ownership is enforced by tenant scope", () => {
  const registry = new CredentialConnectionRegistry();
  registry.register({
    id: "cred_a",
    providerId: "axodus",
    type: "managed",
    status: "configured",
    owner: { tenantId: "tenant-a" },
    scopes: ["model:inference"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  assert.equal(registry.getForScope("cred_a", { tenantId: "tenant-a", workloadId: "workload-a" }).id, "cred_a");
  assert.throws(
    () => registry.getForScope("cred_a", { tenantId: "tenant-b", workloadId: "workload-b" }),
    /credential-connection not found/,
  );
});

test("audit, evidence, and economic records stay scoped to the workload", async () => {
  const scope = { tenantId: "tenant-a", workloadId: "workload-a" };
  const audit = new AuditService();
  audit.recordEvent({
    eventType: "deployment.completed",
    correlationId: "corr-a",
    tenantId: scope.tenantId,
    workloadId: scope.workloadId,
    metadata: { tenantId: scope.tenantId, workloadId: scope.workloadId },
  });
  assert.equal(audit.queryEvents({ tenantId: scope.tenantId, workloadId: scope.workloadId }).length, 1);
  assert.equal(audit.queryEvents({ tenantId: "tenant-b" }).length, 0);

  const economic = new EconomicService({
    policy: {
      policyId: "policy_dev",
      revision: 1,
      pricing: {
        "llm.inference": 0n,
        "agent.runtime": 0n,
        compute: 0n,
        memory: 0n,
        storage: 0n,
        tools: 0n,
        network: 0n,
        "premium.capability": 0n,
        "scheduled.execution": 0n,
        "autonomous.duration": 0n,
      },
    },
  });
  const quote = economic.quote({
    quoteId: "quote-a",
    account: {
      accountId: "acct-a",
      ownerId: "acct-a",
      mode: "byok",
      assetCode: "NEURONS",
      tenantId: scope.tenantId,
      workloadId: scope.workloadId,
    },
    planId: "plan-a",
    estimatedUsage: { "agent.runtime": 1n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economic.reserve({ reservationId: "res-a", quoteId: quote.quoteId, idempotencyKey: "idem-a", expiresAt: Date.now() + 60_000 });
  economic.recordUsage({
    recordId: "usage-a",
    runId: "run-a",
    accountId: "acct-a",
    dimension: "agent.runtime",
    quantity: 1n,
    unit: "ms",
    source: "worker",
    observedAt: Date.now(),
    tenantId: scope.tenantId,
    workloadId: scope.workloadId,
  });
  await economic.settle({ settlementId: "settle-a", reservationId: reservation.reservationId, runId: "run-a", idempotencyKey: "settle-a" });
  const receipt = economic.receipt("run-a");
  assert.equal(receipt.tenantId, scope.tenantId);
  assert.equal(receipt.workloadId, scope.workloadId);
  assert.equal(JSON.stringify(receipt).includes("sk-"), false);
});

test("worker reuse does not break workload isolation and serialization remains secret-free", async () => {
  const scopeA = { tenantId: "tenant-a", workloadId: "workload-a" };
  const scopeB = { tenantId: "tenant-b", workloadId: "workload-b" };
  const setupA = await createAgentSetup(scopeA);
  const setupB = await createAgentSetup(scopeB);
  const workerRegistry = new ExecutionWorkerRegistry();
  const workerAssignmentService = new WorkerAssignmentService({ workerRegistry });
  const worker = new LocalExecutionWorker({
    workerRegistry,
    assignmentService: workerAssignmentService,
    engine: setupA.engine,
    targetId: "local-wsl",
    workerId: "worker-1",
    workerName: "Worker 1",
    workerVersion: "0.1.0",
  });

  await worker.start();
  try {
    const planA = createPlan(scopeA, { correlationId: "corr-a" });
    const planB = createPlan(scopeB, { correlationId: "corr-b" });
    const deploymentA = await setupA.deploymentService.deploy({
      agentId: planA.agentId,
      revision: 1,
      composition: { role: "analyst" },
      deploymentMode: "sandbox",
      targetId: "local-wsl",
      accountId: "acct-a",
      scope: scopeA,
    });
    const deploymentB = await setupB.deploymentService.deploy({
      agentId: planB.agentId,
      revision: 1,
      composition: { role: "analyst" },
      deploymentMode: "sandbox",
      targetId: "local-wsl",
      accountId: "acct-b",
      scope: scopeB,
    });

    const runtimeA = await setupA.runtimeService.start({
      deploymentId: deploymentA.deploymentId,
      agentId: deploymentA.agentId,
      deploymentMode: "sandbox",
      targetId: "local-wsl",
      scope: scopeA,
    });
    const runtimeB = await setupB.runtimeService.start({
      deploymentId: deploymentB.deploymentId,
      agentId: deploymentB.agentId,
      deploymentMode: "sandbox",
      targetId: "local-wsl",
      scope: scopeB,
    });

    const assignmentA = await workerAssignmentService.assignWorker({ engineId: "openclaw", requiredDeploymentMode: "sandbox", targetId: "local-wsl" }, {
      assignmentId: "assign-a",
      executionPlan: planA,
      deploymentId: deploymentA.deploymentId,
      runtimeInstanceId: runtimeA.runtimeInstanceId,
      correlationId: planA.correlationId,
      assignedAt: Date.now(),
    });
    const assignmentB = await workerAssignmentService.assignWorker({ engineId: "openclaw", requiredDeploymentMode: "sandbox", targetId: "local-wsl" }, {
      assignmentId: "assign-b",
      executionPlan: planB,
      deploymentId: deploymentB.deploymentId,
      runtimeInstanceId: runtimeB.runtimeInstanceId,
      correlationId: planB.correlationId,
      assignedAt: Date.now(),
    });

    const resultA = await worker.executeAssignment(assignmentA.assignmentId, planA);
    const resultB = await worker.executeAssignment(assignmentB.assignmentId, planB);

    assert.ok(String(resultA.output.runtimeInstanceId).startsWith("run_"));
    assert.ok(String(resultB.output.runtimeInstanceId).startsWith("run_"));
    assert.notEqual(resultA.output.runtimeInstanceId, resultB.output.runtimeInstanceId);

    const secretFree = JSON.stringify({
      deploymentA,
      deploymentB,
      runtimeA,
      runtimeB,
      resultA,
      resultB,
    }, (_key, value) => typeof value === "bigint" ? value.toString() : value);
    assert.equal(secretFree.includes("sk-"), false);
    assert.equal(secretFree.includes("secret_"), false);
  } finally {
    await worker.stop();
  }
});
