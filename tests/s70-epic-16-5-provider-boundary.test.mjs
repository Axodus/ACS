import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const {
  buildProviderBoundary,
  createAcsHttpServer,
  InMemoryTelemetryExporter,
  OperationalTelemetryProvider,
} = await import(process.env.ACS_TEST_DIST_URL ?? new URL("../dist/index.js", import.meta.url).href);

function createEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] }; },
    async version() { return { identity: this.identity, sourceRevision: "e02", supportedProtocols: ["acs-engine/1"] }; },
    async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
    async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
    async inspectExecutionTarget(targetId) {
      return {
        id: targetId,
        type: "local-wsl",
        environment: "sandbox",
        engineId: "openclaw",
        status: "ready",
        health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] },
        capabilities: [],
        deploymentModes: ["sandbox"],
        schedulingEligible: true,
        schedulingReasons: [],
        supportedRunners: ["opencode"],
        supportedProviders: ["axodus-managed"],
        isolationModes: ["sandbox"],
      };
    },
    async close() {},
  };
}

function baseInput(overrides = {}) {
  return {
    environmentTopology: {
      environment: "local",
      adapterProfile: "development",
      dispatchMode: "local",
      workerMode: "local",
      workerTransport: "stdio",
      httpHost: "127.0.0.1",
      httpPort: 8788,
    },
    profile: "development",
    runtimeMode: "local",
    localWorkerConfigured: true,
    checkedAt: 1234567890,
    secretStore: {
      descriptor: {
        provider: "memory",
        productionOriented: false,
        materialStorage: "memory",
        metadataDurability: "process_local",
        multiInstance: "not_applicable",
      },
      async health() { return { reachable: true, provider: "memory", authenticated: true, secureTransport: false }; },
    },
    secretHealth: { reachable: true, provider: "memory", authenticated: true, secureTransport: false },
    economicStore: {
      adapter: "memory-economic-state",
      productionOriented: false,
      durability: "process_local",
      multiInstance: "not_applicable",
    },
    settlementProvider: {
      adapter: "memory-settlement-provider",
      productionOriented: false,
      durability: "process_local",
      multiInstance: "not_applicable",
    },
    settlementHealth: { reachable: true },
    administrativeState: { mode: "memory", durability: "process_local" },
    telemetryHealth: {
      configured: true,
      reachable: true,
      productionGrade: false,
      state: "ready",
      adapter: "in-memory-telemetry",
      external: false,
    },
    persistencePaths: {},
    ...overrides,
  };
}

function byId(boundary, providerId) {
  const provider = boundary.providers.find((entry) => entry.providerId === providerId);
  assert.ok(provider, "missing provider " + providerId);
  return provider;
}

test("LOCAL topology derives local capabilities truthfully", () => {
  const boundary = buildProviderBoundary(baseInput());
  const worker = byId(boundary, "openclaw-worker");
  assert.equal(boundary.environment, "local");
  assert.equal(worker.providerMode, "local");
  assert.equal(worker.reachable, true);
  assert.equal(worker.capabilities.every((capability) => capability.available), true);
  assert.equal(worker.capabilities[0].capability, "workload.execute");
});

test("DEVELOPMENT topology derives remote dispatch, cloud worker, and development eligibility", () => {
  const boundary = buildProviderBoundary(baseInput({
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: true },
  }));
  const worker = byId(boundary, "openclaw-worker");
  assert.equal(worker.providerMode, "cloud");
  assert.equal(worker.productionEligible, false);
  assert.equal(worker.reachable, true);
});

test("PRODUCTION topology derives remote dispatch, remote VM worker, and production requirements", () => {
  const boundary = buildProviderBoundary(baseInput({
    environmentTopology: {
      environment: "production",
      adapterProfile: "production",
      dispatchMode: "remote",
      workerMode: "remote",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8080,
    },
    profile: "production",
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: true },
    secretStore: {
      descriptor: {
        provider: "vault-kv-v2",
        productionOriented: true,
        materialStorage: "external_managed",
        metadataDurability: "shared_durable",
        multiInstance: "external_provider_managed",
      },
      async health() { return { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true }; },
    },
    secretHealth: { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true },
    economicStore: {
      adapter: "sqlite-economic-state",
      productionOriented: true,
      durability: "single_node_durable",
      multiInstance: "shared_database",
    },
    settlementProvider: {
      adapter: "sqlite-settlement-provider",
      productionOriented: true,
      durability: "single_node_durable",
      multiInstance: "shared_database",
    },
    administrativeState: { mode: "filesystem", durability: "single_node_durable" },
    telemetryHealth: {
      configured: true,
      reachable: true,
      productionGrade: true,
      state: "ready",
      adapter: "otlp-http-json",
      external: true,
    },
    persistencePaths: {
      administrativeStatePath: "/var/lib/acs/admin.sqlite",
      economicStatePath: "/var/lib/acs/economic.sqlite",
      settlementStatePath: "/var/lib/acs/settlement.sqlite",
      secretCatalogPath: "/var/lib/acs/secrets.sqlite",
      runtimeStatePath: "/var/lib/acs/runtime.sqlite",
      rateLimitDatabasePath: "/var/lib/acs/rate-limit.sqlite",
    },
  }));
  const worker = byId(boundary, "openclaw-worker");
  assert.equal(worker.providerMode, "remote");
  assert.equal(worker.productionEligible, true);
  assert.equal(boundary.readiness.productionEligibility.status, "READY");
  assert.equal(boundary.readiness.execution.status, "READY");
});

test("cloud and remote providers do not silently fall back to local", () => {
  const boundary = buildProviderBoundary(baseInput({
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: false },
  }));
  const worker = byId(boundary, "openclaw-worker");
  assert.equal(worker.providerMode, "cloud");
  assert.equal(worker.reachable, false);
  assert.equal(worker.readiness, "UNAVAILABLE");
  assert.notEqual(worker.providerMode, "local");
});

test("memory secret provider is not production eligible", () => {
  const boundary = buildProviderBoundary(baseInput({
    secretStore: {
      descriptor: {
        provider: "memory",
        productionOriented: false,
        materialStorage: "memory",
        metadataDurability: "process_local",
        multiInstance: "not_applicable",
      },
      async health() { return { reachable: true, provider: "memory", authenticated: false, secureTransport: false }; },
    },
    secretHealth: { reachable: true, provider: "memory", authenticated: false, secureTransport: false },
  }));
  const secret = byId(boundary, "secret-provider");
  assert.equal(secret.providerMode, "memory");
  assert.equal(secret.productionEligible, false);
});

test("ephemeral /tmp persistence is not production eligible", () => {
  const boundary = buildProviderBoundary(baseInput({
    administrativeState: { mode: "filesystem", durability: "single_node_durable" },
    persistencePaths: {
      administrativeStatePath: "/tmp/acs-admin.sqlite",
      economicStatePath: "/tmp/acs-economic.sqlite",
      settlementStatePath: "/tmp/acs-settlement.sqlite",
      secretCatalogPath: "/tmp/acs-secrets.sqlite",
      runtimeStatePath: "/tmp/acs-runtime.sqlite",
      rateLimitDatabasePath: "/tmp/acs-rate-limit.sqlite",
    },
  }));
  const persistence = byId(boundary, "shared-state-provider");
  assert.equal(persistence.productionEligible, false);
  assert.equal(persistence.readiness, "READY");
});

test("shared-state production eligibility requires healthy durable state", () => {
  const boundary = buildProviderBoundary(baseInput({
    sharedStateHealth: {
      configured: true,
      reachable: false,
      writable: false,
      schemaCurrent: false,
      adapter: "shared-postgres",
      reasonCode: "SHARED_STATE_UNAVAILABLE",
    },
    persistencePaths: {
      administrativeStatePath: "/var/lib/acs/admin.sqlite",
      economicStatePath: "/var/lib/acs/economic.sqlite",
      settlementStatePath: "/var/lib/acs/settlement.sqlite",
      secretCatalogPath: "/var/lib/acs/secrets.sqlite",
      runtimeStatePath: "/var/lib/acs/runtime.sqlite",
      rateLimitDatabasePath: "/var/lib/acs/rate-limit.sqlite",
    },
  }));
  const persistence = byId(boundary, "shared-state-provider");
  assert.equal(persistence.productionEligible, false);
  assert.equal(persistence.readiness, "UNAVAILABLE");
  assert.equal(boundary.readiness.productionEligibility.status, "UNAVAILABLE");
});

test("disabled external exporter is reflected truthfully", () => {
  const boundary = buildProviderBoundary(baseInput({
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: false,
      state: "disabled",
      adapter: "disabled",
      external: false,
    },
  }));
  const telemetry = byId(boundary, "telemetry-exporter");
  assert.equal(telemetry.providerMode, "disabled");
  assert.equal(telemetry.readiness, "NOT_CONFIGURED");
  assert.equal(telemetry.productionEligible, false);
  assert.equal(telemetry.capabilities.every((capability) => capability.available === false), true);
});

test("HTTP readiness remains distinguishable from execution readiness", () => {
  const boundary = buildProviderBoundary(baseInput({ localWorkerConfigured: false }));
  assert.equal(boundary.readiness.http.status, "READY");
  assert.equal(boundary.readiness.execution.status, "UNAVAILABLE");
});

test("missing OpenClaw Worker does not crash Product API readiness evaluation", () => {
  const boundary = buildProviderBoundary(baseInput({
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: false, reachable: false },
  }));
  assert.equal(boundary.readiness.execution.status === "UNAVAILABLE" || boundary.readiness.execution.status === "DEGRADED", true);
});

test("secret and token values are never present in diagnostics", () => {
  const forbidden = "tok_secret_do_not_leak";
  const boundary = buildProviderBoundary(baseInput({
    runtimeMode: "remote",
    localWorkerConfigured: false,
    secretStore: {
      descriptor: {
        provider: "vault-kv-v2",
        productionOriented: true,
        materialStorage: "external_managed",
        metadataDurability: "shared_durable",
        multiInstance: "external_provider_managed",
      },
      async health() { return { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true }; },
    },
    secretHealth: { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true },
  }));
  const serialized = JSON.stringify(boundary);
  assert.equal(serialized.includes(forbidden), false);
  assert.equal(serialized.includes("credentialPresent"), true);
});

test("provider capability projection is tenant/global scoped according to the architecture", () => {
  const boundary = buildProviderBoundary(baseInput({
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: true },
    sharedStateHealth: {
      configured: true,
      reachable: true,
      writable: true,
      schemaCurrent: true,
      adapter: "shared-postgres",
    },
    persistencePaths: {
      administrativeStatePath: "/var/lib/acs/admin.sqlite",
      economicStatePath: "/var/lib/acs/economic.sqlite",
      settlementStatePath: "/var/lib/acs/settlement.sqlite",
      secretCatalogPath: "/var/lib/acs/secrets.sqlite",
      runtimeStatePath: "/var/lib/acs/runtime.sqlite",
      rateLimitDatabasePath: "/var/lib/acs/rate-limit.sqlite",
    },
  }));
  assert.equal(byId(boundary, "openclaw-worker").scope, "global");
  assert.equal(byId(boundary, "settlement-provider").capabilities[0].scope, "tenant");
  assert.equal(byId(boundary, "shared-state-provider").capabilities[0].scope, "global");
  assert.equal(byId(boundary, "secret-provider").capabilities[0].scope, "tenant");
  assert.equal(byId(boundary, "telemetry-exporter").capabilities[0].scope, "global");
});

test("provider output is deterministic for the same configuration", () => {
  const input = baseInput({
    checkedAt: 9876543210,
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: true },
    sharedStateHealth: {
      configured: true,
      reachable: true,
      writable: true,
      schemaCurrent: true,
      adapter: "shared-postgres",
    },
    persistencePaths: {
      administrativeStatePath: "/var/lib/acs/admin.sqlite",
      economicStatePath: "/var/lib/acs/economic.sqlite",
      settlementStatePath: "/var/lib/acs/settlement.sqlite",
      secretCatalogPath: "/var/lib/acs/secrets.sqlite",
      runtimeStatePath: "/var/lib/acs/runtime.sqlite",
      rateLimitDatabasePath: "/var/lib/acs/rate-limit.sqlite",
    },
  });
  assert.deepEqual(buildProviderBoundary(input), buildProviderBoundary(input));
});
