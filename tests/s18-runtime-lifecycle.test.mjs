import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeLifecycleService } from "../dist/control-plane/runtime-lifecycle-service.js";
import { EngineSandboxOnlyError } from "../dist/engines/engine-errors.js";

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
      return [];
    },
    async inspectExecutionTarget() {
      throw new Error("not implemented");
    },
    async deployAgent() {
      throw new Error("not implemented");
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

test("RuntimeLifecycleService starts sandbox runtime instance", async () => {
  const engine = createMockEngine();
  const service = new RuntimeLifecycleService({ engine });
  const instance = await service.start({
    deploymentId: "dep_mazikeen_123",
    agentId: "mazikeen",
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });
  assert.equal(instance.status, "running");
  assert.equal(instance.agentId, "mazikeen");
  assert.ok(instance.runtimeInstanceId.startsWith("run_mazikeen"));
});

test("RuntimeLifecycleService rejects live runtime execution", async () => {
  const engine = createMockEngine();
  const service = new RuntimeLifecycleService({ engine });
  await assert.rejects(
    async () => {
      await service.start({
        deploymentId: "dep_mazikeen_123",
        agentId: "mazikeen",
        deploymentMode: "live",
        targetId: "local-wsl",
      });
    },
    (err) => err instanceof EngineSandboxOnlyError
  );
});

test("RuntimeLifecycleService validates state transitions and stops runtime", async () => {
  const engine = createMockEngine();
  const service = new RuntimeLifecycleService({
    engine,
    deploymentLookup: () => ({ targetId: "local-wsl", deploymentMode: "sandbox" }),
  });
  const instance = await service.start({
    deploymentId: "dep_mazikeen_123",
    agentId: "mazikeen",
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });

  assert.equal(service.validateStateTransition("running", "stopping"), true);
  assert.equal(service.validateStateTransition("stopped", "running"), false);

  const stopped = await service.stop(instance.runtimeInstanceId);
  assert.equal(stopped.status, "stopped");
  assert.ok(stopped.stoppedAt);
});

test("RuntimeLifecycleService creates ExecutionRun distinct from RuntimeInstance", async () => {
  const engine = createMockEngine();
  const service = new RuntimeLifecycleService({
    engine,
    deploymentLookup: () => ({ targetId: "local-wsl", deploymentMode: "sandbox" }),
  });
  const instance = await service.start({
    deploymentId: "dep_mazikeen_123",
    agentId: "mazikeen",
    deploymentMode: "sandbox",
    targetId: "local-wsl",
  });

  const execRun = service.createExecutionRun({
    runtimeInstanceId: instance.runtimeInstanceId,
    agentId: "mazikeen",
    executionPlanId: "plan_mazikeen_r1",
  });

  assert.equal(execRun.runtimeInstanceId, instance.runtimeInstanceId);
  assert.notEqual(execRun.runId, instance.runtimeInstanceId);
  assert.equal(execRun.status, "running");
});
