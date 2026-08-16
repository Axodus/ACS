import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DurableRuntimeCoordinator,
  RuntimeStaleOwnerError,
  RuntimeStateConflictError,
  SqliteDurableRuntimeState,
} from "../dist/workers/durable-runtime-state.js";

function capabilities(overrides = {}) {
  return {
    engineId: "openclaw",
    engineRevision: "rev-1",
    supportedRunners: ["opencode"],
    supportedProviders: ["axodus-managed"],
    supportedIsolationModes: ["sandbox"],
    supportedDeploymentModes: ["sandbox"],
    supportedTargetIds: ["local-wsl"],
    maxConcurrentRuns: 2,
    ...overrides,
  };
}

function registerAvailable(coordinator, workerId, instanceId, at = 100) {
  const servicePrincipalId = `service:${workerId}`;
  coordinator.registerWorker({
    workerId,
    instanceId,
    servicePrincipalId,
    name: workerId,
    version: "1.0.0",
    capabilities: capabilities(),
    registeredAt: at,
  });
  coordinator.heartbeat({
    workerId,
    instanceId,
    servicePrincipalId,
    status: "available",
    at,
  });
  return { workerId, instanceId, servicePrincipalId };
}

function createJob(coordinator, suffix, overrides = {}) {
  return coordinator.createRuntimeStartJob({
    tenantId: overrides.tenantId ?? "tenant-a",
    runtimeInstanceId: `runtime-${suffix}`,
    deploymentId: `deployment-${suffix}`,
    agentId: `agent-${suffix}`,
    targetId: "local-wsl",
    correlationId: `corr-${suffix}`,
    idempotencyKey: `idempotency-${suffix}`,
    maxAttempts: overrides.maxAttempts ?? 3,
  });
}

function ownership(claim, worker, at) {
  return {
    jobId: claim.job.jobId,
    assignmentId: claim.assignment.assignmentId,
    leaseId: claim.assignment.leaseId,
    fencingToken: claim.assignment.fencingToken,
    workerId: worker.workerId,
    instanceId: worker.instanceId,
    servicePrincipalId: worker.servicePrincipalId,
    at,
  };
}

function result(key, completedAt = 200) {
  return {
    result: {
      status: "success",
      output: { runtimeInstanceId: `engine-${key}`, workerPid: 1234 },
      evidenceRefs: [`evidence:${key}`],
      usageRecords: [{
        dimension: "agent.runtime",
        quantity: "1",
        unit: "run",
        startTime: completedAt - 10,
        endTime: completedAt,
        source: "worker",
        confidence: "final",
      }],
      completedAt,
    },
    resultIdempotencyKey: key,
  };
}

test("D01 durable jobs preserve lifecycle, revisions, metadata, workers and terminal state across restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d01-restart-"));
  const filePath = join(root, "runtime.sqlite");
  let first;
  let second;
  try {
    first = new DurableRuntimeCoordinator({
      store: new SqliteDurableRuntimeState({ filePath }),
      leaseTtlMs: 100,
      workerStaleAfterMs: 1_000,
    });
    const worker = registerAvailable(first, "worker-a", "instance-a", 100);
    const running = createJob(first, "running");
    const claim = first.claimNext({ ...worker, at: 110 });
    assert.ok(claim);
    first.markRunning(ownership(claim, worker, 111));
    const cancelling = createJob(first, "cancelling");
    const cancellingClaim = first.claimNext({ ...worker, at: 112 });
    assert.ok(cancellingClaim);
    first.markRunning(ownership(cancellingClaim, worker, 113));
    first.requestCancellation(cancelling.jobId, "tenant-a", 114);
    const queued = createJob(first, "queued");
    assert.equal(first.getJob(queued.jobId).status, "queued");
    assert.equal(first.getJob(running.jobId).status, "running");
    first.close();
    first = undefined;

    second = new DurableRuntimeCoordinator({
      store: new SqliteDurableRuntimeState({ filePath }),
      leaseTtlMs: 100,
      workerStaleAfterMs: 1_000,
    });
    assert.equal(second.getJob(queued.jobId).status, "queued");
    assert.equal(second.getJob(running.jobId).status, "running");
    assert.equal(second.getJob(cancelling.jobId).status, "cancel_requested");
    assert.equal(second.getJob(running.jobId).revision, 3);
    assert.equal(second.getWorker("worker-a").instanceId, "instance-a");
    assert.equal(second.listAssignments().length, 2);
    assert.equal(second.listEvents({ jobId: running.jobId }).some((event) => event.category === "runtime.job.running"), true);
  } finally {
    first?.close();
    second?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D01 atomic claim gives one durable owner and rejects idempotency conflicts", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d01-claim-"));
  const filePath = join(root, "runtime.sqlite");
  const left = new DurableRuntimeCoordinator({ store: new SqliteDurableRuntimeState({ filePath }), leaseTtlMs: 100 });
  const right = new DurableRuntimeCoordinator({ store: new SqliteDurableRuntimeState({ filePath }), leaseTtlMs: 100 });
  try {
    const workerA = registerAvailable(left, "worker-a", "instance-a", 100);
    const workerB = registerAvailable(right, "worker-b", "instance-b", 100);
    const job = createJob(left, "atomic");
    const [claimA, claimB] = await Promise.all([
      Promise.resolve().then(() => left.claimNext({ ...workerA, at: 101 })),
      Promise.resolve().then(() => right.claimNext({ ...workerB, at: 101 })),
    ]);
    assert.equal([claimA, claimB].filter(Boolean).length, 1);
    assert.equal(left.listAssignments({ jobId: job.jobId }).filter((entry) => entry.status === "active").length, 1);
    const duplicate = createJob(right, "atomic");
    assert.equal(duplicate.jobId, job.jobId);
    assert.throws(
      () => right.store.createJob({
        tenantId: "tenant-a",
        runtimeInstanceId: "different-runtime",
        workload: { type: "runtime.start", deploymentId: "different", deploymentMode: "sandbox", targetId: "local-wsl" },
        requirements: { engineId: "openclaw" },
        correlationId: "different",
        idempotencyKey: "idempotency-atomic",
      }),
      RuntimeStateConflictError,
    );
  } finally {
    left.close();
    right.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D01 lease recovery increments fencing and rejects a late stale result after the new owner completes", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d01-fencing-"));
  const coordinator = new DurableRuntimeCoordinator({
    store: new SqliteDurableRuntimeState({ filePath: join(root, "runtime.sqlite") }),
    leaseTtlMs: 10,
    workerStaleAfterMs: 1_000,
  });
  try {
    const workerA = registerAvailable(coordinator, "worker-a", "instance-a", 100);
    const workerB = registerAvailable(coordinator, "worker-b", "instance-b", 100);
    const job = createJob(coordinator, "fencing");
    const claimA = coordinator.claimNext({ ...workerA, at: 101 });
    assert.ok(claimA);
    coordinator.markRunning(ownership(claimA, workerA, 102));
    const recovery = coordinator.recoverExpired(112);
    assert.equal(recovery.jobsRequeued, 1);
    const claimB = coordinator.claimNext({ ...workerB, at: 113 });
    assert.ok(claimB);
    assert.equal(claimB.assignment.fencingToken, claimA.assignment.fencingToken + 1);
    coordinator.markRunning(ownership(claimB, workerB, 114));
    const completed = coordinator.completeJob({ ...ownership(claimB, workerB, 115), ...result("result-b", 115) });
    assert.equal(completed.status, "succeeded");
    const duplicate = coordinator.completeJob({ ...ownership(claimB, workerB, 116), ...result("result-b", 115) });
    assert.equal(duplicate.revision, completed.revision);
    assert.throws(
      () => coordinator.completeJob({ ...ownership(claimA, workerA, 117), ...result("late-a", 117) }),
      RuntimeStaleOwnerError,
    );
    assert.equal(coordinator.getJob(job.jobId).result.output.runtimeInstanceId, "engine-result-b");
    assert.equal(coordinator.listEvents({ jobId: job.jobId }).some((event) => event.category === "runtime.result.stale_rejected"), true);
  } finally {
    coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D01 dead-worker recovery, retry exhaustion and no-worker backpressure remain deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d01-recovery-"));
  const coordinator = new DurableRuntimeCoordinator({
    store: new SqliteDurableRuntimeState({ filePath: join(root, "runtime.sqlite") }),
    leaseTtlMs: 10,
    workerStaleAfterMs: 10,
  });
  try {
    const worker = registerAvailable(coordinator, "worker-a", "instance-a", 100);
    const job = createJob(coordinator, "poison", { maxAttempts: 1 });
    const claim = coordinator.claimNext({ ...worker, at: 101 });
    assert.ok(claim);
    coordinator.markRunning(ownership(claim, worker, 102));
    const recovery = coordinator.recoverExpired(112);
    assert.equal(recovery.workersMarkedOffline, 1);
    assert.equal(recovery.jobsFailed, 1);
    assert.equal(coordinator.getJob(job.jobId).error.code, "ACS_RUNTIME_RETRY_EXHAUSTED");
    const queued = createJob(coordinator, "backpressure");
    assert.equal(coordinator.claimNext({ ...worker, at: 113 }), undefined);
    assert.equal(coordinator.getJob(queued.jobId).status, "queued");
  } finally {
    coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D01 cancellation race is durable: cancellation wins only when committed before result", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d01-cancel-"));
  const coordinator = new DurableRuntimeCoordinator({
    store: new SqliteDurableRuntimeState({ filePath: join(root, "runtime.sqlite") }),
    leaseTtlMs: 100,
    workerStaleAfterMs: 1_000,
  });
  try {
    const worker = registerAvailable(coordinator, "worker-a", "instance-a", 100);
    const cancelledJob = createJob(coordinator, "cancel-first");
    const cancelledClaim = coordinator.claimNext({ ...worker, at: 101 });
    coordinator.markRunning(ownership(cancelledClaim, worker, 102));
    coordinator.requestCancellation(cancelledJob.jobId, "tenant-a", 103);
    const cancelled = coordinator.completeJob({ ...ownership(cancelledClaim, worker, 104), ...result("cancelled-late", 104) });
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.result, undefined);

    const completedJob = createJob(coordinator, "complete-first");
    const completedClaim = coordinator.claimNext({ ...worker, at: 105 });
    coordinator.markRunning(ownership(completedClaim, worker, 106));
    coordinator.completeJob({ ...ownership(completedClaim, worker, 107), ...result("complete-first", 107) });
    assert.throws(
      () => coordinator.requestCancellation(completedJob.jobId, "tenant-a", 108),
      RuntimeStateConflictError,
    );
  } finally {
    coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});
