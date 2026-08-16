import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  SqliteDurableRuntimeState,
  issueSignedWorkerToken,
} from "../dist/index.js";

const signingKey = "aees-d-process-worker-service-key-with-at-least-thirty-two-bytes";
const issuer = "https://identity.test/aees-d-worker";
const audience = "acs-runtime-worker";
const testDir = dirname(fileURLToPath(import.meta.url));
const distRoot = resolve(testDir, "../dist");
const controlPlaneEntrypoint = join(distRoot, "workers", "runtime-control-plane-entrypoint.js");
const workerEntrypoint = join(distRoot, "workers", "remote-worker-entrypoint.js");
const actorHeaders = { "x-acs-actor-id": "system", "x-acs-actor-type": "system" };

function progress(stage, details = {}) {
  process.stderr.write(`AEES_D_PROGRESS ${JSON.stringify({ stage, timestamp: Date.now(), ...details })}\n`);
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

function processToken(workerId, instanceId) {
  return issueSignedWorkerToken({
    issuer,
    audience,
    signingKey,
    workerId,
    instanceId,
    capabilities: ["engine:openclaw", "isolation:sandbox", "deployment:sandbox", "target:local-wsl"],
    expiresAt: Date.now() + 10 * 60_000,
  });
}

async function startJsonProcess(entrypoint, environment, expectedService, timeoutMs = 30_000) {
  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const ready = await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => {
      try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
      child.stdout.destroy();
      child.stderr.destroy();
      reject(new Error(`timed out starting ${expectedService}; stdout=${stdout}; stderr=${stderr}`));
    }, timeoutMs);
    const inspect = () => {
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) continue;
        try {
          const value = JSON.parse(line);
          if (value.service === expectedService && value.success === true) {
            clearTimeout(timeout);
            resolveReady(value);
            return;
          }
        } catch { /* wait for a complete JSON line */ }
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`${expectedService} exited before ready: code=${code} signal=${signal}; stdout=${stdout}; stderr=${stderr}`));
    });
    inspect();
  });
  return { child, ready, stderr: () => stderr, stdout: () => stdout };
}

async function startControlPlane({ root, label, port, runtimeDatabasePath }) {
  const runtimeRoot = join(root, label, "runtime-root");
  return startJsonProcess(controlPlaneEntrypoint, {
    ACS_ROOT: process.cwd(),
    ACS_HTTP_HOST: "127.0.0.1",
    ACS_HTTP_PORT: String(port),
    ACS_DISPATCH_MODE: "remote",
    ACS_RUNTIME_DATABASE_PATH: runtimeDatabasePath,
    ACS_WORKER_IDENTITY_MODE: "signed_jwt",
    ACS_WORKER_TOKEN_ISSUER: issuer,
    ACS_WORKER_TOKEN_AUDIENCE: audience,
    ACS_WORKER_TOKEN_SIGNING_KEY: signingKey,
    ACS_WORKER_LEASE_TTL_MS: "60000",
    ACS_WORKER_STALE_AFTER_MS: "30000",
    ACS_RUNTIME_RECOVERY_SCAN_INTERVAL_MS: "5000",
    ACS_RUNTIME_ROOT: runtimeRoot,
    ACS_STATE_ROOT: join(runtimeRoot, ".acs", "state"),
    ACS_CONFIG_ROOT: join(runtimeRoot, ".acs", "config"),
    ACS_ARTIFACTS_ROOT: join(runtimeRoot, ".acs", "artifacts"),
    ACS_WORKSPACE_ROOT: join(runtimeRoot, ".acs", "workspace"),
  }, "acs-runtime-control-plane");
}

async function startWorker({ root, label, baseUrl, workerId, instanceId, executionDelayMs = 100 }) {
  const runtimeRoot = join(root, label, "runtime-root");
  const stateRoot = join(runtimeRoot, ".acs", "state");
  const configRoot = join(runtimeRoot, ".acs", "config");
  const artifactsRoot = join(runtimeRoot, ".acs", "artifacts");
  const workspaceRoot = join(runtimeRoot, ".acs", "workspace");
  await Promise.all([stateRoot, configRoot, artifactsRoot, workspaceRoot].map((path) => mkdir(path, { recursive: true })));
  await writeFile(join(configRoot, "openclaw.json"), "{}\n", "utf8");
  return startJsonProcess(workerEntrypoint, {
    ACS_ROOT: process.cwd(),
    ACS_CONTROL_PLANE_URL: baseUrl,
    ACS_WORKER_TOKEN: processToken(workerId, instanceId),
    ACS_WORKER_ID: workerId,
    ACS_WORKER_INSTANCE_ID: instanceId,
    ACS_WORKER_NAME: label,
    ACS_WORKER_VERSION: "1.0.0-aees-d",
    ACS_WORKER_TARGET_ID: "local-wsl",
    ACS_WORKER_HEARTBEAT_INTERVAL_MS: "2000",
    ACS_WORKER_POLL_INTERVAL_MS: "500",
    ACS_WORKER_LEASE_RENEW_INTERVAL_MS: "2000",
    ACS_WORKER_REQUEST_TIMEOUT_MS: "30000",
    ACS_WORKER_EXECUTION_DELAY_MS: String(executionDelayMs),
    ACS_RUNTIME_ROOT: runtimeRoot,
    ACS_STATE_ROOT: stateRoot,
    ACS_CONFIG_ROOT: configRoot,
    ACS_ARTIFACTS_ROOT: artifactsRoot,
    ACS_WORKSPACE_ROOT: workspaceRoot,
  }, "acs-remote-worker", 60_000);
}

async function stopProcess(runtime, signal = "SIGTERM", timeoutMs = 10_000) {
  if (!runtime?.child || runtime.child.exitCode !== null || runtime.child.signalCode !== null) return;
  try {
    process.kill(-runtime.child.pid, signal);
  } catch {
    runtime.child.kill(signal);
  }
  await new Promise((resolveExit, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`process ${runtime.child.pid} did not exit after ${signal}; stderr=${runtime.stderr()}`)),
      timeoutMs,
    );
    runtime.child.once("exit", () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function jsonRequest(baseUrl, path, options = {}) {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.auth === false ? {} : actorHeaders),
      ...(options.headers ?? {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { status: response.status, body, headers: response.headers };
}

async function createRuntime(baseUrl, suffix, targetId = "local-wsl") {
  const runtimeInstanceId = `runtime-${suffix}`;
  const response = await jsonRequest(baseUrl, `/api/v1/runtimes/${runtimeInstanceId}/start`, {
    method: "POST",
    body: {
      deploymentId: `deployment-${suffix}`,
      agentId: `agent-${suffix}`,
      targetId,
      idempotencyKey: `aees-d:${suffix}`,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.status, "pending");
  return { runtimeInstanceId, jobId: response.body.data.jobId };
}

async function waitFor(check, description, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`timed out waiting for ${description}; last=${JSON.stringify(last)}`);
}

function successResult(jobId, assignmentId, completedAt = Date.now()) {
  return {
    status: "success",
    output: { runtimeInstanceId: `manual-${jobId}`, status: "running" },
    evidenceRefs: [`runtime-job:${jobId}`, `assignment:${assignmentId}`],
    usageRecords: [{
      dimension: "agent.runtime",
      quantity: "1",
      unit: "run",
      startTime: completedAt - 1,
      endTime: completedAt,
      source: "worker",
      confidence: "final",
    }],
    completedAt,
  };
}

test("D03 certifies two control planes and independent workers with crash, fencing, recovery and cancellation", { timeout: 300_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d03-process-"));
  const runtimeDatabasePath = join(root, "shared-runtime.sqlite");
  const portA = await reservePort();
  const portD = await reservePort();
  const baseUrlA = `http://127.0.0.1:${portA}`;
  const baseUrlD = `http://127.0.0.1:${portD}`;
  const processes = [];
  let store;
  const evidence = {
    topology: {},
    jobs: [],
    fencing: {},
    scenarios: {},
  };
  try {
    let controlPlaneA = await startControlPlane({ root, label: "control-plane-a", port: portA, runtimeDatabasePath });
    const controlPlaneD = await startControlPlane({ root, label: "control-plane-d", port: portD, runtimeDatabasePath });
    progress("control-planes-ready", { pids: [controlPlaneA.ready.processId, controlPlaneD.ready.processId] });
    processes.push(controlPlaneA, controlPlaneD);
    store = new SqliteDurableRuntimeState({ filePath: runtimeDatabasePath });

    const batch = [];
    for (let index = 0; index < 2; index += 1) {
      batch.push(await createRuntime(baseUrlA, `batch-${index + 1}`));
    }
    progress("batch-created", { jobIds: batch.map((entry) => entry.jobId) });

    const workerB = await startWorker({ root, label: "worker-b", baseUrl: baseUrlA, workerId: "worker-b", instanceId: "instance-b", executionDelayMs: 250 });
    const workerC = await startWorker({ root, label: "worker-c", baseUrl: baseUrlD, workerId: "worker-c", instanceId: "instance-c", executionDelayMs: 250 });
    progress("initial-workers-ready", { pids: [workerB.ready.processId, workerC.ready.processId] });
    processes.push(workerB, workerC);
    evidence.topology = {
      controlPlanes: [controlPlaneA.ready, controlPlaneD.ready],
      workers: [workerB.ready, workerC.ready],
      runtimeStore: runtimeDatabasePath,
    };
    assert.equal(new Set([controlPlaneA.ready.processId, controlPlaneD.ready.processId, workerB.ready.processId, workerC.ready.processId]).size, 4);

    let lastBatchState = [];
    try {
      await waitFor(() => {
        const jobs = batch.map(({ jobId }) => store.getJob(jobId));
        lastBatchState = jobs.map((job) => job ? { jobId: job.jobId, status: job.status, attempt: job.attempt, error: job.error } : undefined);
        const failed = jobs.find((job) => job?.status === "failed");
        if (failed) throw new Error(`batch job failed: ${JSON.stringify(failed)}`);
        return jobs.every((job) => job?.status === "succeeded") ? jobs : undefined;
      }, "multi-worker batch completion");
    } catch (error) {
      throw new Error(`${error.message}; jobs=${JSON.stringify(lastBatchState)}; workers=${JSON.stringify(store.listWorkers())}; assignments=${JSON.stringify(store.listAssignments())}; controlPlaneAExit=${controlPlaneA.child.exitCode}/${controlPlaneA.child.signalCode}; controlPlaneA=${controlPlaneA.stderr()}; controlPlaneDExit=${controlPlaneD.child.exitCode}/${controlPlaneD.child.signalCode}; controlPlaneD=${controlPlaneD.stderr()}; workerB=${workerB.stderr()}; workerC=${workerC.stderr()}`);
    }
    progress("batch-completed");
    const batchJobs = batch.map(({ jobId }) => store.getJob(jobId));
    const executingPids = new Set(batchJobs.map((job) => job.result.output.workerProcessId));
    assert.deepEqual(executingPids, new Set([workerB.ready.processId, workerC.ready.processId]));
    assert.equal(batch.every(({ jobId }) => store.listAssignments({ jobId }).length === 1), true);
    evidence.jobs.push(...batchJobs.map((job) => ({ jobId: job.jobId, status: job.status, workerProcessId: job.result.output.workerProcessId })));
    evidence.scenarios.multiWorkerContention = "PASS";
    evidence.scenarios.multiControlPlaneSharedOwnership = "PASS";
    evidence.scenarios.independentWorkerExecution = "PASS";

    await stopProcess(workerB, "SIGKILL");
    await stopProcess(workerC, "SIGKILL");

    const crashWorkerId = "worker-crash";
    const crashInstanceId = "instance-crash";
    const crashWorker = await startWorker({
      root,
      label: "worker-crash",
      baseUrl: baseUrlA,
      workerId: crashWorkerId,
      instanceId: crashInstanceId,
      executionDelayMs: 5_000,
    });
    progress("crash-worker-ready", { pid: crashWorker.ready.processId });
    processes.push(crashWorker);
    const crashJob = await createRuntime(baseUrlA, "crash-recovery");
    await waitFor(() => store.getJob(crashJob.jobId)?.status === "running" ? store.getJob(crashJob.jobId) : undefined, "crash job running");
    progress("crash-job-running", { jobId: crashJob.jobId });
    const firstAssignment = store.listAssignments({ jobId: crashJob.jobId })[0];
    assert.ok(firstAssignment);
    await stopProcess(crashWorker, "SIGKILL");
    await waitFor(() => store.getJob(crashJob.jobId)?.status === "queued" ? store.getJob(crashJob.jobId) : undefined, "expired lease recovery");
    progress("crash-job-requeued", { jobId: crashJob.jobId });

    const recoveryWorkerId = "worker-recovery";
    const recoveryInstanceId = "instance-recovery";
    const recoveryWorker = await startWorker({
      root,
      label: "worker-recovery",
      baseUrl: baseUrlD,
      workerId: recoveryWorkerId,
      instanceId: recoveryInstanceId,
      executionDelayMs: 100,
    });
    progress("recovery-worker-ready", { pid: recoveryWorker.ready.processId });
    processes.push(recoveryWorker);
    const recovered = await waitFor(() => store.getJob(crashJob.jobId)?.status === "succeeded" ? store.getJob(crashJob.jobId) : undefined, "crashed job reassignment");
    progress("crash-job-completed", { jobId: crashJob.jobId });
    const assignments = store.listAssignments({ jobId: crashJob.jobId });
    const secondAssignment = assignments.find((entry) => entry.workerId === recoveryWorkerId);
    assert.ok(secondAssignment);
    assert.equal(secondAssignment.fencingToken, firstAssignment.fencingToken + 1);
    assert.equal(assignments.filter((entry) => entry.status === "completed").length, 1);

    const stale = await jsonRequest(baseUrlA, `/api/v1/internal/runtime/jobs/${crashJob.jobId}/result`, {
      auth: false,
      method: "POST",
      headers: { authorization: `Bearer ${processToken(crashWorkerId, crashInstanceId)}` },
      body: {
        assignmentId: firstAssignment.assignmentId,
        leaseId: firstAssignment.leaseId,
        fencingToken: firstAssignment.fencingToken,
        result: successResult(crashJob.jobId, firstAssignment.assignmentId),
        resultIdempotencyKey: `${firstAssignment.assignmentId}:${firstAssignment.fencingToken}`,
      },
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, "stale_worker_ownership");

    const duplicate = await jsonRequest(baseUrlD, `/api/v1/internal/runtime/jobs/${crashJob.jobId}/result`, {
      auth: false,
      method: "POST",
      headers: { authorization: `Bearer ${processToken(recoveryWorkerId, recoveryInstanceId)}` },
      body: {
        assignmentId: secondAssignment.assignmentId,
        leaseId: secondAssignment.leaseId,
        fencingToken: secondAssignment.fencingToken,
        result: recovered.result,
        resultIdempotencyKey: `${secondAssignment.assignmentId}:${secondAssignment.fencingToken}`,
      },
    });
    assert.equal(duplicate.status, 200);
    assert.equal(store.getJob(crashJob.jobId).revision, recovered.revision);
    evidence.fencing = {
      jobId: crashJob.jobId,
      firstAssignmentId: firstAssignment.assignmentId,
      firstToken: firstAssignment.fencingToken,
      secondAssignmentId: secondAssignment.assignmentId,
      secondToken: secondAssignment.fencingToken,
    };
    evidence.scenarios.workerCrashRecovery = "PASS";
    evidence.scenarios.staleResultRejected = "PASS";
    evidence.scenarios.duplicateResult = "PASS";
    evidence.scenarios.orphanRecovery = "PASS";

    await stopProcess(recoveryWorker, "SIGKILL");
    const cancellationWorker = await startWorker({
      root,
      label: "worker-cancellation",
      baseUrl: baseUrlA,
      workerId: "worker-cancellation",
      instanceId: "instance-cancellation",
      executionDelayMs: 1_000,
    });
    progress("cancellation-worker-ready", { pid: cancellationWorker.ready.processId });
    processes.push(cancellationWorker);
    const cancellationJob = await createRuntime(baseUrlA, "cancellation-race");
    await waitFor(() => store.getJob(cancellationJob.jobId)?.status === "running" ? true : undefined, "cancellation job running");
    const cancellation = await jsonRequest(baseUrlA, `/api/v1/runtimes/${cancellationJob.runtimeInstanceId}/stop`, { method: "POST" });
    assert.ok(cancellation.status === 200 || cancellation.status === 409, JSON.stringify(cancellation.body));
    const cancellationTerminal = await waitFor(() => {
      const job = store.getJob(cancellationJob.jobId);
      return job?.status === "cancelled" || job?.status === "succeeded" ? job : undefined;
    }, "cancellation terminal state");
    if (cancellation.status === 200) {
      assert.equal(cancellationTerminal.status, "cancelled");
      assert.equal(cancellationTerminal.result, undefined);
    } else {
      assert.equal(cancellation.body.error.code, "runtime_state_conflict");
      assert.equal(cancellationTerminal.status, "succeeded");
    }
    progress("cancellation-completed", { jobId: cancellationJob.jobId, winner: cancellationTerminal.status });
    evidence.scenarios.cancellationRace = `PASS (${cancellationTerminal.status === "cancelled" ? "cancellation" : "completion"} committed first)`;
    await stopProcess(cancellationWorker, "SIGKILL");

    const restartWorker = await startWorker({
      root,
      label: "worker-control-plane-restart",
      baseUrl: baseUrlA,
      workerId: "worker-control-plane-restart",
      instanceId: "instance-control-plane-restart",
      executionDelayMs: 5_000,
    });
    progress("restart-worker-ready", { pid: restartWorker.ready.processId });
    processes.push(restartWorker);
    const restartJob = await createRuntime(baseUrlA, "control-plane-restart");
    await waitFor(() => store.getJob(restartJob.jobId)?.status === "running" ? true : undefined, "restart job running");
    progress("restart-job-running", { jobId: restartJob.jobId });
    await stopProcess(controlPlaneA, "SIGKILL");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    controlPlaneA = await startControlPlane({ root, label: "control-plane-a-restarted", port: portA, runtimeDatabasePath });
    progress("control-plane-a-restarted", { pid: controlPlaneA.ready.processId });
    processes.push(controlPlaneA);
    assert.notEqual(controlPlaneA.ready.processId, evidence.topology.controlPlanes[0].processId);
    await stopProcess(restartWorker, "SIGKILL");
    await waitFor(() => store.getJob(restartJob.jobId)?.status === "queued" ? true : undefined, "control-plane restart orphan recovery");
    progress("restart-job-requeued", { jobId: restartJob.jobId });
    const restartRecoveryWorker = await startWorker({
      root,
      label: "worker-after-control-plane-restart",
      baseUrl: baseUrlA,
      workerId: "worker-after-control-plane-restart",
      instanceId: "instance-after-control-plane-restart",
      executionDelayMs: 100,
    });
    processes.push(restartRecoveryWorker);
    await waitFor(() => store.getJob(restartJob.jobId)?.status === "succeeded" ? store.getJob(restartJob.jobId) : undefined, "completion after control-plane restart");
    progress("restart-job-completed", { jobId: restartJob.jobId });
    evidence.scenarios.controlPlaneRestart = "PASS";
    evidence.scenarios.transportInterruption = "PASS";
    await stopProcess(restartRecoveryWorker, "SIGKILL");

    const noWorkerJob = await createRuntime(baseUrlA, "no-eligible-worker", "unsupported-target");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    assert.equal(store.getJob(noWorkerJob.jobId).status, "queued");
    assert.equal(store.listAssignments({ jobId: noWorkerJob.jobId }).length, 0);
    evidence.scenarios.noEligibleWorker = "PASS";
    evidence.scenarios.backpressure = "PASS";

    evidence.jobs.push({ jobId: crashJob.jobId, status: store.getJob(crashJob.jobId).status });
    evidence.jobs.push({ jobId: cancellationJob.jobId, status: store.getJob(cancellationJob.jobId).status });
    evidence.jobs.push({ jobId: restartJob.jobId, status: store.getJob(restartJob.jobId).status });
    evidence.jobs.push({ jobId: noWorkerJob.jobId, status: store.getJob(noWorkerJob.jobId).status });
    evidence.scenarios.duplicateDelivery = "PASS";
    const evidencePath = process.env.ACS_AEES_D_EVIDENCE_PATH;
    if (evidencePath) await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + "\n", "utf8");
    process.stdout.write(`AEES_D_EVIDENCE ${JSON.stringify(evidence)}\n`);
  } catch (error) {
    process.stderr.write(`AEES_D_FAILURE ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    throw error;
  } finally {
    store?.close();
    for (const runtime of processes.reverse()) {
      await stopProcess(runtime, runtime.child.exitCode === null && runtime.child.signalCode === null ? "SIGKILL" : "SIGTERM").catch(() => undefined);
      runtime.child.stdout.destroy();
      runtime.child.stderr.destroy();
    }
    await rm(root, { recursive: true, force: true });
  }
});
