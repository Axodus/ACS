import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  FetchRemoteWorkerTransport,
  RemoteExecutionWorker,
  SignedWorkerIdentityValidator,
  WorkerIdentityConfigurationError,
  createAcsHttpServer,
  issueSignedWorkerToken,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const signingKey = "aees-d-worker-service-key-with-at-least-thirty-two-bytes";
const issuer = "https://identity.test/worker";
const audience = "acs-runtime-worker";

function createEngine() {
  const runtimes = new Map();
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: ["runtime.start"] }; },
    async version() { return { identity: this.identity, sourceRevision: "test-rev", supportedProtocols: ["acs-engine/1"] }; },
    async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: ["runtime.start"], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
    async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
    async inspectExecutionTarget(targetId) {
      return {
        id: targetId,
        type: "local-wsl",
        environment: "sandbox",
        engineId: "openclaw",
        status: "ready",
        health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] },
        capabilities: ["runtime.start"],
        deploymentModes: ["sandbox"],
        schedulingEligible: true,
        schedulingReasons: [],
        supportedRunners: ["opencode"],
        supportedProviders: ["axodus-managed"],
        isolationModes: ["sandbox"],
      };
    },
    async deployAgent() { throw new Error("not used"); },
    async startRuntime(request) {
      const runtimeInstanceId = `engine-runtime-${process.pid}-${Date.now()}`;
      const runtime = { runtimeInstanceId, deploymentId: request.deploymentId, agentId: request.agentId, status: "running", startedAt: Date.now(), timestamp: Date.now() };
      runtimes.set(runtimeInstanceId, runtime);
      return runtime;
    },
    async inspectRuntime(runtimeInstanceId) { return runtimes.get(runtimeInstanceId); },
    async close() {},
  };
}

function token(workerId, instanceId, overrides = {}) {
  return issueSignedWorkerToken({
    issuer,
    audience,
    signingKey,
    workerId,
    instanceId,
    capabilities: ["engine:openclaw", "isolation:sandbox", "deployment:sandbox", "target:local-wsl"],
    expiresAt: Date.now() + 60_000,
    ...overrides,
  });
}

async function jsonRequest(baseUrl, path, options = {}) {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: { ...(options.headers ?? {}), ...(options.body ? { "content-type": "application/json" } : {}) },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
}

async function waitFor(check, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out waiting for remote runtime result");
}

test("D02 real HTTP service identity registers, heartbeats, claims and completes through a remote worker client", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d02-http-"));
  const validator = new SignedWorkerIdentityValidator({ issuer, audience, signingKey });
  const { server, context } = await createAcsHttpServer({
    engine: createEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    workerIdentityValidator: validator,
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    secretCatalogPath: join(root, "secrets.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
    runtimeLeaseTtlMs: 10_000,
    runtimeWorkerStaleAfterMs: 20_000,
  });
  let worker;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const forged = await jsonRequest(baseUrl, "/api/v1/internal/runtime/jobs/claim", {
      method: "POST",
      headers: { "x-acs-worker-id": "forged", "x-acs-worker-instance-id": "forged" },
      body: {},
    });
    assert.equal(forged.status, 401);

    const registration = {
      name: "negative worker",
      version: "1.0.0",
      targetId: "local-wsl",
      capabilities: {
        engineId: "openclaw",
        supportedRunners: ["opencode"],
        supportedProviders: ["axodus-managed"],
        supportedIsolationModes: ["sandbox"],
        supportedDeploymentModes: ["sandbox"],
        supportedTargetIds: ["local-wsl"],
        maxConcurrentRuns: 1,
      },
    };
    const capabilityEscalation = await jsonRequest(baseUrl, "/api/v1/internal/runtime/workers/register", {
      method: "POST",
      headers: { authorization: `Bearer ${token("worker-limited", "instance-limited", { capabilities: ["engine:openclaw"] })}` },
      body: registration,
    });
    assert.equal(capabilityEscalation.status, 403);

    const firstRegistration = await jsonRequest(baseUrl, "/api/v1/internal/runtime/workers/register", {
      method: "POST",
      headers: { authorization: `Bearer ${token("worker-reuse", "instance-one")}` },
      body: registration,
    });
    assert.equal(firstRegistration.status, 200);
    const identityReuse = await jsonRequest(baseUrl, "/api/v1/internal/runtime/workers/register", {
      method: "POST",
      headers: { authorization: `Bearer ${token("worker-reuse", "instance-two")}` },
      body: registration,
    });
    assert.equal(identityReuse.status, 409);

    const runtimeStart = await jsonRequest(baseUrl, "/api/v1/runtimes/runtime-d02/start", {
      method: "POST",
      headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system" },
      body: { deploymentId: "deployment-d02", agentId: "agent-d02", targetId: "local-wsl", idempotencyKey: "d02-start" },
    });
    assert.equal(runtimeStart.status, 200);
    assert.equal(runtimeStart.body.data.status, "pending");

    worker = new RemoteExecutionWorker({
      transport: new FetchRemoteWorkerTransport({ baseUrl, token: token("worker-d02", "instance-d02") }),
      engine: createEngine(),
      workerId: "worker-d02",
      instanceId: "instance-d02",
      workerName: "D02 worker",
      workerVersion: "1.0.0",
      targetId: "local-wsl",
      heartbeatIntervalMs: 100,
      pollIntervalMs: 20,
      leaseRenewIntervalMs: 100,
    });
    await worker.start();

    let job;
    try {
      job = await waitFor(async () => {
        const result = await jsonRequest(baseUrl, "/api/v1/runtime/jobs", {
          headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system" },
        });
        const current = result.body.data.find((entry) => entry.runtimeInstanceId === "runtime-d02");
        return current?.status === "succeeded" ? current : undefined;
      });
    } catch (error) {
      const state = context.runtimeCoordinator.listJobs().map((entry) => ({ jobId: entry.jobId, status: entry.status, error: entry.error }));
      throw new Error(`${error.message}; worker=${worker.lastError ?? "none"}; jobs=${JSON.stringify(state)}`);
    }
    assert.equal(job.result.output.workerId, "worker-d02");
    assert.equal(job.result.output.workerInstanceId, "instance-d02");
    assert.equal(typeof job.result.output.workerProcessId, "number");
    assert.equal("__resultIdempotencyKey" in job.result.output, false);
    assert.equal(context.runtimeCoordinator.listWorkers()[0].servicePrincipalId, "worker-d02");
    assert.equal(context.runtimeCoordinator.listAssignments({ jobId: job.jobId })[0].fencingToken, 1);
    assert.equal(context.runtimeCoordinator.getJob(job.jobId).tenantId, "tenant-dev");
  } finally {
    await worker?.stop();
    await new Promise((resolve) => server.close(resolve));
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D02 signed service identity rejects invalid signature, identity reuse and unpermitted capabilities", async () => {
  const validator = new SignedWorkerIdentityValidator({ issuer, audience, signingKey });
  await assert.rejects(
    () => validator.authenticate({ authorization: `Bearer ${token("worker-a", "instance-a")}.tampered` }),
  );
  const principal = await validator.authenticate({ authorization: `Bearer ${token("worker-a", "instance-a")}` });
  assert.equal(principal.workerId, "worker-a");
  assert.equal(principal.instanceId, "instance-a");
  assert.equal(principal.permittedCapabilities.includes("engine:openclaw"), true);
});

test("D02 production composition fails closed for local runtime", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-aees-d02-production-"));
  const productionIdentity = {
    descriptor: { mode: "oidc", provider: "test-oidc", productionOriented: true },
    async authenticate() { throw new Error("not used"); },
    async health() { return { configured: true, reachable: true, detail: "test" }; },
  };
  try {
    assert.throws(
      () => createControlPlaneContext({
        engine: createEngine(),
        adapterProfile: "production",
        runtimeMode: "local",
        startLocalWorker: false,
        allowedOrigins: ["https://control.example"],
        secretProvider: "vault",
        vaultTransport: { async request() { return { status: 200, body: { data: {} } }; } },
        secretCatalogPath: join(root, "secrets.sqlite"),
        economicStatePath: join(root, "economic.sqlite"),
        rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
        identityValidator: productionIdentity,
      }),
      WorkerIdentityConfigurationError,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
