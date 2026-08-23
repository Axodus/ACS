import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const { buildProviderBoundary } = await import(
  process.env.ACS_TEST_DIST_URL ? process.env.ACS_TEST_DIST_URL + "/control-plane/provider-boundary.js" : new URL("../dist/control-plane/provider-boundary.js", import.meta.url).href,
);

function createEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] }; },
    async version() { return { identity: this.identity, sourceRevision: "s71", supportedProtocols: ["acs-engine/1"] }; },
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

test("configured and reachable providers report READY with evidence", () => {
  const boundary = buildProviderBoundary(baseInput());
  const worker = byId(boundary, "openclaw-worker");
  const persistence = byId(boundary, "shared-state-provider");

  assert.equal(worker.configured, true);
  assert.equal(worker.reachable, true);
  assert.equal(worker.readiness, "READY");
  assert.equal(worker.capabilities.every((capability) => capability.readiness === "READY"), true);
  assert.equal(worker.scope, "global");
  assert.equal(persistence.scope, "tenant");
  assert.equal(boundary.readiness.http.status, "READY");
  assert.ok(worker.evidence.some((entry) => entry.startsWith("ACS_OPENCLAW_WORKER_MODE=")));
  assert.ok(worker.provenance.configuration.some((entry) => entry === "workerMode=local"));
});

test("configured and unreachable provider becomes UNAVAILABLE without fallback", () => {
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
    localWorkerConfigured: true,
    runtimeCoordinatorHealth: { configured: true, reachable: false },
  }));
  const worker = byId(boundary, "openclaw-worker");

  assert.equal(worker.configured, true);
  assert.equal(worker.reachable, false);
  assert.equal(worker.readiness, "UNAVAILABLE");
  assert.equal(worker.providerMode, "cloud");
  assert.notEqual(worker.providerMode, "local");
  assert.equal(boundary.readiness.execution.status, "UNAVAILABLE");
});

test("missing configuration resolves to NOT_CONFIGURED", () => {
  const boundary = buildProviderBoundary(baseInput({
    environmentTopology: {
      environment: "local",
      adapterProfile: "development",
      dispatchMode: "local",
      workerMode: "disabled",
      workerTransport: "stdio",
      httpHost: "127.0.0.1",
      httpPort: 8788,
    },
    runtimeMode: "local",
    localWorkerConfigured: false,
  }));
  const worker = byId(boundary, "openclaw-worker");

  assert.equal(worker.configured, false);
  assert.equal(worker.readiness, "NOT_CONFIGURED");
});

test("unsupported settlement capability is reported explicitly", () => {
  const boundary = buildProviderBoundary(baseInput());
  const settlement = byId(boundary, "settlement-provider");
  const retry = settlement.capabilities.find((capability) => capability.capability === "settlement.retry");

  assert.ok(retry);
  assert.equal(retry.readiness, "UNSUPPORTED");
  assert.equal(retry.available, false);
  assert.equal(retry.reasonCode, "CAPABILITY_UNSUPPORTED");
});

test("financial readiness changes when settlement fails", () => {
  const boundary = buildProviderBoundary(baseInput({
    settlementHealth: { reachable: false },
  }));
  const settlement = byId(boundary, "settlement-provider");

  assert.equal(settlement.readiness, "UNAVAILABLE");
  assert.equal(boundary.readiness.financialOperation.status, "UNAVAILABLE");
  assert.ok(boundary.readiness.financialOperation.reasonCodes.includes("SETTLEMENT_PROVIDER_UNAVAILABLE"));
});

test("ephemeral persistence and memory secrets are not production eligible", () => {
  const boundary = buildProviderBoundary(baseInput({
    administrativeState: { mode: "filesystem", durability: "single_node_durable" },
    persistencePaths: {
      administrativeStatePath: "/tmp/acs-admin.sqlite",
      economicStatePath: "/tmp/acs-economic.sqlite",
      settlementStatePath: "/tmp/acs-settlement.sqlite",
      secretCatalogPath: "/tmp/acs-secret.sqlite",
      runtimeStatePath: "/tmp/acs-runtime.sqlite",
      rateLimitDatabasePath: "/tmp/acs-rate-limit.sqlite",
    },
  }));
  const persistence = byId(boundary, "shared-state-provider");
  const secret = byId(boundary, "secret-provider");

  assert.equal(persistence.productionEligible, false);
  assert.equal(secret.productionEligible, false);
  assert.equal(secret.providerMode, "memory");
});

test("disabled required telemetry blocks production eligibility", () => {
  const boundary = buildProviderBoundary(baseInput({
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: true,
      state: "disabled",
      adapter: "disabled",
      external: true,
    },
  }));
  const telemetry = byId(boundary, "telemetry-exporter");

  assert.equal(telemetry.readiness, "NOT_CONFIGURED");
  assert.equal(telemetry.productionEligible, false);
  assert.notEqual(boundary.readiness.productionEligibility.status, "READY");
});

test("provider diagnostics do not leak secret values", () => {
  const boundary = buildProviderBoundary(baseInput({
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
  }));
  const json = JSON.stringify(boundary);

  assert.equal(json.includes("Bearer "), false);
  assert.equal(json.includes("password"), false);
  assert.equal(json.includes("secret-value"), false);
  assert.equal(byId(boundary, "secret-provider").credentialPresent, true);
});

test("aggregation is deterministic for the same configuration and evidence", () => {
  const first = buildProviderBoundary(baseInput());
  const second = buildProviderBoundary(baseInput());

  assert.deepEqual(first, second);
  assert.equal(first.updatedAt, second.updatedAt);
});

test("LOCAL, DEVELOPMENT and PRODUCTION remain distinct", () => {
  const local = buildProviderBoundary(baseInput()).providers.find((entry) => entry.providerId === "openclaw-worker");
  const development = buildProviderBoundary(baseInput({
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
  })).providers.find((entry) => entry.providerId === "openclaw-worker");
  const production = buildProviderBoundary(baseInput({
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
      multiInstance: "capable",
    },
    settlementProvider: {
      adapter: "sqlite-settlement-provider",
      productionOriented: true,
      durability: "single_node_durable",
      multiInstance: "capable",
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
  })).providers.find((entry) => entry.providerId === "openclaw-worker");

  assert.equal(local?.providerMode, "local");
  assert.equal(development?.providerMode, "cloud");
  assert.equal(production?.providerMode, "remote");
});

test("defaults cannot override live provider state", () => {
  const boundary = buildProviderBoundary(baseInput({
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: true,
      state: "disabled",
      adapter: "otlp-http-json",
      external: true,
    },
  }));
  const telemetry = byId(boundary, "telemetry-exporter");

  assert.equal(telemetry.readiness, "NOT_CONFIGURED");
  assert.equal(telemetry.productionEligible, false);
  assert.equal(boundary.readiness.productionEligibility.status, "NOT_CONFIGURED");
});

test("OpenClaw Worker outage does not break HTTP readiness", () => {
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

  assert.equal(boundary.readiness.http.status, "READY");
  assert.equal(boundary.readiness.execution.status, "UNAVAILABLE");
});
