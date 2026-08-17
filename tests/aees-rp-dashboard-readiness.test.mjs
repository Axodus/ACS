import assert from "node:assert/strict";
import test from "node:test";
import { ProductApiClient } from "../dist/control-plane/product-api-client.js";

const HISTORICAL_PRODUCTION_ONLY_BLOCKERS = [
  "in-memory or filesystem secret storage",
  "HTTP auth is disabled or mock-only",
  "external exporters as disabled",
  "worker implementation is local-only",
  "current secret store is in-memory",
  "current governance policy only allows sandbox deployments",
];

function productionClient(overrides = {}) {
  const runtimeCoordinator = overrides.runtimeCoordinator ?? {
    descriptor: {
      adapter: "postgres-runtime-state",
      productionOriented: true,
      durability: "single_node_durable",
      multiInstance: "shared_database",
      multiHost: "not_proven",
    },
    listWorkers: () => [{ status: "available", expiresAt: Date.now() + 60_000 }],
    health: () => ({ reachable: true }),
  };
  const recovery = { health: () => ({ healthy: true, lastScanAt: Date.now() }) };
  const engine = { identity: { id: "remote", provider: "http" }, health: async () => ({ status: "ready" }) };
  const targetService = {
    refresh: async () => ({ failures: [] }),
    list: () => [{ status: "ready", stale: false }],
  };
  const secretStore = overrides.secretStore ?? {
    descriptor: { provider: "vault-kv-v2", productionOriented: true },
    health: async () => ({ reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true }),
  };
  const identityValidator = overrides.identityValidator ?? {
    descriptor: { mode: "oidc", provider: "oidc_jwt_jwks", productionOriented: true },
    health: async () => ({ configured: true, reachable: true, detail: "ok" }),
  };
  const edgePolicy = {
    readiness: async () => ({ rateLimiter: { configured: true, reachable: true, productionGrade: true }, cors: { configured: true, explicitProductionAllowlist: true } }),
  };
  const telemetry = overrides.telemetry ?? { descriptor: { adapter: "otlp-http-json", external: true, productionGrade: true } };
  const economicService = { settlementProviderDescriptor: { productionOriented: true } };
  return new ProductApiClient({
    runtimeCoordinator,
    runtimeRecoveryCoordinator: recovery,
    engineService: { listEngines: () => [engine] },
    targetService,
    secretStore,
    identityValidator,
    edgePolicy,
    telemetry,
    economicService,
    readinessSignals: { liveDeploymentEnabled: true, ...overrides.readinessSignals },
  });
}

test("HOTFIX-04 development profile keeps local descriptors truthful without critical production-only blockers", async () => {
  const client = new ProductApiClient({
    readinessSignals: {
      authMode: "development",
      secretBackend: "memory",
      persistenceBackend: "database",
      settlementBackend: "production",
      observabilityExporterEnabled: false,
      remoteWorkerSupported: false,
      liveDeploymentEnabled: false,
      rateLimitEnabled: true,
    },
  });
  const dashboard = await client.getDashboardSummary();
  const blockers = JSON.stringify(dashboard.criticalBlockers);

  assert.equal(dashboard.activeProfile.activeProfile, "development");
  assert.equal(dashboard.activeProfile.expectedReadiness, "development");
  assert.equal(dashboard.readiness.blockerCount, 0);
  assert.equal(dashboard.criticalBlockers.length, 0);
  assert.equal(dashboard.activeComposition.identity, "development");
  assert.equal(dashboard.activeComposition.secrets, "memory");
  assert.equal(dashboard.activeComposition.telemetry, "local/disabled");
  assert.equal(dashboard.activeComposition.workers, "local");
  assert.equal(dashboard.activeComposition.deployment, "sandbox/development");
  assert.ok(dashboard.certifiedCapabilities.some((capability) => capability.id === "managed-secrets" && capability.status === "available"));
  assert.ok(dashboard.globalCaveats.some((finding) => finding.code === "GLOBAL_MULTI_HOST_NOT_CERTIFIED"));
  for (const text of HISTORICAL_PRODUCTION_ONLY_BLOCKERS) {
    assert.equal(blockers.includes(text), false, text);
  }
});

test("HOTFIX-04 production-like profile with unsafe descriptors still emits critical blockers", async () => {
  const client = productionClient({
    identityValidator: { descriptor: { mode: "development" }, health: async () => ({ configured: true, reachable: true, detail: "dev" }) },
    secretStore: { descriptor: { provider: "memory", productionOriented: false }, health: async () => ({ reachable: true, provider: "memory" }) },
    telemetry: { descriptor: { adapter: "console", external: false, productionGrade: false } },
    runtimeCoordinator: {
      descriptor: {
        adapter: "local-process-runtime",
        productionOriented: false,
        durability: "process_local",
        multiInstance: "not_applicable",
        multiHost: "not_applicable",
      },
      listWorkers: () => [],
      health: () => ({ reachable: false }),
    },
    readinessSignals: {
      authMode: "development",
      secretBackend: "memory",
      observabilityExporterEnabled: false,
      remoteWorkerSupported: false,
      liveDeploymentEnabled: false,
      activeProfile: "production_like_single_host",
    },
  });
  const dashboard = await client.getDashboardSummary();
  const blockers = JSON.stringify(dashboard.criticalBlockers);

  assert.equal(dashboard.activeProfile.activeProfile, "production_like_single_host");
  assert.equal(dashboard.activeProfile.expectedReadiness, "production");
  assert.ok(dashboard.criticalBlockers.length >= 5);
  for (const text of HISTORICAL_PRODUCTION_ONLY_BLOCKERS) {
    assert.equal(blockers.includes(text), true, text);
  }
});

test("HOTFIX-04 production-capable profile has no critical historical blockers and keeps global caveat as warning", async () => {
  const client = productionClient();
  const dashboard = await client.getDashboardSummary();
  const serializedBlockers = JSON.stringify(dashboard.criticalBlockers);

  assert.equal(dashboard.activeProfile.expectedReadiness, "production");
  assert.equal(dashboard.readiness.blockerCount, 0);
  assert.equal(dashboard.criticalBlockers.length, 0);
  assert.ok(dashboard.globalCaveats.some((finding) => finding.code === "GLOBAL_MULTI_HOST_NOT_CERTIFIED" && finding.severity === "warning"));
  for (const text of HISTORICAL_PRODUCTION_ONLY_BLOCKERS) {
    assert.equal(serializedBlockers.includes(text), false, text);
  }
});
