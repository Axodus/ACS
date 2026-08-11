import test from "node:test";
import assert from "node:assert/strict";
import { AuditService } from "../dist/control-plane/audit-service.js";
import { ExecutionWorkerRegistry } from "../dist/workers/worker-registry.js";
import { WorkerAssignmentService } from "../dist/workers/worker-assignment-service.js";
import { LocalExecutionWorker } from "../dist/workers/local-worker.js";
import {
  WorkerDuplicateError,
  WorkerUnavailableError,
  WorkerIneligibleError,
  WorkerExecutionFailedError,
} from "../dist/workers/worker-types.js";

function createMockEngine(options = {}) {
  const runtimes = new Map();
  const status = options.engineStatus ?? "ready";
  const targetStatus = options.targetStatus ?? "ready";
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return { identity: this.identity, status, supportedProtocols: ["acs-engine/1"], operations: [] };
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
        status: targetStatus,
        health: { status: targetStatus, observedAt: Date.now(), checks: [], findings: [] },
        capabilities: ["deployment.sandbox"],
        deploymentModes: ["sandbox"],
        schedulingEligible: targetStatus === "ready",
        schedulingReasons: targetStatus === "ready" ? [] : ["target unavailable"],
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
        artifactPath: "/tmp/artifact.json",
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
    async inspectRuntime(runtimeInstanceId) {
      const record = runtimes.get(runtimeInstanceId);
      if (!record) {
        throw new Error("runtime not found");
      }
      return { ...record, timestamp: Date.now() };
    },
    async stopRuntime(runtimeInstanceId) {
      const record = runtimes.get(runtimeInstanceId);
      if (!record) {
        throw new Error("runtime not found");
      }
      record.status = "stopped";
      record.stoppedAt = Date.now();
      return { ...record, timestamp: Date.now() };
    },
    async terminateRuntime(runtimeInstanceId) {
      const record = runtimes.get(runtimeInstanceId);
      if (!record) {
        throw new Error("runtime not found");
      }
      record.status = "terminated";
      record.terminatedAt = Date.now();
      return { ...record, timestamp: Date.now() };
    },
    async close() {},
  };
}

function registerHealthyWorker(registry, workerId = "worker-1") {
  registry.register({
    id: workerId,
    name: "Local Worker",
    version: "0.1.0",
    engineId: "openclaw",
    supportedRunners: ["opencode"],
    supportedProviders: ["axodus-managed"],
    supportedIsolationModes: ["sandbox"],
    supportedDeploymentModes: ["sandbox"],
    maxConcurrentRuns: 2,
    targetCompatibility: [{
      executionTargetId: "local-wsl",
      executionTargetType: "local",
      engineId: "openclaw",
      healthStatus: "healthy",
      observedAt: Date.now(),
    }],
  });

  registry.receiveHeartbeat({
    workerId,
    status: "available",
    health: {
      status: "healthy",
      observedAt: Date.now(),
      checks: [],
      findings: [],
    },
    capacity: {
      maxConcurrentRuns: 2,
      activeRuns: 0,
      availableSlots: 2,
    },
    capabilities: {
      engineId: "openclaw",
      engineRevision: "rev-1",
      supportedRunners: ["opencode"],
      supportedProviders: ["axodus-managed"],
      supportedIsolationModes: ["sandbox"],
      supportedDeploymentModes: ["sandbox"],
      maxConcurrentRuns: 2,
    },
  });

  return registry.get(workerId);
}

function createPlan(overrides = {}) {
  return {
    planId: overrides.planId ?? "plan_mazikeen_r1_abc123",
    agentId: "mazikeen",
    agentRevision: 1,
    compositionFingerprint: "fp_abc123",
    engineId: "openclaw",
    executionTargetId: "local-wsl",
    deploymentMode: "sandbox",
    createdAt: Date.now(),
    correlationId: overrides.correlationId ?? "corr-worker-1",
    ...(overrides.engineRevision !== undefined ? { engineRevision: overrides.engineRevision } : {}),
    ...(overrides.runnerId !== undefined ? { runnerId: overrides.runnerId } : {}),
    ...(overrides.providerId !== undefined ? { providerId: overrides.providerId } : {}),
    ...(overrides.modelId !== undefined ? { modelId: overrides.modelId } : {}),
    ...(overrides.credentialConnectionId !== undefined ? { credentialConnectionId: overrides.credentialConnectionId } : {}),
    ...(overrides.governancePolicyId !== undefined ? { governancePolicyId: overrides.governancePolicyId } : {}),
    ...(overrides.economicPolicyId !== undefined ? { economicPolicyId: overrides.economicPolicyId } : {}),
    ...(overrides.isolationMode !== undefined ? { isolationMode: overrides.isolationMode } : {}),
  };
}

function createRequirements(plan) {
  return {
    engineId: plan.engineId,
    engineRevision: plan.engineRevision,
    requiredRunners: plan.runnerId ? [plan.runnerId] : ["opencode"],
    requiredProviders: plan.providerId ? [plan.providerId] : ["axodus-managed"],
    requiredIsolationMode: plan.isolationMode ?? "sandbox",
    requiredDeploymentMode: plan.deploymentMode,
    minAvailableSlots: 1,
    targetId: plan.executionTargetId,
  };
}

test("worker registration, duplicate rejection, lookup, and list are canonical", () => {
  const registry = new ExecutionWorkerRegistry();
  registerHealthyWorker(registry, "worker-1");

  assert.equal(registry.list().length, 1);
  assert.equal(registry.get("worker-1").identity.id, "worker-1");
  assert.equal(registry.get("worker-1").status, "available");
  assert.equal(registry.get("worker-1").health.status, "healthy");

  assert.throws(
    () => registerHealthyWorker(registry, "worker-1"),
    (error) => error instanceof WorkerDuplicateError,
  );
});

test("worker availability and eligibility respond to real capacity and target compatibility", () => {
  const registry = new ExecutionWorkerRegistry();
  const worker = registerHealthyWorker(registry, "worker-1");

  const eligible = registry.evaluateEligibility(worker, {
    engineId: "openclaw",
    engineRevision: "rev-1",
    requiredRunners: ["opencode"],
    requiredProviders: ["axodus-managed"],
    requiredIsolationMode: "sandbox",
    requiredDeploymentMode: "sandbox",
    minAvailableSlots: 1,
    targetId: "local-wsl",
  });

  assert.equal(eligible.eligible, true);

  const engineMismatch = registry.evaluateEligibility(worker, {
    engineId: "other-engine",
    targetId: "local-wsl",
  });
  assert.equal(engineMismatch.eligible, false);
  assert.ok(engineMismatch.reasons.some((reason) => reason.code === "WORKER_ENGINE_MISMATCH"));

  const targetMismatch = registry.evaluateEligibility(worker, {
    engineId: "openclaw",
    targetId: "missing-target",
  });
  assert.equal(targetMismatch.eligible, false);
  assert.ok(targetMismatch.reasons.some((reason) => reason.code === "WORKER_TARGET_INCOMPATIBLE"));

  const freshRegistry = new ExecutionWorkerRegistry();
  registerHealthyWorker(freshRegistry, "worker-2");
  freshRegistry.receiveHeartbeat({
    workerId: "worker-2",
    status: "available",
    health: {
      status: "healthy",
      observedAt: Date.now(),
      checks: [],
      findings: [],
    },
    capacity: {
      maxConcurrentRuns: 2,
      activeRuns: 2,
      availableSlots: 0,
    },
  });
  assert.throws(
    () => freshRegistry.assignRun("worker-2"),
    (error) => error instanceof WorkerUnavailableError,
  );
});

test("assignment service preserves correlation and rejects ineligible work", async () => {
  const registry = new ExecutionWorkerRegistry();
  registerHealthyWorker(registry, "worker-1");
  const assignmentService = new WorkerAssignmentService({ workerRegistry: registry });
  const plan = createPlan({ correlationId: "corr-assign-1" });

  const assignment = await assignmentService.assignWorker(createRequirements(plan), {
    assignmentId: "assign-1",
    executionPlan: plan,
    deploymentId: "dep_mazikeen_r1_abc123",
    runtimeInstanceId: "run_mazikeen_abc123",
    correlationId: plan.correlationId,
    assignedAt: Date.now(),
  });

  assert.equal(assignment.workerId, "worker-1");
  assert.equal(assignment.correlationId, plan.correlationId);
  assert.equal(assignment.status, "assigned");
  assert.ok(assignment.leaseId);
  assert.ok(assignment.planFingerprint);
  assert.equal(JSON.stringify(assignment).includes("sk-"), false);

  await assert.rejects(
    async () => {
      await assignmentService.assignWorker({
        engineId: "other-engine",
        targetId: "local-wsl",
      }, {
        assignmentId: "assign-2",
        executionPlan: plan,
        deploymentId: "dep_mazikeen_r1_abc123",
        runtimeInstanceId: "run_mazikeen_abc123",
        correlationId: "corr-assign-2",
        assignedAt: Date.now(),
      });
    },
    (error) => error instanceof WorkerIneligibleError,
  );
});

test("local dev worker executes governed assignments and preserves audit correlation", async () => {
  const audit = new AuditService();
  const registry = new ExecutionWorkerRegistry();
  const engine = createMockEngine();
  const assignmentService = new WorkerAssignmentService({ workerRegistry: registry });
  const localWorker = new LocalExecutionWorker({
    workerRegistry: registry,
    assignmentService,
    engine,
    targetId: "local-wsl",
    workerId: "worker-local",
    workerName: "Local Worker",
    workerVersion: "0.1.0",
    auditService: audit,
  });

  await localWorker.start();
  try {
    const plan = createPlan({ correlationId: "corr-local-1" });
    const assignment = await assignmentService.assignWorker(createRequirements(plan), {
      assignmentId: "assign-local-1",
      executionPlan: plan,
      deploymentId: "dep_mazikeen_r1_abc123",
      runtimeInstanceId: "run_mazikeen_abc123",
      correlationId: plan.correlationId,
      assignedAt: Date.now(),
    });

    const result = await localWorker.executeAssignment(assignment.assignmentId, plan);
    assert.equal(result.status, "success");
    assert.ok(String(result.output.runtimeInstanceId).startsWith("run_"));

    const stored = assignmentService.getAssignment(assignment.assignmentId);
    assert.equal(stored.status, "completed");
    assert.equal(stored.result.status, "success");

    const events = audit.queryEvents({ correlationId: plan.correlationId });
    assert.ok(events.some((event) => event.eventType === "worker.assignment_completed"));
  } finally {
    await localWorker.stop();
  }
});

test("local dev worker returns structured failure without corrupting assignment state", async () => {
  const audit = new AuditService();
  const registry = new ExecutionWorkerRegistry();
  const engine = createMockEngine({ failRuntime: true });
  const assignmentService = new WorkerAssignmentService({ workerRegistry: registry });
  const localWorker = new LocalExecutionWorker({
    workerRegistry: registry,
    assignmentService,
    engine,
    targetId: "local-wsl",
    workerId: "worker-local-fail",
    workerName: "Local Worker",
    workerVersion: "0.1.0",
    auditService: audit,
  });

  await localWorker.start();
  try {
    const plan = createPlan({
      correlationId: "corr-local-fail",
      credentialConnectionId: "cred_dev_placeholder",
      providerId: "axodus-managed",
      runnerId: "opencode",
    });
    const assignment = await assignmentService.assignWorker(createRequirements(plan), {
      assignmentId: "assign-local-fail",
      executionPlan: plan,
      deploymentId: "dep_mazikeen_r1_abc123",
      runtimeInstanceId: "run_mazikeen_abc123",
      correlationId: plan.correlationId,
      assignedAt: Date.now(),
    });

    await assert.rejects(
      async () => {
        await localWorker.executeAssignment(assignment.assignmentId, plan);
      },
      (error) => error instanceof WorkerExecutionFailedError || /Worker execution failed/.test(String(error?.message ?? error)),
    );

    const stored = assignmentService.getAssignment(assignment.assignmentId);
    assert.equal(stored.status, "failed");
    assert.equal(stored.error.retryable, true);
    assert.equal(JSON.stringify(stored).includes("sk-"), false);
    assert.equal(JSON.stringify(stored).includes("secret"), false);
  } finally {
    await localWorker.stop();
  }
});
