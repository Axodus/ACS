import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
const { createAcsHttpServer, InMemoryTelemetryExporter, OperationalTelemetryProvider } = await import(
  process.env.ACS_TEST_DIST_URL ?? new URL("../dist/index.js", import.meta.url).href,
);

function createEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] }; },
    async version() { return { identity: this.identity, sourceRevision: "e02", supportedProtocols: ["acs-engine/1"] }; },
    async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
    async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
    async inspectExecutionTarget(targetId) { return { id: targetId, type: "local-wsl", environment: "sandbox", engineId: "openclaw", status: "ready", health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] }, capabilities: [], deploymentModes: ["sandbox"], schedulingEligible: true, schedulingReasons: [], supportedRunners: ["opencode"], supportedProviders: ["axodus-managed"], isolationModes: ["sandbox"] }; },
    async close() {},
  };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: { ...(options.platform === false ? {} : { "x-acs-actor-id": "system", "x-acs-actor-type": "system" }), ...(options.headers ?? {}) },
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test("E02 separates liveness from dependency-aware readiness and protects detailed diagnostics", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-e02-diagnostics-"));
  const telemetry = new OperationalTelemetryProvider({ exporter: new InMemoryTelemetryExporter(), serviceName: "acs-e02" });
  const { server, context } = await createAcsHttpServer({
    engine: createEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    secretCatalogPath: join(root, "secrets.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
    telemetry,
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const live = await request(baseUrl, "/api/v1/health", { platform: false });
    assert.equal(live.status, 200);
    assert.equal(live.body.data.status, "LIVE");
    assert.match(live.headers.get("x-request-id"), /^req_/);
    assert.match(live.headers.get("traceparent"), /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

    const ready = await request(baseUrl, "/api/v1/ready", { platform: false });
    assert.equal(ready.status, 503);
    assert.equal(ready.body.data.status, "BLOCKED");
    assert.equal(ready.body.data.reasonCodes.includes("NO_ELIGIBLE_WORKERS"), true);
    assert.equal("dependencies" in ready.body.data, false);

    const forbidden = await request(baseUrl, "/api/v1/system/operational-status", {
      platform: false,
      headers: { "x-acs-actor-id": "dev-operator", "x-acs-actor-type": "user" },
    });
    assert.equal(forbidden.status, 403);

    const status = await request(baseUrl, "/api/v1/system/operational-status?force=true");
    assert.equal(status.status, 200);
    assert.equal(status.body.data.overall, "BLOCKED");
    assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "NO_ELIGIBLE_WORKERS"), true);
    assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "TELEMETRY_EXPORTER_DEGRADED"), true);
    assert.equal(status.body.data.liveness.status, "LIVE");

    const job = context.runtimeCoordinator.createRuntimeStartJob({
      tenantId: "tenant-dev",
      runtimeInstanceId: "runtime-e02",
      deploymentId: "deployment-e02",
      targetId: "local-wsl",
      correlationId: "corr-e02",
    });
    const diagnostic = await request(baseUrl, `/api/v1/runtime/jobs/${job.jobId}/diagnostics`);
    assert.equal(diagnostic.status, 200);
    assert.equal(diagnostic.body.data.reasonCode, "NO_ELIGIBLE_WORKERS");
    assert.equal(diagnostic.body.data.correlationId, "corr-e02");
    assert.match(diagnostic.body.data.recommendedAction, /worker/i);

    const telemetryView = await request(baseUrl, "/api/v1/system/telemetry");
    assert.equal(telemetryView.status, 200);
    assert.equal(telemetryView.body.data.health.external, false);
    assert.equal(telemetryView.body.data.recentLogs.some((entry) => entry.event === "readiness.state_changed"), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("E02 tenant-scoped diagnostic lookup does not reveal another tenant job", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-e02-isolation-"));
  const { server, context } = await createAcsHttpServer({
    engine: createEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    secretCatalogPath: join(root, "secrets.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
  });
  try {
    const foreign = context.runtimeCoordinator.createRuntimeStartJob({ tenantId: "tenant-b", runtimeInstanceId: "runtime-b", deploymentId: "deployment-b", targetId: "local-wsl", correlationId: "corr-b" });
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    assert.equal(typeof address, "object");
    const result = await request(`http://127.0.0.1:${address.port}`, `/api/v1/runtime/jobs/${foreign.jobId}/diagnostics`);
    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "not_found");
    assert.equal(JSON.stringify(result.body).includes("tenant-b"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("E02 reports Vault and rate-limiter dependency outages with stable reason codes over HTTP", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-e02-outages-"));
  const unavailableSecretStore = {
    descriptor: { provider: "vault-kv-v2", productionOriented: true, materialStorage: "external_managed", metadataDurability: "single_node_durable", multiInstance: "external_provider_managed" },
    async health() { return { reachable: false, provider: "vault-kv-v2" }; },
    async put() { throw new Error("unavailable"); }, async get() { throw new Error("unavailable"); },
    async describe() { throw new Error("unavailable"); }, async rotate() { throw new Error("unavailable"); },
    async revoke() { throw new Error("unavailable"); }, async delete() { throw new Error("unavailable"); }, async exists() { return false; },
  };
  const unavailableRateLimiter = {
    descriptor: { adapter: "test-shared-rate-limit", productionOriented: true, durability: "single_node_durable", multiInstance: "shared_database" },
    async consume(input) { return { allowed: true, limit: input.policy.limit, remaining: input.policy.limit - 1, resetAt: new Date(Date.now() + 60_000).toISOString(), policy: input.policy.policyId, keyScope: input.policy.keyScope }; },
    async health() { return { configured: true, reachable: false, productionGrade: true, adapter: "test-shared-rate-limit" }; },
  };
  const { server, context } = await createAcsHttpServer({
    engine: createEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimiter: unavailableRateLimiter,
    secretStore: unavailableSecretStore,
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    assert.equal(typeof address, "object");
    const status = await request(`http://127.0.0.1:${address.port}`, "/api/v1/system/operational-status?force=true");
    assert.equal(status.status, 200);
    assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "SECRET_PROVIDER_UNREACHABLE"), true);
    assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "RATE_LIMITER_UNAVAILABLE"), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});
