import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const distUrl = new URL(`file://${distRoot}/index.js`).href;
const controlPlaneEntrypoint = join(distRoot, "workers", "runtime-control-plane-entrypoint.js");
const workerEntrypoint = join(distRoot, "workers", "remote-worker-entrypoint.js");
const receiverEntrypoint = join(distRoot, "control-plane", "operational-telemetry-receiver-entrypoint.js");
const failureWorkerEntrypoint = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/aees-e-failure-worker-process.mjs");
const dependencyOutageEntrypoint = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/aees-e-dependency-outage-process.mjs");
const signingKey = "aees-e-process-worker-service-key-with-at-least-thirty-two-bytes";
const issuer = "https://identity.test/aees-e-worker";
const audience = "acs-runtime-worker";
const actorHeaders = { "x-acs-actor-id": "system", "x-acs-actor-type": "system" };
const evidencePath = process.env.ACS_AEES_E_EVIDENCE_PATH ?? "/tmp/acs-epic15-5-aees-e-evidence/manifest.json";
const progressPath = process.env.ACS_AEES_E_PROGRESS_PATH ?? "/tmp/acs-epic15-5-aees-e-evidence/progress.jsonl";
const { issueSignedWorkerToken } = await import(distUrl);

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

function token(workerId, instanceId) {
  return issueSignedWorkerToken({ issuer, audience, signingKey, workerId, instanceId, capabilities: ["engine:openclaw", "isolation:sandbox", "deployment:sandbox", "target:local-wsl"], expiresAt: Date.now() + 10 * 60_000 });
}

async function startJsonProcess(entrypoint, environment, expectedService, timeoutMs = 45_000) {
  const child = spawn(process.execPath, [entrypoint], { cwd: process.cwd(), env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const ready = await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out starting ${expectedService}; stdout=${stdout}; stderr=${stderr}`)), timeoutMs);
    const inspect = () => {
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) continue;
        try {
          const value = JSON.parse(line);
          if (value.service === expectedService && value.success === true) { clearTimeout(timeout); resolveReady(value); return; }
        } catch { /* wait for complete line */ }
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", (code, signal) => { clearTimeout(timeout); reject(new Error(`${expectedService} exited before ready: ${code}/${signal}; stderr=${stderr}`)); });
    inspect();
  });
  return { child, ready, stdout: () => stdout, stderr: () => stderr };
}

async function stopProcess(runtime, signal = "SIGTERM") {
  if (!runtime?.child || runtime.child.exitCode !== null || runtime.child.signalCode !== null) return;
  runtime.child.kill(signal);
  await new Promise((resolveExit) => {
    const timeout = setTimeout(() => { runtime.child.kill("SIGKILL"); resolveExit(); }, 5_000);
    runtime.child.once("exit", () => { clearTimeout(timeout); resolveExit(); });
  });
}

async function request(baseUrl, path, options = {}) {
  const method = options.method ?? "GET";
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(baseUrl + path, {
        method,
        headers: { ...(options.auth === false ? {} : actorHeaders), ...(options.headers ?? {}), ...(options.body ? { "content-type": "application/json" } : {}) },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      return { status: response.status, body: response.status === 204 ? undefined : await response.json(), headers: response.headers };
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
  }
  throw new Error(`${method} ${path} failed after transport retries`, { cause: lastError });
}

async function waitFor(check, description, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`timed out waiting for ${description}; last=${JSON.stringify(last)}`);
}

async function startReceiver(port) {
  return startJsonProcess(receiverEntrypoint, { ACS_TELEMETRY_RECEIVER_HOST: "127.0.0.1", ACS_TELEMETRY_RECEIVER_PORT: String(port) }, "acs-operational-telemetry-receiver");
}

async function startDependencyOutageProcess(root, port, receiverPort) {
  return startJsonProcess(dependencyOutageEntrypoint, {
    ACS_TEST_DIST_URL: distUrl,
    ACS_HTTP_HOST: "127.0.0.1",
    ACS_HTTP_PORT: String(port),
    ACS_RUNTIME_ROOT: join(root, "dependency-outage"),
    ACS_TELEMETRY_MODE: "otlp-http",
    ACS_OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${receiverPort}`,
    ACS_OTEL_SERVICE_NAME: "acs-dependency-outage",
    ACS_TELEMETRY_EXPORT_INTERVAL_MS: "100",
    ACS_OTEL_EXPORT_TIMEOUT_MS: "250",
  }, "acs-aees-e-dependency-outage");
}

async function startControlPlane(root, port, receiverPort, runtimeDatabasePath, label) {
  const runtimeRoot = join(root, label);
  return startJsonProcess(controlPlaneEntrypoint, {
    ACS_ROOT: process.cwd(), ACS_HTTP_HOST: "127.0.0.1", ACS_HTTP_PORT: String(port),
    ACS_DISPATCH_MODE: "remote", ACS_RUNTIME_DATABASE_PATH: runtimeDatabasePath,
    ACS_WORKER_IDENTITY_MODE: "signed_jwt", ACS_WORKER_TOKEN_ISSUER: issuer, ACS_WORKER_TOKEN_AUDIENCE: audience, ACS_WORKER_TOKEN_SIGNING_KEY: signingKey,
    ACS_WORKER_LEASE_TTL_MS: "30000", ACS_WORKER_STALE_AFTER_MS: "60000", ACS_RUNTIME_RECOVERY_SCAN_INTERVAL_MS: "500",
    ACS_RUNTIME_ROOT: runtimeRoot, ACS_STATE_ROOT: join(runtimeRoot, "state"), ACS_CONFIG_ROOT: join(runtimeRoot, "config"), ACS_ARTIFACTS_ROOT: join(runtimeRoot, "artifacts"), ACS_WORKSPACE_ROOT: join(runtimeRoot, "workspace"),
    ACS_TELEMETRY_MODE: "otlp-http", ACS_OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${receiverPort}`, ACS_OTEL_SERVICE_NAME: "acs-control-plane", ACS_TELEMETRY_EXPORT_INTERVAL_MS: "100", ACS_OTEL_EXPORT_TIMEOUT_MS: "250", ACS_TELEMETRY_QUEUE_CAPACITY: "128",
  }, "acs-runtime-control-plane");
}

async function startWorker(root, baseUrl, receiverPort, workerId, instanceId, executionDelayMs = 100, failure = false) {
  const runtimeRoot = join(root, workerId);
  const stateRoot = join(runtimeRoot, "state");
  const configRoot = join(runtimeRoot, "config");
  await Promise.all([stateRoot, configRoot, join(runtimeRoot, "artifacts"), join(runtimeRoot, "workspace")].map((path) => mkdir(path, { recursive: true })));
  await writeFile(join(configRoot, "openclaw.json"), "{}\n", "utf8");
  const environment = {
    ACS_TEST_DIST_URL: distUrl, ACS_CONTROL_PLANE_URL: baseUrl, ACS_WORKER_TOKEN: token(workerId, instanceId), ACS_WORKER_ID: workerId, ACS_WORKER_INSTANCE_ID: instanceId,
    ACS_WORKER_NAME: workerId, ACS_WORKER_VERSION: "1.0.0-aees-e", ACS_WORKER_TARGET_ID: "local-wsl", ACS_WORKER_HEARTBEAT_INTERVAL_MS: "2000", ACS_WORKER_POLL_INTERVAL_MS: "1000", ACS_WORKER_LEASE_RENEW_INTERVAL_MS: "3000", ACS_WORKER_EXECUTION_DELAY_MS: String(executionDelayMs), ACS_WORKER_REQUEST_TIMEOUT_MS: "30000",
    ACS_ROOT: process.cwd(), ACS_RUNTIME_ROOT: runtimeRoot, ACS_STATE_ROOT: stateRoot, ACS_CONFIG_ROOT: configRoot, ACS_ARTIFACTS_ROOT: join(runtimeRoot, "artifacts"), ACS_WORKSPACE_ROOT: join(runtimeRoot, "workspace"),
    ACS_TELEMETRY_MODE: "otlp-http", ACS_OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${receiverPort}`, ACS_OTEL_SERVICE_NAME: failure ? "acs-failure-worker" : "acs-remote-worker", ACS_TELEMETRY_EXPORT_INTERVAL_MS: "100", ACS_OTEL_EXPORT_TIMEOUT_MS: "250",
  };
  return startJsonProcess(failure ? failureWorkerEntrypoint : workerEntrypoint, environment, failure ? "acs-aees-e-failure-worker" : "acs-remote-worker", 60_000);
}

async function createJob(baseUrl, suffix, targetId = "local-wsl", maxAttempts = 3) {
  const response = await request(baseUrl, `/api/v1/runtimes/runtime-${suffix}/start`, { method: "POST", headers: { traceparent: "00-11111111111111111111111111111111-2222222222222222-01" }, body: { deploymentId: `deployment-${suffix}`, agentId: `agent-${suffix}`, targetId, maxAttempts, idempotencyKey: `aees-e:${suffix}` } });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return { jobId: response.body.data.jobId, requestId: response.headers.get("x-request-id"), traceparent: response.headers.get("traceparent") };
}

async function diagnostic(baseUrl, jobId) {
  const response = await request(baseUrl, `/api/v1/runtime/jobs/${jobId}/diagnostics`);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.data;
}

function successResult(jobId, assignmentId) {
  const completedAt = Date.now();
  return { status: "success", output: { runtimeInstanceId: `stale-${jobId}`, status: "running" }, evidenceRefs: [`runtime-job:${jobId}`, `assignment:${assignmentId}`], usageRecords: [{ dimension: "agent.runtime", quantity: "1", unit: "run", startTime: completedAt - 1, endTime: completedAt, source: "worker", confidence: "final" }], completedAt };
}

test("E03 certifies external telemetry and operator-only incident diagnosis across independent processes", { timeout: 420_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-e03-"));
  const runtimeDatabasePath = join(root, "runtime.sqlite");
  const receiverPort = await reservePort();
  const controlPort = await reservePort();
  const baseUrl = `http://127.0.0.1:${controlPort}`;
  const receiverUrl = `http://127.0.0.1:${receiverPort}`;
  const processes = [];
  const progress = (stage, details = {}) => appendFile(progressPath, JSON.stringify({ stage, at: Date.now(), ...details }) + "\n", "utf8");
  const evidence = { topology: {}, scenarios: {}, correlation: {}, diagnostics: {}, telemetry: {}, classification: "EXTERNAL_PROCESS_PROVEN / MULTI_HOST_NOT_PROVEN" };
  try {
    await mkdir(dirname(progressPath), { recursive: true });
    await writeFile(progressPath, "", { encoding: "utf8", mode: 0o600 });
    let receiver = await startReceiver(receiverPort); processes.push(receiver);
    await progress("receiver-ready", receiver.ready);
    let controlPlane = await startControlPlane(root, controlPort, receiverPort, runtimeDatabasePath, "control-plane-a"); processes.push(controlPlane);
    await progress("control-plane-ready", controlPlane.ready);
    const workerB = await startWorker(root, baseUrl, receiverPort, "worker-b", "instance-b", 120_000); processes.push(workerB);
    await progress("worker-b-ready", workerB.ready);
    evidence.topology = { controlPlanePid: controlPlane.ready.processId, receiverPid: receiver.ready.processId, workerPids: [workerB.ready.processId], runtimeStore: "shared SQLite durable runtime", receiver: "OTLP HTTP external process" };

    const crashJob = await createJob(baseUrl, "worker-crash");
    const running = await waitFor(async () => { const value = await diagnostic(baseUrl, crashJob.jobId); return value.status === "running" ? value : undefined; }, "crash job running");
    await progress("crash-job-running", { jobId: crashJob.jobId });
    const original = { assignmentId: running.assignmentId, leaseId: running.leaseId, leaseExpiresAt: running.leaseExpiresAt, fencingToken: running.fencingToken };
    await stopProcess(workerB, "SIGKILL");
    await progress("worker-b-killed");
    await waitFor(async () => { const value = await diagnostic(baseUrl, crashJob.jobId); return value.status === "queued" ? value : undefined; }, "worker crash recovery");
    const workerC = await startWorker(root, baseUrl, receiverPort, "worker-c", "instance-c", 100); processes.push(workerC);
    evidence.topology.workerPids.push(workerC.ready.processId);
    const recovered = await waitFor(async () => { const value = await diagnostic(baseUrl, crashJob.jobId); return value.status === "succeeded" ? value : undefined; }, "recovered completion");
    assert.notEqual(recovered.assignmentId, original.assignmentId);
    const stale = await request(baseUrl, `/api/v1/internal/runtime/jobs/${crashJob.jobId}/result`, { auth: false, method: "POST", headers: { authorization: `Bearer ${token("worker-b", "instance-b")}` }, body: { assignmentId: original.assignmentId, leaseId: original.leaseId, fencingToken: original.fencingToken, result: successResult(crashJob.jobId, original.assignmentId), resultIdempotencyKey: `${original.assignmentId}:${original.fencingToken}` } });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, "stale_worker_ownership");
    evidence.scenarios.workerCrash = "PASS";
    evidence.scenarios.staleResult = "PASS";

    const noWorker = await createJob(baseUrl, "no-worker", "unsupported-target");
    const noWorkerDiagnostic = await waitFor(async () => { const value = await diagnostic(baseUrl, noWorker.jobId); return value.reasonCode === "NO_ELIGIBLE_WORKERS" ? value : undefined; }, "no eligible worker diagnostic");
    evidence.scenarios.noEligibleWorker = "PASS";
    evidence.diagnostics.noEligibleWorker = { jobId: noWorker.jobId, reasonCode: noWorkerDiagnostic.reasonCode, recommendedAction: noWorkerDiagnostic.recommendedAction };

    await stopProcess(workerC, "SIGKILL");
    const failureWorker = await startWorker(root, baseUrl, receiverPort, "worker-failure", "instance-failure", 0, true); processes.push(failureWorker);
    const failedJob = await createJob(baseUrl, "max-attempts", "local-wsl", 2);
    const failed = await waitFor(async () => { const value = await diagnostic(baseUrl, failedJob.jobId); return value.status === "failed" ? value : undefined; }, "max attempts exhausted");
    assert.equal(failed.attempt, failed.maxAttempts);
    assert.equal(failed.reasonCode, "MAX_ATTEMPTS_EXHAUSTED");
    evidence.scenarios.failedRetry = "PASS";
    evidence.scenarios.maxAttempts = "PASS";
    evidence.diagnostics.failedJob = { jobId: failed.jobId, failureCode: failed.failureCode, attempts: failed.attempt, reasonCode: failed.reasonCode };
    await stopProcess(failureWorker, "SIGKILL");

    const restartWorker = await startWorker(root, baseUrl, receiverPort, "worker-restart", "instance-restart", 120_000); processes.push(restartWorker);
    const restartJob = await createJob(baseUrl, "control-plane-restart");
    await waitFor(async () => (await diagnostic(baseUrl, restartJob.jobId)).status === "running", "restart job running");
    const oldControlPlanePid = controlPlane.ready.processId;
    await stopProcess(controlPlane, "SIGKILL");
    await progress("control-plane-killed", { processId: oldControlPlanePid, jobId: restartJob.jobId });
    controlPlane = await startControlPlane(root, controlPort, receiverPort, runtimeDatabasePath, "control-plane-b"); processes.push(controlPlane);
    assert.notEqual(controlPlane.ready.processId, oldControlPlanePid);
    await progress("control-plane-restarted", { processId: controlPlane.ready.processId, jobId: restartJob.jobId });
    await stopProcess(restartWorker, "SIGKILL");
    await waitFor(async () => { const value = await diagnostic(baseUrl, restartJob.jobId); return value.status === "queued" ? value : undefined; }, "orphan recovery after control-plane restart", 90_000);
    const restartRecoveryWorker = await startWorker(root, baseUrl, receiverPort, "worker-after-restart", "instance-after-restart", 100); processes.push(restartRecoveryWorker);
    evidence.topology.workerPids.push(restartRecoveryWorker.ready.processId);
    const afterRestart = await waitFor(async () => { const value = await diagnostic(baseUrl, restartJob.jobId); return value.status === "succeeded" ? value : undefined; }, "completion after control-plane restart recovery", 90_000);
    evidence.scenarios.controlPlaneRestart = "PASS";
    evidence.diagnostics.controlPlaneRestart = { jobId: afterRestart.jobId, status: afterRestart.status, oldProcessId: oldControlPlanePid, newProcessId: controlPlane.ready.processId };
    await stopProcess(restartRecoveryWorker, "SIGKILL");

    await waitFor(async () => { const snapshot = await request(receiverUrl, "/snapshot", { auth: false }); return snapshot.body.logs.length && snapshot.body.metrics.length && snapshot.body.traces.length ? snapshot.body : undefined; }, "exported logs metrics and traces");
    const beforeOutage = await request(receiverUrl, "/snapshot", { auth: false });
    const serialized = JSON.stringify(beforeOutage.body);
    assert.equal(serialized.includes(crashJob.jobId), true);
    assert.equal(serialized.includes("runtime.stale_result.rejected"), true);
    assert.equal(serialized.includes("acs.runtime.lease_expirations"), true);
    assert.equal(serialized.includes("Bearer "), false);
    assert.equal(/Authorization|Vault token|PRIVATE KEY|secret plaintext/i.test(serialized), false);
    const traceId = crashJob.traceparent.split("-")[1];
    const exportedTraceId = Buffer.from(traceId, "hex").toString("base64");
    assert.equal(serialized.includes(exportedTraceId), true);
    evidence.correlation = { requestId: crashJob.requestId, traceId, jobId: crashJob.jobId, assignmentId: recovered.assignmentId, workerId: recovered.workerId };
    evidence.telemetry = { logBatches: beforeOutage.body.logs.length, metricBatches: beforeOutage.body.metrics.length, traceBatches: beforeOutage.body.traces.length, sensitiveMatches: 0 };

    await stopProcess(receiver, "SIGKILL");
    await request(baseUrl, "/api/v1/health", { auth: false });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    const degraded = await request(baseUrl, "/api/v1/system/operational-status?force=true");
    assert.equal(degraded.body.data.dependencies.some((entry) => entry.reasonCode === "TELEMETRY_EXPORTER_DEGRADED"), true);
    receiver = await startReceiver(receiverPort); processes.push(receiver);
    await request(baseUrl, "/api/v1/health", { auth: false });
    const restored = await waitFor(async () => { const result = await request(baseUrl, "/api/v1/system/operational-status?force=true"); return result.body.data.telemetry.reachable ? result : undefined; }, "telemetry exporter recovery");
    assert.equal(restored.body.data.telemetry.external, true);
    evidence.scenarios.exporterOutage = "PASS";
    evidence.scenarios.exporterRecovery = "PASS";

    const outagePort = await reservePort();
    const outageBaseUrl = `http://127.0.0.1:${outagePort}`;
    const dependencyOutage = await startDependencyOutageProcess(root, outagePort, receiverPort); processes.push(dependencyOutage);
    evidence.topology.dependencyOutagePid = dependencyOutage.ready.processId;
    const outageStatus = await request(outageBaseUrl, "/api/v1/system/operational-status?force=true");
    const outageReasons = outageStatus.body.data.dependencies.flatMap((entry) => entry.reasonCode ? [entry.reasonCode] : []);
    assert.equal(outageReasons.includes("SECRET_PROVIDER_UNREACHABLE"), true);
    assert.equal(outageReasons.includes("RATE_LIMITER_UNAVAILABLE"), true);
    const exportedOutages = await waitFor(async () => {
      const snapshot = await request(receiverUrl, "/snapshot", { auth: false });
      const body = JSON.stringify(snapshot.body);
      return body.includes("SECRET_PROVIDER_UNREACHABLE") && body.includes("RATE_LIMITER_UNAVAILABLE") ? snapshot.body : undefined;
    }, "externally exported dependency outage reasons");
    assert.equal(JSON.stringify(exportedOutages).includes("Bearer "), false);
    evidence.scenarios.vaultOutage = "PASS";
    evidence.scenarios.rateLimiterOutage = "PASS";
    evidence.diagnostics.dependencyOutages = { reasonCodes: ["SECRET_PROVIDER_UNREACHABLE", "RATE_LIMITER_UNAVAILABLE"], externalTelemetry: true };
    evidence.telemetry.dependencyReasonCodesExported = true;
    evidence.scenarios.diagnosticsWithoutShell = "PASS";

    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  } finally {
    if (process.env.ACS_DEBUG_ACCEPTANCE_KEEP !== "true") {
      for (const runtime of processes.reverse()) await stopProcess(runtime, "SIGKILL").catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  }
});
